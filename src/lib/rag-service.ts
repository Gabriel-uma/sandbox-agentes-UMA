// RAG Service - Cliente real para servicios backend en GCP
// Conecta con Document Processor y RAG Backend en Cloud Run

export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'error'

export interface Document {
  id: string
  name: string
  size: number
  uploadedAt: Date
  status: DocumentStatus
  type: string
  mimeType?: string
  totalChunks?: number
  totalCharacters?: number
  uris?: {
    document?: string
    chunks?: string
    embeddings?: string
    metadata?: string
  }
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
  private normalizeDocument(data: any): Document {
    const uploadedAt = data.uploaded_at ?? data.uploadedAt ?? new Date().toISOString()
    const status = (data.status ?? 'ready') as DocumentStatus

    const generatedId = (globalThis.crypto?.randomUUID?.() as string | undefined) ?? `temp_${Math.random().toString(36).slice(2)}`

    return {
      id: data.document_id ?? data.id ?? generatedId,
      name: data.filename ?? data.name ?? 'Documento',
      size: Number(data.size ?? 0),
      uploadedAt: new Date(uploadedAt),
      status,
      type: data.document_type ?? data.type ?? 'application/octet-stream',
      mimeType: data.mime_type ?? data.mimeType,
      totalChunks: data.total_chunks ?? data.totalChunks,
      totalCharacters: data.total_characters ?? data.totalCharacters,
      uris: data.uris ?? {},
    }
  }

  private upsertDocument(document: Document): Document {
    const index = this.documents.findIndex((doc) => doc.id === document.id)

    if (index >= 0) {
      this.documents.splice(index, 1, document)
    } else {
      this.documents = [document, ...this.documents]
    }

    return document
  }

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
        const contentType = response.headers.get('content-type')

        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.error || `Error ${response.status}: ${response.statusText}`)
        }

        const htmlError = await response.text()
        console.error('HTML Error Response:', htmlError)
        throw new Error(`Error ${response.status}: El servidor backend no está disponible o no tiene permisos configurados correctamente`)
      }

      const result = await response.json()
      const document = this.normalizeDocument({
        ...result,
        size: result.size ?? file.size,
        filename: result.filename ?? file.name,
        document_type: result.document_type ?? file.type,
      })

      this.upsertDocument(document)
      return document
    } catch (error) {
      console.error('Error uploading document:', error)
      const message = error instanceof Error ? error : new Error('Error uploading document')
      throw message
    }
  }

  async fetchDocuments(): Promise<Document[]> {
    try {
      const response = await fetch(`${DOCUMENT_PROCESSOR_URL}/documents`, {
        method: 'GET',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || `Error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      const documentsArray = Array.isArray(result.documents) ? result.documents : []
      this.documents = documentsArray
        .map((item: any) => this.normalizeDocument(item))
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      return this.documents
    } catch (error) {
      console.error('Error fetching documents:', error)
      const message = error instanceof Error ? error : new Error('Error fetching documents')
      throw message
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      const response = await fetch(`${DOCUMENT_PROCESSOR_URL}/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || `Error ${response.status}: ${response.statusText}`)
      }

      this.documents = this.documents.filter((doc) => doc.id !== documentId)
    } catch (error) {
      console.error('Error deleting document:', error)
      const message = error instanceof Error ? error : new Error('Error deleting document')
      throw message
    }
  }

  async downloadDocument(documentId: string): Promise<{ blob: Blob; filename: string }> {
    try {
      const response = await fetch(`${DOCUMENT_PROCESSOR_URL}/documents/${documentId}/download`, {
        method: 'GET',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || `Error ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition') || ''
      let filename = `document-${documentId}`
      const match = disposition.match(/filename="?([^";]+)"?/i)
      if (match && match[1]) {
        try {
          filename = decodeURIComponent(match[1])
        } catch {
          filename = match[1]
        }
      }

      return { blob, filename }
    } catch (error) {
      console.error('Error downloading document:', error)
      const message = error instanceof Error ? error : new Error('Error downloading document')
      throw message
    }
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
        const contentType = response.headers.get('content-type')

        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.error || `Error ${response.status}: ${response.statusText}`)
        }

        const textError = await response.text()
        throw new Error(`Error ${response.status}: ${textError || response.statusText}`)
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
        const contentType = response.headers.get('content-type')

        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.error || 'Error fetching conversation history')
        }

        throw new Error(`Error ${response.status}: ${response.statusText}`)
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
        const contentType = response.headers.get('content-type')

        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.error || 'Error listing conversations')
        }

        throw new Error(`Error ${response.status}: ${response.statusText}`)
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
        const contentType = response.headers.get('content-type')

        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          throw new Error(error.error || 'Error deleting conversation')
        }

        throw new Error(`Error ${response.status}: ${response.statusText}`)
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
