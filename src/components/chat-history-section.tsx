import { useState, useEffect } from "react"
import { ragService } from "@/lib/rag-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Search,
  MessageSquare,
  Calendar,
  Clock,
  Trash2,
  Download,
  Eye,
  Filter,
  Bot,
  User,
  FileText,
  Loader2
} from "lucide-react"

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: string[]
}

interface ChatSession {
  id: string
  title: string
  startTime: Date
  endTime: Date
  messageCount: number
  duration: number // in minutes
  messages: ChatMessage[]
  topics: string[]
}

export function ChatHistorySection() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [filterDate, setFilterDate] = useState("")
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadChatHistory()
  }, [])

  const loadChatHistory = () => {
    setIsLoading(true)
    try {
      const history = ragService.getChatHistory()

      // Convert chat history to ChatSession format
      const sessions: ChatSession[] = history.map(msg => {
        const messages: ChatMessage[] = [{
          id: msg.id,
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp,
          sources: msg.sources
        }]

        return {
          id: msg.sessionId || msg.id,
          title: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
          startTime: msg.timestamp,
          endTime: msg.timestamp,
          messageCount: 1,
          duration: 0,
          messages: messages,
          topics: msg.sources || []
        }
      })

      // Group messages by sessionId
      const groupedSessions = new Map<string, ChatSession>()

      sessions.forEach(session => {
        const sessionId = session.id
        if (groupedSessions.has(sessionId)) {
          const existing = groupedSessions.get(sessionId)!
          existing.messages.push(...session.messages)
          existing.messageCount = existing.messages.length
          existing.endTime = session.endTime
          const durationMs = existing.endTime.getTime() - existing.startTime.getTime()
          existing.duration = Math.floor(durationMs / 60000) // Convert to minutes
        } else {
          groupedSessions.set(sessionId, session)
        }
      })

      setChatSessions(Array.from(groupedSessions.values()).sort((a, b) =>
        b.startTime.getTime() - a.startTime.getTime()
      ))
    } catch (error) {
      console.error("Error loading chat history:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredSessions = chatSessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         session.messages.some(msg => msg.content.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesDate = !filterDate || session.startTime.toDateString() === new Date(filterDate).toDateString()

    return matchesSearch && matchesDate
  })

  const exportSession = (session: ChatSession) => {
    const exportData = {
      session: session.title,
      date: session.startTime.toISOString(),
      duration: session.duration,
      messageCount: session.messageCount,
      topics: session.topics,
      messages: session.messages
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-${session.id}-${session.startTime.toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const deleteSession = (sessionId: string) => {
    setChatSessions(prev => prev.filter(session => session.id !== sessionId))
  }

  const clearAllHistory = () => {
    ragService.clearChatHistory()
    setChatSessions([])
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const getTopicColor = (index: number) => {
    const colors = ['bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-purple-100 text-purple-800', 'bg-orange-100 text-orange-800']
    return colors[index % colors.length]
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Historial de Chat</h2>
          <p className="text-sm text-muted-foreground">
            Revisa y gestiona todas tus conversaciones pasadas
          </p>
        </div>
        <Button variant="destructive" onClick={clearAllHistory}>
          <Trash2 className="w-4 h-4 mr-2" />
          Limpiar Todo el Historial
        </Button>
      </div>

      <Tabs defaultValue="sessions" className="flex-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sessions">Sesiones</TabsTrigger>
          <TabsTrigger value="search">Búsqueda Avanzada</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en conversaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Filtrar por fecha"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {filteredSessions.length} de {chatSessions.length} sesiones
              </span>
            </div>
          </div>

          {/* Sessions List */}
          {isLoading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando historial de chat...</p>
              </div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center p-6">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm || filterDate ? "No se encontraron conversaciones con los filtros aplicados" : "No hay conversaciones guardadas todavía"}
                </p>
              </div>
            </div>
          ) : (
          <ScrollArea className="h-96">
            <div className="grid grid-cols-1 gap-4">
              {filteredSessions.map((session) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-5 h-5 text-primary" />
                          <h3 className="text-sm font-medium text-foreground truncate">
                            {session.title}
                          </h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {session.startTime.toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(session.duration)}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {session.messageCount} mensajes
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {session.topics.length} temas
                          </div>
                        </div>

                        {/* Topics */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {session.topics.map((topic, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className={`text-xs ${getTopicColor(index)}`}
                            >
                              {topic}
                            </Badge>
                          ))}
                        </div>

                        {/* Preview of first message */}
                        <p className="text-xs text-muted-foreground truncate">
                          "{session.messages[0]?.content}"
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              Ver
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle>{session.title}</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="h-96 pr-4">
                              <div className="space-y-4">
                                {session.messages.map((message) => (
                                  <div
                                    key={message.id}
                                    className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                  >
                                    {message.type === 'assistant' && (
                                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-primary-foreground" />
                                      </div>
                                    )}

                                    <Card className={`max-w-[80%] ${message.type === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
                                      <CardContent className="p-3">
                                        <p className="text-sm">{message.content}</p>
                                        {message.sources && (
                                          <div className="mt-2 pt-2 border-t border-border">
                                            <p className="text-xs text-muted-foreground mb-1">Fuentes:</p>
                                            <div className="flex flex-wrap gap-1">
                                              {message.sources.map((source, index) => (
                                                <Badge key={index} variant="outline" className="text-xs">
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
                                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>

                        <Button variant="outline" size="sm" onClick={() => exportSession(session)}>
                          <Download className="w-4 h-4 mr-2" />
                          Exportar
                        </Button>

                        <Button variant="ghost" size="sm" onClick={() => deleteSession(session.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Búsqueda Avanzada en Historial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Buscar en contenido</label>
                  <Input placeholder="Palabras clave en mensajes..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Buscar en temas</label>
                  <Input placeholder="Temas específicos..." />
                </div>
                <div>
                  <label className="text-sm font-medium">Fecha desde</label>
                  <Input type="date" />
                </div>
                <div>
                  <label className="text-sm font-medium">Fecha hasta</label>
                  <Input type="date" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button>
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </Button>
                <Button variant="outline">
                  Limpiar Filtros
                </Button>
              </div>

              {/* Search Results would go here */}
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">Resultados de Búsqueda</h4>
                <p className="text-sm text-muted-foreground">
                  Ingresa términos de búsqueda para encontrar conversaciones específicas.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}