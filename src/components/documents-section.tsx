import { useState, useCallback } from "react"
import { ragService } from "@/lib/rag-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Upload, FileText, X, CheckCircle, AlertCircle, Search, Trash2, Download, FileUp, HardDrive } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadedDocument {
  id: string
  name: string
  size: number
  uploadDate: Date
  status: 'uploading' | 'processing' | 'ready' | 'error'
  progress: number
  type: string
  pages?: number
  indexed: boolean
}

export function DocumentsSection() {
  const [dragActive, setDragActive] = useState(false)
  const [documents, setDocuments] = useState<UploadedDocument[]>([
    {
      id: "doc_1",
      name: "Lista_Centros_Salud_2024.pdf",
      size: 2458624,
      uploadDate: new Date(Date.now() - 86400000),
      status: 'ready',
      progress: 100,
      type: 'application/pdf',
      pages: 45,
      indexed: true
    },
    {
      id: "doc_2",
      name: "Manual_Procedimientos.docx",
      size: 1234567,
      uploadDate: new Date(Date.now() - 172800000),
      status: 'ready',
      progress: 100,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pages: 128,
      indexed: true
    },
    {
      id: "doc_3",
      name: "Reporte_Estadisticas.txt",
      size: 524288,
      uploadDate: new Date(Date.now() - 259200000),
      status: 'processing',
      progress: 75,
      type: 'text/plain',
      indexed: false
    }
  ])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      handleFiles(selectedFiles)
    }
  }

  const handleFiles = (fileList: File[]) => {
    const newDocs = fileList.map(file => ({
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      uploadDate: new Date(),
      status: 'uploading' as const,
      progress: 0,
      type: file.type,
      pages: Math.floor(Math.random() * 100) + 1,
      indexed: false
    }))

    setDocuments(prev => [...newDocs, ...prev])

    // Simulate upload and processing
    newDocs.forEach(doc => {
      simulateDocumentProcessing(doc.id)
    })
  }

  const simulateDocumentProcessing = async (docId: string) => {
    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 300))
      setDocuments(prev => prev.map(doc =>
        doc.id === docId ? { ...doc, progress } : doc
      ))
    }

    // Change to processing
    setDocuments(prev => prev.map(doc =>
      doc.id === docId ? { ...doc, status: 'processing', progress: 0 } : doc
    ))

    // Simulate processing
    for (let progress = 0; progress <= 100; progress += 20) {
      await new Promise(resolve => setTimeout(resolve, 500))
      setDocuments(prev => prev.map(doc =>
        doc.id === docId ? { ...doc, progress } : doc
      ))
    }

    // Complete processing
    setDocuments(prev => prev.map(doc =>
      doc.id === docId ? { ...doc, status: 'ready', progress: 100, indexed: true } : doc
    ))
  }

  const deleteDocument = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId))
    setSelectedDocuments(prev => prev.filter(id => id !== docId))
  }

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    )
  }

  const deleteSelectedDocuments = () => {
    setDocuments(prev => prev.filter(doc => !selectedDocuments.includes(doc.id)))
    setSelectedDocuments([])
  }

  const downloadDocument = (doc: UploadedDocument) => {
    // Mock download functionality
    const blob = new Blob([`Contenido del documento: ${doc.name}`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = doc.name
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄'
    if (type.includes('word') || type.includes('document')) return '📝'
    if (type.includes('text')) return '📋'
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊'
    return '📁'
  }

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalSize = documents.reduce((acc, doc) => acc + doc.size, 0)
  const readyDocuments = documents.filter(doc => doc.status === 'ready').length
  const processingDocuments = documents.filter(doc => doc.status === 'processing' || doc.status === 'uploading').length

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Documentos</h2>
            <p className="text-sm text-muted-foreground">
              Gestiona los documentos de tu base de conocimiento
            </p>
          </div>
          {selectedDocuments.length > 0 && (
            <Button variant="destructive" size="sm" onClick={deleteSelectedDocuments}>
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar Seleccionados ({selectedDocuments.length})
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Documentos</p>
                  <p className="text-2xl font-semibold">{documents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Listos</p>
                  <p className="text-2xl font-semibold">{readyDocuments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Upload className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Procesando</p>
                  <p className="text-2xl font-semibold">{processingDocuments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <HardDrive className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Tamaño Total</p>
                  <p className="text-2xl font-semibold">{formatFileSize(totalSize)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Upload Area */}
        <div className="w-1/3 overflow-y-auto">
          {/* Upload Card */}
          <Card
            className={cn(
              "border-2 border-dashed transition-colors cursor-pointer mb-4",
              dragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <FileUp className="w-12 h-12 text-muted-foreground mx-auto" />
              </div>
              <div className="mb-4">
                <p className="text-sm font-medium text-foreground mb-1">
                  Arrastra archivos aquí o haz clic para explorar
                </p>
                <p className="text-xs text-muted-foreground">
                  Soporta PDF, DOC, DOCX, TXT y otros formatos
                </p>
              </div>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" className="cursor-pointer">
                  Seleccionar Archivos
                </Button>
              </label>
            </CardContent>
          </Card>

          {/* Upload Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Instrucciones de Carga</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ul className="text-xs text-muted-foreground space-y-2">
                <li>• Máximo 50MB por archivo</li>
                <li>• Hasta 100 archivos simultáneos</li>
                <li>• Indexación automática tras procesamiento</li>
                <li>• Los documentos procesados estarán disponibles para consulta</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Documents List */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Search */}
          <div className="mb-4 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Documents Table */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Lista de Documentos</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-1">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className={cn(
                        "flex items-center gap-4 p-4 hover:bg-muted transition-colors border-b border-border",
                        selectedDocuments.includes(doc.id) && "bg-muted"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={() => toggleDocumentSelection(doc.id)}
                        className="w-4 h-4"
                      />

                      <div className="text-2xl">
                        {getFileIcon(doc.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {doc.name}
                          </p>
                          <div className="flex items-center gap-2">
                            {doc.indexed && (
                              <Badge variant="default" className="text-xs">
                                Indexado
                              </Badge>
                            )}
                            <Badge variant={
                              doc.status === 'ready' ? 'default' :
                              doc.status === 'processing' ? 'secondary' :
                              doc.status === 'uploading' ? 'secondary' : 'destructive'
                            }>
                              {doc.status === 'uploading' ? 'Subiendo' :
                               doc.status === 'processing' ? 'Procesando' :
                               doc.status === 'ready' ? 'Listo' : 'Error'}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {formatFileSize(doc.size)} • {doc.uploadDate.toLocaleDateString()}
                            {doc.pages && ` • ${doc.pages} páginas`}
                          </span>
                        </div>

                        {(doc.status === 'uploading' || doc.status === 'processing') && (
                          <Progress value={doc.progress} className="mt-2 h-1" />
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {doc.status === 'ready' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => downloadDocument(doc)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0 text-red-600"
                          onClick={() => deleteDocument(doc.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}