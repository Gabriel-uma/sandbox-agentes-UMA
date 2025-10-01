import { useState } from "react"
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
  FileText
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

  // Mock chat sessions
  const [chatSessions] = useState<ChatSession[]>([
    {
      id: "session_1",
      title: "Consulta sobre centros de salud",
      startTime: new Date(Date.now() - 86400000),
      endTime: new Date(Date.now() - 86400000 + 1800000),
      messageCount: 12,
      duration: 30,
      topics: ["centros de salud", "ubicaciones", "servicios"],
      messages: [
        {
          id: "msg_1",
          type: 'user',
          content: "¿Cuántos centros de salud hay en la región metropolitana?",
          timestamp: new Date(Date.now() - 86400000)
        },
        {
          id: "msg_2",
          type: 'assistant',
          content: "Según los documentos analizados, en la región metropolitana hay un total de 45 centros de salud distribuidos en diferentes comunas.",
          timestamp: new Date(Date.now() - 86400000 + 120000),
          sources: ["Lista_Centros_Salud_2024.pdf"]
        },
        {
          id: "msg_3",
          type: 'user',
          content: "¿Cuáles son los que atienden 24 horas?",
          timestamp: new Date(Date.now() - 86400000 + 300000)
        },
        {
          id: "msg_4",
          type: 'assistant',
          content: "De acuerdo a la información disponible, 8 centros de salud ofrecen atención 24 horas: Centro de Salud Las Condes, Hospital Clínico...",
          timestamp: new Date(Date.now() - 86400000 + 420000),
          sources: ["Lista_Centros_Salud_2024.pdf", "Manual_Procedimientos.docx"]
        }
      ]
    },
    {
      id: "session_2",
      title: "Análisis de procedimientos médicos",
      startTime: new Date(Date.now() - 172800000),
      endTime: new Date(Date.now() - 172800000 + 2400000),
      messageCount: 8,
      duration: 40,
      topics: ["procedimientos", "protocolos", "medicina"],
      messages: [
        {
          id: "msg_5",
          type: 'user',
          content: "¿Cuál es el protocolo para emergencias cardíacas?",
          timestamp: new Date(Date.now() - 172800000)
        },
        {
          id: "msg_6",
          type: 'assistant',
          content: "El protocolo para emergencias cardíacas incluye los siguientes pasos según el manual de procedimientos...",
          timestamp: new Date(Date.now() - 172800000 + 180000),
          sources: ["Manual_Procedimientos.docx"]
        }
      ]
    },
    {
      id: "session_3",
      title: "Estadísticas y reportes",
      startTime: new Date(Date.now() - 259200000),
      endTime: new Date(Date.now() - 259200000 + 900000),
      messageCount: 6,
      duration: 15,
      topics: ["estadísticas", "reportes", "datos"],
      messages: [
        {
          id: "msg_7",
          type: 'user',
          content: "¿Cuáles son las estadísticas de atención del último trimestre?",
          timestamp: new Date(Date.now() - 259200000)
        },
        {
          id: "msg_8",
          type: 'assistant',
          content: "Según el reporte de estadísticas, en el último trimestre se atendieron 12,450 pacientes...",
          timestamp: new Date(Date.now() - 259200000 + 150000),
          sources: ["Reporte_Estadisticas.txt"]
        }
      ]
    }
  ])

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
    // In real implementation, this would call the backend
    console.log(`Deleting session ${sessionId}`)
  }

  const clearAllHistory = () => {
    // In real implementation, this would call the backend
    console.log("Clearing all chat history")
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