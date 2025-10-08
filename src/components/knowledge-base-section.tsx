import { useState, useEffect } from "react"
import { ragService, type Document } from "@/lib/rag-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RefreshCw,
  Database,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  FileText,
  BarChart3,
  Activity,
  Zap,
  HardDrive,
  Users,
  Loader2
} from "lucide-react"

interface IndexedDocument {
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

interface KnowledgeBaseStats {
  totalDocuments: number
  indexedDocuments: number
  totalChunks: number
  totalVectors: number
  indexSize: string
  lastUpdate: Date
  queryCount: number
  avgResponseTime: number
}

export function KnowledgeBaseSection() {
  const [indexedDocs, setIndexedDocs] = useState<IndexedDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState<KnowledgeBaseStats>({
    totalDocuments: 0,
    indexedDocuments: 0,
    totalChunks: 0,
    totalVectors: 0,
    indexSize: "0 MB",
    lastUpdate: new Date(),
    queryCount: 0,
    avgResponseTime: 0
  })

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    setIsLoading(true)
    try {
      const docs = await ragService.fetchDocuments()
      const chatHistory = ragService.getChatHistory()

      // Calculate query counts from chat history
      const sourceDocCounts = new Map<string, number>()
      chatHistory.forEach(msg => {
        if (msg.sources) {
          msg.sources.forEach(source => {
            sourceDocCounts.set(source, (sourceDocCounts.get(source) || 0) + 1)
          })
        }
      })

      // Convert Document[] to IndexedDocument[]
      const indexed: IndexedDocument[] = docs.map(doc => ({
        id: doc.id,
        name: doc.name,
        size: doc.size || 0,
        indexedDate: doc.uploadedAt || new Date(),
        status: doc.status === 'ready' ? 'indexed' : doc.status === 'processing' ? 'indexing' : doc.status === 'uploading' ? 'queued' : 'failed',
        chunks: doc.totalChunks || 0,
        vectorsCount: doc.totalChunks || 0,
        lastAccessed: undefined,
        queryCount: sourceDocCounts.get(doc.name) || 0
      }))

      setIndexedDocs(indexed)

      // Calculate stats
      const totalDocs = indexed.length
      const indexedCount = indexed.filter(d => d.status === 'indexed').length
      const totalChunks = indexed.reduce((sum, doc) => sum + doc.chunks, 0)
      const totalVectors = indexed.reduce((sum, doc) => sum + doc.vectorsCount, 0)
      const totalSize = indexed.reduce((sum, doc) => sum + doc.size, 0)
      const totalQueries = chatHistory.filter(msg => msg.type === 'user').length

      setStats({
        totalDocuments: totalDocs,
        indexedDocuments: indexedCount,
        totalChunks: totalChunks,
        totalVectors: totalVectors,
        indexSize: formatFileSize(totalSize),
        lastUpdate: new Date(),
        queryCount: totalQueries,
        avgResponseTime: 0
      })
    } catch (error) {
      console.error("Error loading documents:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshKnowledgeBase = async () => {
    setIsRefreshing(true)
    await loadDocuments()
    setIsRefreshing(false)
  }

  const reindexDocument = async (docId: string) => {
    setIndexedDocs(prev => prev.map(doc =>
      doc.id === docId ? { ...doc, status: 'indexing', chunks: 0, vectorsCount: 0 } : doc
    ))

    // Simulate reindexing
    setTimeout(() => {
      setIndexedDocs(prev => prev.map(doc =>
        doc.id === docId ? {
          ...doc,
          status: 'indexed',
          chunks: Math.floor(Math.random() * 200) + 50,
          vectorsCount: Math.floor(Math.random() * 200) + 50,
          indexedDate: new Date()
        } : doc
      ))
    }, 3000)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'indexed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'indexing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      case 'queued':
        return <Clock className="w-4 h-4 text-orange-600" />
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Database className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'indexed': return 'Indexado'
      case 'indexing': return 'Indexando'
      case 'queued': return 'En Cola'
      case 'failed': return 'Error'
      default: return 'Desconocido'
    }
  }

  const filteredDocs = indexedDocs.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Base de Conocimiento</h2>
          <p className="text-sm text-muted-foreground">
            Estado y gestión del índice vectorial de documentos
          </p>
        </div>
        <Button onClick={refreshKnowledgeBase} disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Actualizando...' : 'Actualizar Estado'}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="flex-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="documents">Documentos Indexados</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Database className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Documentos Indexados</p>
                    <p className="text-2xl font-semibold">{stats.indexedDocuments}/{stats.totalDocuments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Fragmentos</p>
                    <p className="text-2xl font-semibold">{stats.totalChunks.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Vectores</p>
                    <p className="text-2xl font-semibold">{stats.totalVectors.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tamaño Índice</p>
                    <p className="text-2xl font-semibold">{stats.indexSize}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>Estado del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">Progreso de Indexación</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Documentos procesados</span>
                      <span className="text-sm font-medium">{stats.indexedDocuments}/{stats.totalDocuments}</span>
                    </div>
                    <Progress value={(stats.indexedDocuments / stats.totalDocuments) * 100} />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Información del Sistema</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Última actualización:</span>
                      <span>{stats.lastUpdate.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consultas totales:</span>
                      <span>{stats.queryCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tiempo promedio:</span>
                      <span>{stats.avgResponseTime}s</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documentos indexados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle>Documentos en el Índice</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Cargando documentos indexados...</p>
                  </div>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center p-6">
                    <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? "No se encontraron documentos con ese nombre" : "No hay documentos indexados todavía"}
                    </p>
                  </div>
                </div>
              ) : (
              <ScrollArea className="h-96">
                <div className="space-y-1">
                  {filteredDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-muted transition-colors border-b border-border">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(doc.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {doc.name}
                            </p>
                            <Badge variant={doc.status === 'indexed' ? 'default' : 'secondary'}>
                              {getStatusText(doc.status)}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
                            <span>{formatFileSize(doc.size)}</span>
                            <span>{doc.chunks} fragmentos</span>
                            <span>{doc.vectorsCount} vectores</span>
                            <span>{doc.queryCount} consultas</span>
                          </div>

                          {doc.lastAccessed && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Último acceso: {doc.lastAccessed.toLocaleString()}
                            </p>
                          )}

                          {doc.status === 'indexing' && (
                            <Progress value={Math.random() * 100} className="mt-2 h-1" />
                          )}
                        </div>
                      </div>

                      {doc.status === 'indexed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reindexDocument(doc.id)}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Re-indexar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Consultas</p>
                    <p className="text-2xl font-semibold">{stats.queryCount}</p>
                    <p className="text-xs text-green-600">Consultas realizadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Documentos Activos</p>
                    <p className="text-2xl font-semibold">{stats.indexedDocuments}</p>
                    <p className="text-xs text-blue-600">Listos para consulta</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fragmentos Indexados</p>
                    <p className="text-2xl font-semibold">{stats.totalChunks.toLocaleString()}</p>
                    <p className="text-xs text-purple-600">Chunks procesados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Rendimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Documentos Más Consultados</h4>
                    <div className="space-y-2">
                      {indexedDocs
                        .filter(doc => doc.status === 'indexed')
                        .sort((a, b) => b.queryCount - a.queryCount)
                        .slice(0, 3)
                        .map((doc, index) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
                                {index + 1}
                              </span>
                              <span className="text-sm truncate">{doc.name}</span>
                            </div>
                            <Badge variant="outline">{doc.queryCount} consultas</Badge>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">Estado de Salud del Índice</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Salud general</span>
                        <Badge variant={stats.indexedDocuments === stats.totalDocuments ? "default" : "secondary"}>
                          {stats.indexedDocuments === stats.totalDocuments ? "Excelente" : "Procesando"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total documentos</span>
                        <span className="text-sm font-medium text-blue-600">{stats.totalDocuments} documentos</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Tamaño del índice</span>
                        <span className="text-sm font-medium text-green-600">{stats.indexSize}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}