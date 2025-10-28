import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { ragService, type RAGResponse, type TokenUsage } from '@/lib/rag-service'

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: string[]
  sessionId?: string
  tokenUsage?: TokenUsage
  estimatedCost?: number
}

export interface ChatSession {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  messageCount: number
  isTemporary?: boolean
}

interface ChatContextValue {
  sessions: ChatSession[]
  activeSessionId: string | null
  messages: ChatMessage[]
  isLoadingSessions: boolean
  isLoadingActiveSession: boolean
  isSending: boolean
  createNewSession: () => string
  selectSession: (sessionId: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  clearActiveSession: () => void
  refreshSessions: () => Promise<void>
  deleteSession: (sessionId: string) => Promise<boolean>
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)

// Gemini 1.5 Flash pricing (per 1M tokens)
// Input: $0.075 per 1M tokens (up to 128K context)
// Output: $0.30 per 1M tokens
const GEMINI_FLASH_INPUT_COST_PER_1M = 0.075
const GEMINI_FLASH_OUTPUT_COST_PER_1M = 0.30

const calculateTokenCost = (tokenUsage?: TokenUsage): number => {
  if (!tokenUsage) return 0

  const inputCost = (tokenUsage.prompt_tokens || 0) * (GEMINI_FLASH_INPUT_COST_PER_1M / 1_000_000)
  const outputCost = (tokenUsage.response_tokens || 0) * (GEMINI_FLASH_OUTPUT_COST_PER_1M / 1_000_000)

  return inputCost + outputCost
}

const buildSessionTitle = (prefixTime?: Date) => {
  const date = prefixTime ?? new Date()
  return `Conversación ${date.toLocaleDateString()}`
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [messagesBySession, setMessagesBySession] = useState<Record<string, ChatMessage[]>>({})
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState<Set<string>>(new Set())
  const [isSending, setIsSending] = useState(false)
  const initializedRef = useRef(false)
  const sessionsRef = useRef<ChatSession[]>([])
  const messagesRef = useRef<Record<string, ChatMessage[]>>({})

  useEffect(() => {
    sessionsRef.current = sessions
  }, [sessions])

  useEffect(() => {
    messagesRef.current = messagesBySession
  }, [messagesBySession])

  const setSessionLoading = useCallback((sessionId: string, state: boolean) => {
    setLoadingSessions(prev => {
      const next = new Set(prev)
      if (state) {
        next.add(sessionId)
      } else {
        next.delete(sessionId)
      }
      return next
    })
  }, [])

  const createNewSession = useCallback(() => {
    const tempId = `temp_${Date.now()}`
    const now = new Date()
    const newSession: ChatSession = {
      id: tempId,
      title: buildSessionTitle(now),
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      isTemporary: true
    }

    setSessions(prev => {
      const filtered = prev.filter(session => session.id !== newSession.id)
      return [newSession, ...filtered].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    })
    setMessagesBySession(prev => ({ ...prev, [tempId]: [] }))
    setActiveSessionId(tempId)
    ragService.startNewConversation()
    return tempId
  }, [])

  const ensureSessionMessages = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      return []
    }

    if (messagesRef.current[sessionId]?.length) {
      return messagesRef.current[sessionId]
    }

