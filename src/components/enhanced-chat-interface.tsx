import { useState, useRef, useEffect } from "react"
import { ragService, type RAGResponse } from "@/lib/rag-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Send, Bot, User, FileText, Loader2, MessageSquare, Trash2, Download } from "lucide-react"

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: string[]
  sessionId?: string
}

interface ChatSession {
  id: string
  name: string
  timestamp: Date
  messageCount: number
}

const sampleQuestions = [
  "¿Qué información está disponible en los documentos subidos?",
  "Resume los temas principales cubiertos",
  "Encuentra detalles específicos sobre...",
  "Compara información entre documentos"
]

export function EnhancedChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string>("")
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [sessionMessages, setSessionMessages] = useState<Record<string, Message[]>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Create new session on component mount
    createNewSession()
    loadSessions()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const createNewSession = () => {
    const sessionId = `session_${Date.now()}`

    // Save current session messages before switching
    if (currentSessionId && messages.length > 0) {
      setSessionMessages(prev => ({
        ...prev,
        [currentSessionId]: messages
      }))
    }

    setCurrentSessionId(sessionId)
    setMessages([])

    const newSession: ChatSession = {
      id: sessionId,
      name: `Conversación ${new Date().toLocaleDateString()}`,
      timestamp: new Date(),
      messageCount: 0
    }

    setSessions(prev => [newSession, ...prev])
  }

  const loadSession = (sessionId: string) => {
    // Save current session messages before switching
    if (currentSessionId && messages.length > 0) {
      setSessionMessages(prev => ({
        ...prev,
        [currentSessionId]: messages
      }))
    }

    // Load the selected session messages
    const savedMessages = sessionMessages[sessionId] || []
    setMessages(savedMessages)
    setCurrentSessionId(sessionId)
  }

  const loadSessions = () => {
    // Mock sessions - in production, load from backend
    const mockSessions: ChatSession[] = [
      {
        id: "session_1",
        name: "Consulta sobre centros de salud",
        timestamp: new Date(Date.now() - 86400000),
        messageCount: 8
      },
      {
        id: "session_2",
        name: "Análisis de documentos médicos",
        timestamp: new Date(Date.now() - 172800000),
        messageCount: 12
      }
    ]
    setSessions(prev => [...mockSessions, ...prev])
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      sessionId: currentSessionId
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // Update session message count
    setSessions(prev => prev.map(session =>
      session.id === currentSessionId
        ? { ...session, messageCount: session.messageCount + 1 }
        : session
    ))

    try {
      const response: RAGResponse = await ragService.queryDocuments(inputValue)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources,
        sessionId: currentSessionId
      }

      setMessages(prev => [...prev, assistantMessage])
      ragService.addMessage(assistantMessage)

      // Update session message count again
      setSessions(prev => prev.map(session =>
        session.id === currentSessionId
          ? { ...session, messageCount: session.messageCount + 1 }
          : session
      ))

    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Lo siento, encontré un error al procesar tu pregunta. Por favor, inténtalo de nuevo.",
        timestamp: new Date(),
        sessionId: currentSessionId
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSampleQuestion = (question: string) => {
    setInputValue(question)
  }

  const clearCurrentSession = () => {
    setMessages([])
    setSessionMessages(prev => ({
      ...prev,
      [currentSessionId]: []
    }))
    setSessions(prev => prev.map(session =>
      session.id === currentSessionId
        ? { ...session, messageCount: 0 }
        : session
    ))
  }

  const exportChat = () => {
    const chatData = {
      sessionId: currentSessionId,
      timestamp: new Date().toISOString(),
      messages: messages
    }

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-${currentSessionId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Chat RAG</h2>
              <p className="text-sm text-muted-foreground">
                Conversación actual • {messages.length} mensajes
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportChat} disabled={messages.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline" size="sm" onClick={clearCurrentSession} disabled={messages.length === 0}>
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar
              </Button>
              <Button variant="default" size="sm" onClick={createNewSession}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Nueva Conversación
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="text-center mb-8">
                <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  ¡Comienza una nueva conversación!
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Haz preguntas sobre tus documentos. Analizaré el contenido y proporcionaré respuestas con citas de fuentes.
                </p>
              </div>

              {/* Sample Questions */}
              <div className="w-full max-w-2xl">
                <p className="text-sm font-medium text-foreground mb-3">Prueba preguntando:</p>
                <div className="grid grid-cols-1 gap-2">
                  {sampleQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start text-left h-auto p-3"
                      onClick={() => handleSampleQuestion(question)}
                    >
                      <span className="text-sm">{question}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'assistant' && (
                    <Avatar className="w-8 h-8 bg-primary">
                      <AvatarFallback>
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <Card className={`max-w-[80%] ${message.type === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
                    <CardContent className="p-4">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                      {message.sources && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-2">Fuentes:</p>
                          <div className="flex flex-wrap gap-1">
                            {message.sources.map((source, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <FileText className="w-3 h-3 mr-1" />
                                {source}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </CardContent>
                  </Card>

                  {message.type === 'user' && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 bg-primary">
                    <AvatarFallback>
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Analizando documentos...</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border p-6">
          <div className="flex gap-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Haz una pregunta sobre tus documentos..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="w-10 h-10 p-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            El Asistente RAG analizará tus documentos para proporcionar respuestas precisas con citas.
          </p>
        </div>
      </div>

      {/* Session History Sidebar */}
      <div className="w-80 border-l border-border p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Sesiones Recientes</h3>
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-muted ${session.id === currentSessionId ? 'bg-muted' : ''}`}
                onClick={() => loadSession(session.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {session.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.timestamp.toLocaleDateString()} • {session.messageCount} mensajes
                    </p>
                  </div>
                  <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}