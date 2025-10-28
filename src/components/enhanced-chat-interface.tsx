import { useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@/context/chat-context"
import { ragService, type Document } from "@/lib/rag-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User, FileText, Loader2, MessageSquare, Trash2, Download, RefreshCw } from "lucide-react"

const sampleQuestions = [
  "¿Qué información está disponible en los documentos subidos?",
  "Resume los temas principales cubiertos",
  "Encuentra detalles específicos sobre...",
  "Compara información entre documentos"
]

export function EnhancedChatInterface() {
  const {
    sessions,
    activeSessionId,
    messages,
    isLoadingSessions,
    isLoadingActiveSession,
    isSending,
    createNewSession,
    selectSession,
    sendMessage,
    clearActiveSession
  } = useChat()

  const [inputValue, setInputValue] = useState("")
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load documents on mount
  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    setIsLoadingDocs(true)
    try {
      const docs = await ragService.fetchDocuments()
      setDocuments(docs.filter(d => d.status === 'ready'))
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setIsLoadingDocs(false)
    }
  }

  // Calculate session totals
  const sessionTotals = useMemo(() => {
    const assistantMessages = messages.filter(m => m.type === 'assistant')
    const totalTokens = assistantMessages.reduce((sum, m) => sum + (m.tokenUsage?.total_tokens || 0), 0)
    const totalCost = assistantMessages.reduce((sum, m) => sum + (m.estimatedCost || 0), 0)
    return { totalTokens, totalCost }
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isSending])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return
    await sendMessage(inputValue)
    setInputValue("")
  }

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  const handleSampleQuestion = (question: string) => {
    setInputValue(question)
  }

  const handleExportChat = () => {
    if (!activeSessionId) return
    const chatData = {
      sessionId: activeSessionId,
      timestamp: new Date().toISOString(),
      messages
    }

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `chat-${activeSessionId}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Chat RAG</h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{messages.length} mensajes</span>
                {sessionTotals.totalTokens > 0 && (
                  <>
                    <span>•</span>
                    <span title="Tokens totales de la sesión">
                      {sessionTotals.totalTokens.toLocaleString()} tokens
                    </span>
                    {sessionTotals.totalCost > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-green-600 dark:text-green-400 font-medium" title="Costo total estimado">
                          ${sessionTotals.totalCost.toFixed(4)}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportChat} disabled={messages.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline" size="sm" onClick={clearActiveSession} disabled={!messages.length}>
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar
              </Button>
              <Button variant="default" size="sm" onClick={createNewSession}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Nueva Conversación
              </Button>
            </div>
          </div>

          {/* Documents available section */}
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <div className="flex items-center gap-2 flex-1">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Documentos disponibles:
              </span>
              {isLoadingDocs ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : documents.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  No hay documentos. Sube documentos en la sección "Documentos"
                </span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {documents.slice(0, 5).map((doc) => (
                    <Badge key={doc.id} variant="secondary" className="text-xs">
                      {doc.name}
                    </Badge>
                  ))}
                  {documents.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{documents.length - 5} más
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadDocuments}
              disabled={isLoadingDocs}
              className="h-8 w-8 p-0"
              title="Recargar documentos"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingDocs ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6 h-full overflow-y-auto">
          {isLoadingActiveSession ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando historial de la conversación...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
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
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.type === "assistant" && (
                    <Avatar className="w-8 h-8 bg-primary">
                      <AvatarFallback>
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <Card className={`max-w-[80%] ${message.type === "user" ? "bg-primary text-primary-foreground" : ""}`}>
                    <CardContent className="p-4">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                      {message.sources && message.sources.length > 0 && (
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

                  {message.type === "user" && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isSending && (
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

        <div className="border-t border-border p-6">
          <div className="flex gap-3">
            <Input
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Haz una pregunta sobre tus documentos..."
              className="flex-1"
              disabled={isSending || isLoadingActiveSession}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isSending || isLoadingActiveSession}
              className="w-10 h-10 p-0"
            >
              {isSending ? (
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

      <div className="w-80 border-l border-border p-4 flex flex-col min-h-0">
        <h3 className="text-sm font-medium text-foreground mb-3">Sesiones Recientes</h3>
        <ScrollArea className="flex-1 h-full min-h-0 overflow-hidden">
          <div className="space-y-2">
            {isLoadingSessions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center px-4 py-8">
                No hay conversaciones registradas todavía.
              </div>
            ) : (
              sessions.map(session => (
                <Card
                  key={session.id}
                  className={`p-3 cursor-pointer transition-colors hover:bg-muted ${session.id === activeSessionId ? "bg-muted" : ""}`}
                  onClick={() => void selectSession(session.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {session.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.updatedAt.toLocaleDateString()} • {session.messageCount} mensajes
                      </p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