    setSessionLoading(sessionId, true)
    try {
      const history = await ragService.getConversationHistory(sessionId)
      const sorted = history
        .map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      setMessagesBySession(prev => ({ ...prev, [sessionId]: sorted }))

      if (sorted.length > 0) {
        const first = sorted[0].timestamp
        const last = sorted[sorted.length - 1].timestamp
        setSessions(prev => prev.map(session => (
          session.id === sessionId
            ? {
                ...session,
                createdAt: session.createdAt || first,
                updatedAt: last,
                messageCount: sorted.length,
                isTemporary: false
              }
            : session
        )))
      }

      return sorted
    } catch (error) {
      console.error('Error loading conversation history:', error)
      return []
    } finally {
      setSessionLoading(sessionId, false)
    }
  }, [setSessionLoading])

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true)
    try {
      const result = await ragService.listConversations(25)
      const normalized: ChatSession[] = result.map((conv: any) => {
        const updatedAt = conv.last_message_time ? new Date(conv.last_message_time) : new Date()
        const title = conv.title || buildSessionTitle(updatedAt)
        return {
          id: conv.conversation_id,
          title,
          createdAt: updatedAt,
          updatedAt,
          messageCount: Number(conv.message_count ?? 0),
          isTemporary: false
        }
      }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

      setSessions(normalized)

      if (normalized.length > 0) {
        setActiveSessionId(prev => {
          if (prev && normalized.some(session => session.id === prev)) {
            return prev
          }
          return normalized[0].id
        })
      } else if (!initializedRef.current) {
        const tempId = createNewSession()
        setActiveSessionId(tempId)
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error)
    } finally {
      setIsLoadingSessions(false)
      initializedRef.current = true
    }
  }, [createNewSession])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    if (activeSessionId) {
      ensureSessionMessages(activeSessionId)
    }
  }, [activeSessionId, ensureSessionMessages])

  const selectSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId)
    await ensureSessionMessages(sessionId)
  }, [ensureSessionMessages])

  const renameSession = useCallback((oldId: string, newId: string) => {
    if (oldId === newId) {
      return
    }

    setMessagesBySession(prev => {
      const currentMessages = prev[oldId] || []
      const updatedMessages = currentMessages.map(message => ({
        ...message,
        sessionId: newId
      }))

      const { [oldId]: _, ...rest } = prev
      return {
        ...rest,
        [newId]: updatedMessages
      }
    })

    setSessions(prev => {
      const existing = prev.find(session => session.id === oldId)

      if (!existing) {
        return prev
      }

      const replacement: ChatSession = {
        ...existing,
        id: newId,
        isTemporary: false
      }

      const others = prev.filter(session => session.id !== oldId && session.id !== newId)

      return [replacement, ...others].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    })
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || isSending) {
      return
    }

    let sessionId = activeSessionId
    const sessionsSnapshot = sessionsRef.current

    if (!sessionId || !sessionsSnapshot.some(session => session.id === sessionId)) {
      sessionId = createNewSession()
    }

    const now = new Date()
    const userMessage: ChatMessage = {
      id: `${now.getTime()}-user`,
      type: 'user',
      content: trimmed,
      timestamp: now,
      sessionId
    }

    setMessagesBySession(prev => {
      const currentMessages = prev[sessionId!] || []
      return {
        ...prev,
        [sessionId!]: [...currentMessages, userMessage]
      }
    })

    setSessions(prev => prev.map(session =>
      session.id === sessionId
        ? { ...session, messageCount: session.messageCount + 1, updatedAt: now }
        : session
    ))

    setIsSending(true)

    const currentSession = sessionsSnapshot.find(session => session.id === sessionId)
    const conversationId = currentSession && !currentSession.isTemporary ? sessionId : undefined

    try {
      const response: RAGResponse = await ragService.queryDocuments(trimmed, conversationId)

      const assistantTimestamp = new Date()
      const backendSessionId = response.conversation_id || sessionId!

      // Extract token usage from response metadata
      const tokenUsage = response.metadata?.token_usage
      const estimatedCost = calculateTokenCost(tokenUsage)

      const assistantMessage: ChatMessage = {
        id: `${assistantTimestamp.getTime()}-assistant`,
        type: 'assistant',
        content: response.answer,
        timestamp: assistantTimestamp,
        sources: response.sources,
        sessionId: backendSessionId,
        tokenUsage,
        estimatedCost
      }

      setMessagesBySession(prev => {
        const currentMessages = prev[sessionId!] || []
        const updatedMessages = [...currentMessages, assistantMessage]

        if (backendSessionId !== sessionId) {
          const { [sessionId!]: _, ...rest } = prev
          return {
            ...rest,
            [backendSessionId]: updatedMessages.map(message => ({
              ...message,
              sessionId: backendSessionId
            }))
          }
        }

        return {
          ...prev,
          [sessionId!]: updatedMessages
        }
      })

      setSessions(prev => {
        let resolvedSessions = prev.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              id: backendSessionId,
              isTemporary: false,
              messageCount: session.messageCount + 1,
              updatedAt: assistantTimestamp
            }
          }
          return session
        })

        if (!resolvedSessions.some(session => session.id === backendSessionId)) {
          const newSession: ChatSession = {
            id: backendSessionId,
            title: buildSessionTitle(assistantTimestamp),
            createdAt: now,
            updatedAt: assistantTimestamp,
            messageCount: 2,
            isTemporary: false
          }
          resolvedSessions = [newSession, ...resolvedSessions]
        }

        return [...resolvedSessions].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      })

      if (backendSessionId !== sessionId) {
        renameSession(sessionId!, backendSessionId)
        setActiveSessionId(backendSessionId)
      }

    } catch (error) {
      console.error('Error sending chat message:', error)
      const errorMessage: ChatMessage = {
        id: `${Date.now()}-error`,
        type: 'assistant',
        content: "Lo siento, encontré un error al procesar tu pregunta. Por favor, inténtalo de nuevo.",
        timestamp: new Date(),
        sessionId
      }

      setMessagesBySession(prev => ({
        ...prev,
        [sessionId!]: [...(prev[sessionId!] || []), errorMessage]
      }))
    } finally {
      setIsSending(false)
    }
  }, [activeSessionId, createNewSession, isSending, renameSession])

  const clearActiveSession = useCallback(() => {
    if (!activeSessionId) {
      return
    }

    setMessagesBySession(prev => ({
      ...prev,
      [activeSessionId]: []
    }))

    setSessions(prev => prev.map(session =>
      session.id === activeSessionId
        ? { ...session, messageCount: 0 }
        : session
    ))
  }, [activeSessionId])

  const refreshSessions = useCallback(async () => {
    await loadSessions()
  }, [loadSessions])

  const deleteSession = useCallback(async (sessionId: string) => {
    const success = await ragService.deleteConversation(sessionId)
    if (!success) {
      return false
    }

    setSessions(prev => prev.filter(session => session.id !== sessionId))
    setMessagesBySession(prev => {
      const { [sessionId]: _, ...rest } = prev
      return rest
    })

    if (activeSessionId === sessionId) {
      const remaining = sessionsRef.current.filter(session => session.id !== sessionId)
      setActiveSessionId(remaining[0]?.id ?? null)
    }

    return true
  }, [activeSessionId])

  const messages = useMemo(() => (
    activeSessionId ? (messagesBySession[activeSessionId] || []) : []
  ), [messagesBySession, activeSessionId])

  const isLoadingActiveSession = useMemo(() => (
    activeSessionId ? loadingSessions.has(activeSessionId) : false
  ), [activeSessionId, loadingSessions])

  const value: ChatContextValue = {
    sessions,
    activeSessionId,
    messages,
    isLoadingSessions,
    isLoadingActiveSession,
    isSending,
    createNewSession,
    selectSession,
    sendMessage,
    clearActiveSession,
    refreshSessions,
    deleteSession
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
