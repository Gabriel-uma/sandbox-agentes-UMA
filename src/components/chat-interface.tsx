import { useState, useRef, useEffect } from "react"
import { ragService, type RAGResponse } from "@/lib/rag-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, FileText, Loader2 } from "lucide-react"

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: string[]
}

const sampleQuestions = [
  "¿Qué información está disponible en los documentos subidos?",
  "Resume los temas principales cubiertos",
  "Encuentra detalles específicos sobre...",
  "Compara información entre documentos"
]

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // Use RAG service to query documents
    try {
      const response: RAGResponse = await ragService.queryDocuments(inputValue)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources
      }

      setMessages(prev => [...prev, assistantMessage])
      ragService.addMessage(assistantMessage)
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Lo siento, encontré un error al procesar tu pregunta. Por favor, inténtalo de nuevo.",
        timestamp: new Date()
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

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground mb-1">Chat con Documentos</h2>
        <p className="text-sm text-muted-foreground">
          Haz preguntas sobre tus documentos subidos
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="text-center mb-8">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Listo para ayudar con tus documentos
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Sube documentos y comienza a hacer preguntas. Analizaré el contenido y proporcionaré respuestas con citas de fuentes.
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
      </div>

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
  )
}