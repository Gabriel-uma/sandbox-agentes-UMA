// RAG Service - Cliente real para servicios backend en GCP
// Conecta con Document Processor y RAG Backend en Cloud Run

export interface Document {
  id: string
  name: string
  size: number
  uploadedAt: Date
  status: 'processing' | 'ready' | 'error'
  type: string
}

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: string[]
  confidence?: number
}

export interface RAGResponse {
  answer: string
  sources: string[]
  confidence: number
  conversation_id?: string
}

// Configuración de URLs desde variables de entorno
const DOCUMENT_PROCESSOR_URL = import.meta.env.VITE_DOCUMENT_PROCESSOR_URL || ''
const RAG_BACKEND_URL = import.meta.env.VITE_RAG_BACKEND_URL || ''

class RAGService {
  private documents: Document[] = []
  private currentConversationId: string | null = null

  /**
   * Sube un documento al Document Processor
   */
  async uploadDocument(file: File): Promise<Document> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${DOCUMENT_PROCESSOR_URL}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error uploading document')
      }

      const result = await response.json()

      // Crear documento en formato local
      const document: Document = {
        id: result.document_id,
        name: result.filename || file.name,
        size: file.size,
        uploadedAt: new Date(),
        status: 'ready',
        type: result.document_type || file.type
      }

      this.documents.push(document)
      return document

    } catch (error) {
      console.error('Error uploading document:', error)
      throw error
    }
  }

  /**
   * Elimina un documento (nota: requeriría endpoint de eliminación en el backend)
   */
  async deleteDocument(documentId: string): Promise<void> {
    this.documents = this.documents.filter(doc => doc.id !== documentId)
    // TODO: Implementar endpoint DELETE en el backend si es necesario
  }

  /**
   * Obtiene la lista de documentos locales
   */
  getDocuments(): Document[] {
    return this.documents
  }

  /**
   * Realiza una consulta al RAG Backend
   */
  async queryDocuments(
    question: string,
    conversationId?: string
  ): Promise<RAGResponse> {
    try {
      const response = await fetch(`${RAG_BACKEND_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          conversation_id: conversationId || this.currentConversationId,
          top_k: 5,
          include_history: true
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error querying RAG')
      }

      const result = await response.json()

      // Guardar conversation_id para futuras queries
      if (result.conversation_id) {
        this.currentConversationId = result.conversation_id
      }

      return {
        answer: result.answer,
        sources: result.sources || [],
        confidence: result.confidence || 0.5,
        conversation_id: result.conversation_id
      }

    } catch (error) {
      console.error('Error querying documents:', error)
      throw error
    }
  }

  /**
   * Obtiene el historial de una conversación
   */
  async getConversationHistory(conversationId?: string): Promise<ChatMessage[]> {
    try {
      const convId = conversationId || this.currentConversationId

      if (!convId) {
        return []
      }

      const response = await fetch(`${RAG_BACKEND_URL}/conversations/${convId}`, {
        method: 'GET',
      })

      if (!response.ok) {
        if (response.status === 404) {
          return []
        }
        const error = await response.json()
        throw new Error(error.error || 'Error fetching conversation history')
      }

      const result = await response.json()

      // Convertir al formato local
      return result.messages.map((msg: any, index: number) => ({
        id: `${msg.type}-${index}`,
        type: msg.type,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        sources: msg.sources,
        confidence: msg.confidence
      }))

    } catch (error) {
      console.error('Error fetching conversation history:', error)
      return []
    }
  }

  /**
   * Lista todas las conversaciones recientes
   */
  async listConversations(limit: number = 10): Promise<any[]> {
    try {
      const response = await fetch(`${RAG_BACKEND_URL}/conversations?limit=${limit}`, {
        method: 'GET',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error listing conversations')
      }

      const result = await response.json()
      return result.conversations || []

    } catch (error) {
      console.error('Error listing conversations:', error)
      return []
    }
  }

  /**
   * Elimina una conversación
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${RAG_BACKEND_URL}/conversations/${conversationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error deleting conversation')
      }

      // Si es la conversación actual, resetearla
      if (this.currentConversationId === conversationId) {
        this.currentConversationId = null
      }

      return true

    } catch (error) {
      console.error('Error deleting conversation:', error)
      return false
    }
  }

  /**
   * Inicia una nueva conversación
   */
  startNewConversation(): void {
    this.currentConversationId = null
  }

  /**
   * Obtiene el ID de la conversación actual
   */
  getCurrentConversationId(): string | null {
    return this.currentConversationId
  }

  /**
   * Health check de los servicios backend
   */
  async healthCheck(): Promise<{
    documentProcessor: boolean
    ragBackend: boolean
  }> {
    const results = {
      documentProcessor: false,
      ragBackend: false
    }

    try {
      const docProcessorResponse = await fetch(`${DOCUMENT_PROCESSOR_URL}/health`, {
        method: 'GET',
      })
      results.documentProcessor = docProcessorResponse.ok

      const ragBackendResponse = await fetch(`${RAG_BACKEND_URL}/health`, {
        method: 'GET',
      })
      results.ragBackend = ragBackendResponse.ok

    } catch (error) {
      console.error('Error checking health:', error)
    }

    return results
  }

  /**
   * Verifica la configuración del servicio
   */
  checkConfiguration(): {
    configured: boolean
    documentProcessorUrl: string
    ragBackendUrl: string
  } {
    return {
      configured: !!(DOCUMENT_PROCESSOR_URL && RAG_BACKEND_URL),
      documentProcessorUrl: DOCUMENT_PROCESSOR_URL,
      ragBackendUrl: RAG_BACKEND_URL
    }
  }

  // Métodos de compatibilidad con la interfaz anterior
  addMessage(message: ChatMessage): void {
    // No-op: Los mensajes ahora se guardan automáticamente en BigQuery
    console.log('Message will be saved in BigQuery automatically')
  }

  getChatHistory(): ChatMessage[] {
    // Retornar array vacío, usar getConversationHistory() en su lugar
    console.warn('Use getConversationHistory() instead')
    return []
  }

  clearChatHistory(): void {
    this.startNewConversation()
  }

  async initializeBackend(): Promise<{ success: boolean; message: string }> {
    const health = await this.healthCheck()
    const config = this.checkConfiguration()

    if (!config.configured) {
      return {
        success: false,
        message: 'Backend no configurado. Verifica las variables de entorno VITE_DOCUMENT_PROCESSOR_URL y VITE_RAG_BACKEND_URL'
      }
    }

    if (!health.documentProcessor || !health.ragBackend) {
      return {
        success: false,
        message: `Servicios no disponibles. Document Processor: ${health.documentProcessor ? 'OK' : 'Error'}, RAG Backend: ${health.ragBackend ? 'OK' : 'Error'}`
      }
    }

    return {
      success: true,
      message: 'Backend RAG conectado exitosamente a GCP Cloud Run'
    }
  }
}

export const ragService = new RAGService()

// Export types for use in components
export type { Document as RAGDocument, ChatMessage as RAGChatMessage }
