import { useState, useCallback } from "react"
import { ragService } from "@/lib/rag-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadedFile {
  id: string
  name: string
  size: number
  status: 'uploading' | 'processed' | 'error'
  progress: number
}

export function DocumentUpload() {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])

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
    const newFiles = fileList.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      status: 'uploading' as const,
      progress: 0
    }))

    setFiles(prev => [...prev, ...newFiles])

    // Simulate file upload and processing
    newFiles.forEach(file => {
      simulateUpload(file.id)
    })
  }

  const simulateUpload = async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, progress } : f
      ))
    }

    try {
      // Use mock service to simulate backend upload
      await ragService.initializeBackend()

      // Simulate processing completion
      await new Promise(resolve => setTimeout(resolve, 1000))
      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, status: 'processed', progress: 100 } : f
      ))
    } catch (error) {
      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, status: 'error', progress: 0 } : f
      ))
    }
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">Subir Documentos</h2>
        <p className="text-sm text-muted-foreground">
          Sube documentos para construir tu base de conocimiento para el asistente RAG
        </p>
      </div>

      {/* Upload Area */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          dragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="p-8 text-center">
          <div className="mb-4">
            <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
          </div>
          <div className="mb-4">
            <p className="text-sm font-medium text-foreground mb-1">
              Arrastra archivos aquí o haz clic para explorar
            </p>
            <p className="text-xs text-muted-foreground">
              Soporta PDF, DOC, TXT y otros formatos de documento
            </p>
          </div>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md"
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

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="mt-6 flex-1">
          <h3 className="text-sm font-medium text-foreground mb-3">Archivos Subidos</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {files.map((file) => (
              <Card key={file.id} className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2">
                        {file.status === 'processed' && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        {file.status === 'error' && (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <Badge variant={file.status === 'processed' ? 'default' : 'secondary'}>
                          {file.status === 'uploading' ? 'Procesando' :
                           file.status === 'processed' ? 'Listo' : 'Error'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-6 h-6 p-0"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                      {file.status === 'uploading' && (
                        <span className="text-xs text-muted-foreground">
                          {file.progress}%
                        </span>
                      )}
                    </div>
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="mt-2 h-1" />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}