import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { ragService } from '@/lib/rag-service'

export interface IndexedDocument {
  id: string
  name: string
  size: number
  indexedDate: Date
  status: 'indexed' | 'indexing' | 'failed' | 'queued'
  chunks: number
  vectorsCount: number
  lastAccessed?: Date
  queryCount: number
}

export interface KnowledgeBaseStats {
  totalDocuments: number
  indexedDocuments: number
  totalChunks: number
  totalVectors: number
  indexSize: string
  lastUpdate: Date | null
  totalQueries: number
  avgLatencyMs: number
  avgTotalTokens: number
  avgPromptTokens: number
  avgResponseTokens: number
  totalTokens: number
}

interface KnowledgeBaseContextValue {
  documents: IndexedDocument[]
  stats: KnowledgeBaseStats
  isLoading: boolean
  isRefreshing: boolean
  hasLoaded: boolean
  error: Error | null
  refresh: () => Promise<void>
  load: () => Promise<void>
  updateDocument: (docId: string, updater: (doc: IndexedDocument) => IndexedDocument) => void
  formatFileSize: (bytes: number) => string
}

const KnowledgeBaseContext = createContext<KnowledgeBaseContextValue | undefined>(undefined)

const initialStats: KnowledgeBaseStats = {
  totalDocuments: 0,
  indexedDocuments: 0,
  totalChunks: 0,
  totalVectors: 0,
  indexSize: '0 MB',
  lastUpdate: null,
  totalQueries: 0,
  avgLatencyMs: 0,
  avgTotalTokens: 0,
  avgPromptTokens: 0,
  avgResponseTokens: 0,
  totalTokens: 0
}

export function KnowledgeBaseProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<IndexedDocument[]>([])
  const [stats, setStats] = useState<KnowledgeBaseStats>(initialStats)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Use refs to avoid stale closures
  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }, [])

  const updateDocument = useCallback((docId: string, updater: (doc: IndexedDocument) => IndexedDocument) => {
    setDocuments(prev => {
      const updatedDocs = prev.map(doc => (doc.id === docId ? updater(doc) : doc))

      setStats(prevStats => {
        const totalDocs = updatedDocs.length
        const indexedCount = updatedDocs.filter(d => d.status === 'indexed').length
        const totalChunks = updatedDocs.reduce((sum, doc) => sum + doc.chunks, 0)
        const totalVectors = updatedDocs.reduce((sum, doc) => sum + doc.vectorsCount, 0)
        const totalSize = updatedDocs.reduce((sum, doc) => sum + doc.size, 0)

        return {
          ...prevStats,
          totalDocuments: totalDocs,
          indexedDocuments: indexedCount,
          totalChunks,
          totalVectors,
          indexSize: formatFileSize(totalSize),
          lastUpdate: new Date()
        }
      })

      return updatedDocs
    })
  }, [formatFileSize])

  const loadKnowledgeBase = useCallback(async ({ force = false } = {}) => {
    // Use refs to check current state without causing re-renders
    if (isLoadingRef.current || (hasLoadedRef.current && !force)) {
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const [docs, analytics] = await Promise.all([
        ragService.fetchDocuments(),
        ragService.getKnowledgeBaseAnalytics({ documentLimit: 500 })
      ])

      const documentUsage = new Map<string, number>()
      analytics.documents.forEach(item => {
        documentUsage.set(item.documentId, item.queryCount)
      })

      const indexed: IndexedDocument[] = docs.map(doc => ({
        id: doc.id,
        name: doc.name,
        size: doc.size || 0,
        indexedDate: doc.uploadedAt || new Date(),
        status: doc.status === 'ready'
          ? 'indexed'
          : doc.status === 'processing'
            ? 'indexing'
            : doc.status === 'uploading'
              ? 'queued'
              : 'failed',
        chunks: doc.totalChunks || 0,
        vectorsCount: doc.totalChunks || 0,
        lastAccessed: undefined,
        queryCount: documentUsage.get(doc.id) || 0
      }))

      setDocuments(indexed)

      const totalDocs = indexed.length
      const indexedCount = indexed.filter(d => d.status === 'indexed').length
      const totalChunks = indexed.reduce((sum, doc) => sum + doc.chunks, 0)
      const totalVectors = indexed.reduce((sum, doc) => sum + doc.vectorsCount, 0)
      const totalSize = indexed.reduce((sum, doc) => sum + doc.size, 0)
      const totalQueries = analytics.summary.totalQueries || 0
      const now = new Date()

      setStats({
        totalDocuments: totalDocs,
        indexedDocuments: indexedCount,
        totalChunks,
        totalVectors,
        indexSize: formatFileSize(totalSize),
        lastUpdate: now,
        totalQueries,
        avgLatencyMs: analytics.summary.avgLatencyMs || 0,
        avgTotalTokens: analytics.summary.avgTotalTokens || 0,
        avgPromptTokens: analytics.summary.avgPromptTokens || 0,
        avgResponseTokens: analytics.summary.avgResponseTokens || 0,
        totalTokens: analytics.summary.totalTokens || 0
      })

      hasLoadedRef.current = true
      setHasLoaded(true)
    } catch (err) {
      const message = err instanceof Error ? err : new Error('Error loading knowledge base')
      console.error('Error loading knowledge base:', message)
      setError(message)
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [formatFileSize])

  // REMOVED: Auto-load on mount for performance optimization
  // Knowledge base now loads lazily when documents section is accessed

  const load = useCallback(async () => {
    await loadKnowledgeBase({ force: false })
  }, [loadKnowledgeBase])

  const refresh = useCallback(async () => {
    await loadKnowledgeBase({ force: true })
  }, [loadKnowledgeBase])

  const value = useMemo<KnowledgeBaseContextValue>(() => ({
    documents,
    stats,
    isLoading,
    isRefreshing: hasLoaded && isLoading,
    hasLoaded,
    error,
    refresh,
    load,
    updateDocument,
    formatFileSize
  }), [documents, stats, isLoading, hasLoaded, error, refresh, load, updateDocument, formatFileSize])

  return (
    <KnowledgeBaseContext.Provider value={value}>
      {children}
    </KnowledgeBaseContext.Provider>
  )
}

export function useKnowledgeBase() {
  const context = useContext(KnowledgeBaseContext)
  if (context === undefined) {
    throw new Error('useKnowledgeBase must be used within a KnowledgeBaseProvider')
  }
  return context
}
