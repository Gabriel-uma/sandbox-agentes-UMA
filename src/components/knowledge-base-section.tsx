import { useState, useEffect } from "react"
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
  Users
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
  const [indexedDocs, setIndexedDocs] = useState<IndexedDocument[]>([
    {
      id: "idx_1",
      name: "Lista_Centros_Salud_2024.pdf",
      size: 2458624,
      indexedDate: new Date(Date.now() - 86400000),
      status: 'indexed',
      chunks: 156,
      vectorsCount: 156,
      lastAccessed: new Date(Date.now() - 3600000),
      queryCount: 24
    },
    {
      id: "idx_2",
      name: "Manual_Procedimientos.docx",
      size: 1234567,
      indexedDate: new Date(Date.now() - 172800000),
      status: 'indexed',
      chunks: 89,
      vectorsCount: 89,
      lastAccessed: new Date(Date.now() - 7200000),
      queryCount: 12
    },
    {
      id: "idx_3",
      name: "Reporte_Estadisticas.txt",
      size: 524288,
      indexedDate: new Date(Date.now() - 1800000),
      status: 'indexing',
      chunks: 0,
      vectorsCount: 0,
      queryCount: 0
    },
    {
      id: "idx_4",
      name: "Documento_Pendiente.pdf",
      size: 1024000,
      indexedDate: new Date(),
      status: 'queued',
      chunks: 0,
      vectorsCount: 0,
      queryCount: 0
    }
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState<KnowledgeBaseStats>({
    totalDocuments: 4,
    indexedDocuments: 2,
    totalChunks: 245,
    totalVectors: 245,
    indexSize: "152 MB",
    lastUpdate: new Date(Date.now() - 1800000),
    queryCount: 36,
    avgResponseTime: 1.2
  })

  const refreshKnowledgeBase = async () => {
    setIsRefreshing(true)

    // Simulate API call to refresh status
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Update stats
    setStats(prev => ({
      ...prev,
      lastUpdate: new Date()
    }))

    // Simulate document status updates
    setIndexedDocs(prev => prev.map(doc => {
      if (doc.status === 'indexing') {
        return { ...doc, status: 'indexed', chunks: 67, vectorsCount: 67 }
      }
      if (doc.status === 'queued') {
        return { ...doc, status: 'indexing' }
      }
      return doc
    }))

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
                    <p className="text-sm text-muted-foreground">Consultas Hoy</p>
                    <p className="text-2xl font-semibold">127</p>
                    <p className="text-xs text-green-600">+12% vs ayer</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Precisión Promedio</p>
                    <p className="text-2xl font-semibold">94.2%</p>
                    <p className="text-xs text-blue-600">Excelente</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Usuarios Activos</p>
                    <p className="text-2xl font-semibold">23</p>
                    <p className="text-xs text-purple-600">En línea ahora</p>
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
                        <Badge variant="default">Excelente</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Latencia de consulta</span>
                        <span className="text-sm font-medium text-green-600">1.2s promedio</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Disponibilidad</span>
                        <span className="text-sm font-medium text-green-600">99.8%</span>
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