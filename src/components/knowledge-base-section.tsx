import { useCallback, useEffect, useMemo, useState } from "react"
import { useKnowledgeBase } from "@/context/knowledge-base-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
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
  Timer,
  Gauge,
  Loader2
} from "lucide-react"

const formatLatency = (value: number) => {
  if (!value || value <= 0) return "N/D"
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} s`
  }
  return `${value.toFixed(0)} ms`
}

const formatTokens = (value: number, fractionDigits = 0) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "N/D"
  }
  if (value === 0) return "0"
  return Number(value).toLocaleString("es-ES", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits
  })
}

export function KnowledgeBaseSection() {
  const {
    documents: indexedDocs,
    stats,
    isLoading,
    isRefreshing,
    hasLoaded,
    error,
    refresh,
    load,
    updateDocument,
    formatFileSize
  } = useKnowledgeBase()

  const [searchTerm, setSearchTerm] = useState("")
  const isInitialLoading = isLoading && !hasLoaded

  // Cargar documentos al montar el componente
  useEffect(() => {
    load()
  }, [load])

  const reindexDocument = useCallback((docId: string) => {
    updateDocument(docId, (doc) => ({
      ...doc,
      status: "indexing",
      chunks: 0,
      vectorsCount: 0
    }))

    setTimeout(() => {
      updateDocument(docId, (doc) => ({
        ...doc,
        status: "indexed",
        chunks: Math.floor(Math.random() * 200) + 50,
        vectorsCount: Math.floor(Math.random() * 200) + 50,
        indexedDate: new Date()
      }))
    }, 3000)
  }, [updateDocument])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "indexed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "indexing":
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      case "queued":
        return <Clock className="w-4 h-4 text-orange-600" />
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Database className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "indexed": return "Indexado"
      case "indexing": return "Indexando"
      case "queued": return "En Cola"
      case "failed": return "Error"
      default: return "Desconocido"
    }
  }

  const filteredDocs = useMemo(
    () => indexedDocs.filter(doc =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [indexedDocs, searchTerm]
  )

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Base de Conocimiento</h2>
          <p className="text-sm text-muted-foreground">
            Estado y gestión del índice vectorial de documentos
          </p>
        </div>
        <Button onClick={refresh} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Actualizando..." : "Actualizar Estado"}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="flex-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="documents">Documentos Indexados</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Database className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Documentos Indexados</p>
                    {isInitialLoading ? (
                      <Skeleton className="h-7 w-24" />
                    ) : (
                      <p className="text-2xl font-semibold">
                        {stats.indexedDocuments}/{stats.totalDocuments}
                      </p>
                    )}
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
                    {isInitialLoading ? (
                      <Skeleton className="h-7 w-20" />
                    ) : (
                      <p className="text-2xl font-semibold">{stats.totalChunks.toLocaleString()}</p>
                    )}
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
                    {isInitialLoading ? (
                      <Skeleton className="h-7 w-20" />
                    ) : (
                      <p className="text-2xl font-semibold">{stats.totalVectors.toLocaleString()}</p>
                    )}
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
                    {isInitialLoading ? (
                      <Skeleton className="h-7 w-24" />
                    ) : (
                      <p className="text-2xl font-semibold">{stats.indexSize}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
                      <span className="text-sm text-muted-foreground">Documentos procesados</span>
                      {isInitialLoading ? (
                        <Skeleton className="h-5 w-16" />
                      ) : (
                        <span className="text-sm font-medium">
                          {stats.indexedDocuments}/{stats.totalDocuments}
                        </span>
                      )}
                    </div>
                    <Progress value={stats.totalDocuments ? (stats.indexedDocuments / stats.totalDocuments) * 100 : 0} />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Información del Sistema</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Última actualización:</span>
                      {isInitialLoading ? (
                        <Skeleton className="h-5 w-32" />
                      ) : (
                        <span>{stats.lastUpdate ? stats.lastUpdate.toLocaleString() : "N/D"}</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consultas totales:</span>
                      {isInitialLoading ? (
                        <Skeleton className="h-5 w-20" />
                      ) : (
                        <span>{stats.totalQueries.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Latencia promedio:</span>
                      {isInitialLoading ? (
                        <Skeleton className="h-5 w-20" />
                      ) : (
                        <span>{formatLatency(stats.avgLatencyMs)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documentos indexados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Documentos en el Índice</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading && !hasLoaded ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Cargando documentos indexados...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center p-6">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Ocurrió un error al cargar los documentos. Intenta actualizar nuevamente.
                    </p>
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
                              <Badge variant={doc.status === "indexed" ? "default" : "secondary"}>
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

                            {doc.status === "indexing" && (
                              <Progress value={50} className="mt-2 h-1" />
                            )}
                          </div>
                        </div>

                        {doc.status === "indexed" && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Consultas</p>
                    {isInitialLoading ? (
                      <Skeleton className="h-7 w-24" />
                    ) : (
                      <>
                        <p className="text-2xl font-semibold">{stats.totalQueries.toLocaleString()}</p>
                        <p className="text-xs text-green-600">Consultas registradas</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Timer className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Latencia Promedio</p>
                    {isInitialLoading ? (
                      <Skeleton className="h-7 w-20" />
                    ) : (
                      <>
                        <p className="text-2xl font-semibold">{formatLatency(stats.avgLatencyMs)}</p>
                        <p className="text-xs text-blue-600">Tiempo de respuesta</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tokens Promedio</p>
                    {isInitialLoading ? (
                      <Skeleton className="h-7 w-20" />
                    ) : (
                      <>
                        <p className="text-2xl font-semibold">{formatTokens(stats.avgTotalTokens, 1)}</p>
                        <p className="text-xs text-purple-600">Por consulta</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Gauge className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tokens Consumidos</p>
                    {isInitialLoading ? (
                      <Skeleton className="h-7 w-24" />
                    ) : (
                      <>
                        <p className="text-2xl font-semibold">{formatTokens(stats.totalTokens)}</p>
                        <p className="text-xs text-orange-600">Acumulado</p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Métricas de Rendimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-medium mb-3">Documentos Más Consultados</h4>
                    <div className="space-y-2">
                      {indexedDocs
                        .filter(doc => doc.status === "indexed")
                        .sort((a, b) => b.queryCount - a.queryCount)
                        .slice(0, 3)
                        .map((doc, index) => (
                          <div key={doc.id} className="flex items-center justify-between gap-3 p-2 bg-muted rounded">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
                                {index + 1}
                              </span>
                              <span className="text-sm truncate" title={doc.name}>{doc.name}</span>
                            </div>
                            <Badge variant="outline" className="shrink-0">
                              {doc.queryCount} consultas
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">Estado de Salud del Índice</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Salud general</span>
                        {isInitialLoading ? (
                          <Skeleton className="h-5 w-24" />
                        ) : (
                          <Badge variant={stats.indexedDocuments === stats.totalDocuments ? "default" : "secondary"}>
                            {stats.indexedDocuments === stats.totalDocuments ? "Excelente" : "Procesando"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total documentos</span>
                        {isInitialLoading ? (
                          <Skeleton className="h-5 w-28" />
                        ) : (
                          <span className="text-sm font-medium text-blue-600">{stats.totalDocuments} documentos</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Tamaño del índice</span>
                        {isInitialLoading ? (
                          <Skeleton className="h-5 w-28" />
                        ) : (
                          <span className="text-sm font-medium text-green-600">{stats.indexSize}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3">Consumo de Tokens</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Promedio por consulta</span>
                        {isInitialLoading ? (
                          <Skeleton className="h-5 w-24" />
                        ) : (
                          <span className="text-sm font-medium text-purple-600">
                            {formatTokens(stats.avgTotalTokens, 1)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Tokens prompt</span>
                        {isInitialLoading ? (
                          <Skeleton className="h-5 w-20" />
                        ) : (
                          <span className="text-sm">{formatTokens(stats.avgPromptTokens, 1)}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Tokens respuesta</span>
                        {isInitialLoading ? (
                          <Skeleton className="h-5 w-20" />
                        ) : (
                          <span className="text-sm">{formatTokens(stats.avgResponseTokens, 1)}</span>
                        )}
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
