// Mock RAG service to simulate backend interactions
// In production, this would connect to your GCP backend

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
}

export interface RAGResponse {
  answer: string
  sources: string[]
  confidence: number
}

class RAGService {
  private documents: Document[] = []
  private chatHistory: ChatMessage[] = []

  // Mock document upload
  async uploadDocument(file: File): Promise<Document> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const document: Document = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          uploadedAt: new Date(),
          status: 'processing',
          type: file.type
        }

        this.documents.push(document)

        // Simulate processing completion
        setTimeout(() => {
          document.status = 'ready'
        }, 3000)

        resolve(document)
      }, 1000)
    })
  }

  // Mock document deletion
  async deleteDocument(documentId: string): Promise<void> {
    this.documents = this.documents.filter(doc => doc.id !== documentId)
  }

  // Get all documents
  getDocuments(): Document[] {
    return this.documents
  }

  // Mock RAG query
  async queryDocuments(question: string): Promise<RAGResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResponses = [
          {
            answer: `Basado en el análisis de tus documentos subidos, encontré información relevante sobre "${question}". Los documentos contienen información detallada que aborda directamente tu consulta. Aquí están los puntos clave que extraje de las fuentes disponibles.`,
            sources: this.documents.filter(doc => doc.status === 'ready').map(doc => doc.name).slice(0, 2),
            confidence: 0.85
          },
          {
            answer: `He buscado en tu colección de documentos información relacionada con "${question}". El análisis muestra varias secciones relevantes en múltiples documentos. Permites que te proporcione un resumen completo basado en el contenido disponible.`,
            sources: this.documents.filter(doc => doc.status === 'ready').map(doc => doc.name),
            confidence: 0.92
          }
        ]

        const response = mockResponses[Math.floor(Math.random() * mockResponses.length)]
        resolve(response)
      }, 2000 + Math.random() * 2000) // 2-4 second delay
    })
  }

  // Add message to chat history
  addMessage(message: ChatMessage): void {
    this.chatHistory.push(message)
  }

  // Get chat history
  getChatHistory(): ChatMessage[] {
    return this.chatHistory
  }

  // Clear chat history
  clearChatHistory(): void {
    this.chatHistory = []
  }

  // Mock health check for backend connection
  async healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(Math.random() > 0.1) // 90% success rate
      }, 1000)
    })
  }

  // Mock function to simulate GCP backend initialization
  async initializeBackend(): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: "Backend simulado inicializado. En producción, esto se conectaría a tu pipeline RAG de GCP."
        })
      }, 2000)
    })
  }
}

export const ragService = new RAGService()

// Export types for use in components
export type { Document as RAGDocument, ChatMessage as RAGChatMessage, RAGResponse }