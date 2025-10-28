import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search,
  Book,
  MessageCircle,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileText,
  Upload,
  Database,
  Settings,
  Zap,
  Shield,
  PlayCircle,
  CheckCircle
} from "lucide-react"

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
}

interface GuideStep {
  title: string
  description: string
  icon: React.ReactNode
  completed?: boolean
}

export function HelpSection() {
  const [searchTerm, setSearchTerm] = useState("")
  const [openFAQ, setOpenFAQ] = useState<string | null>(null)

  const faqItems: FAQItem[] = [
    {
      id: "1",
      question: "¿Cómo subo documentos al sistema?",
      answer: "Puedes subir documentos de varias formas: 1) Arrastra y suelta archivos en el área de carga, 2) Haz clic en 'Seleccionar Archivos' y elige los documentos, 3) Usa formatos compatibles como PDF, DOCX, TXT. El sistema procesará automáticamente los documentos y los indexará para búsqueda.",
      category: "Documentos",
      tags: ["upload", "documentos", "archivos"]
    },
    {
      id: "2",
      question: "¿Por qué mi documento no se procesa?",
      answer: "Puede haber varias razones: 1) El archivo es demasiado grande (máximo 50MB), 2) El formato no es compatible, 3) El archivo está corrupto o protegido con contraseña, 4) El sistema está sobrecargado. Verifica el estado en la sección 'Base de Conocimiento' o intenta subir el archivo nuevamente.",
      category: "Documentos",
      tags: ["error", "procesamiento", "problemas"]
    },
    {
      id: "3",
      question: "¿Cómo funciona el sistema RAG?",
      answer: "RAG (Retrieval-Augmented Generation) combina búsqueda y generación. Cuando haces una pregunta: 1) El sistema busca fragmentos relevantes en tus documentos, 2) Usa esos fragmentos como contexto, 3) Genera una respuesta basada en la información encontrada, 4) Incluye citas de las fuentes utilizadas.",
      category: "RAG",
      tags: ["rag", "funcionamiento", "búsqueda"]
    },
    {
      id: "4",
      question: "¿Puedo cambiar el modelo de IA?",
      answer: "Sí, ve a Configuración > Modelo IA para cambiar entre modelos disponibles como GPT-4, GPT-3.5, Claude, etc. Cada modelo tiene diferentes características de velocidad, costo y capacidades. También puedes ajustar parámetros como temperatura y longitud de respuesta.",
      category: "Configuración",
      tags: ["modelo", "configuración", "ia"]
    },
    {
      id: "5",
      question: "¿Mis datos están seguros?",
      answer: "Sí, implementamos múltiples medidas de seguridad: 1) Cifrado de datos en tránsito y reposo, 2) No compartimos información con terceros, 3) Puedes habilitar cifrado local adicional, 4) Sesiones con timeout automático, 5) Los datos se procesan en servidores seguros.",
      category: "Seguridad",
      tags: ["seguridad", "privacidad", "datos"]
    },
    {
      id: "6",
      question: "¿Cómo busco en el historial de chat?",
      answer: "En la sección 'Historial de Chat' puedes: 1) Usar la barra de búsqueda para encontrar conversaciones, 2) Filtrar por fecha, 3) Buscar por temas específicos, 4) Exportar conversaciones para análisis posterior. La búsqueda funciona tanto en títulos como en contenido de mensajes.",
      category: "Historial",
      tags: ["historial", "búsqueda", "conversaciones"]
    },
    {
      id: "7",
      question: "¿Qué formatos de archivo son compatibles?",
      answer: "Formatos soportados: PDF (.pdf), Word (.docx, .doc), Texto plano (.txt), Markdown (.md), CSV (.csv), Excel (.xlsx). Cada archivo debe ser menor a 50MB. Para documentos con imágenes, el texto será extraído automáticamente.",
      category: "Documentos",
      tags: ["formatos", "archivos", "compatibilidad"]
    },
    {
      id: "8",
      question: "¿Cómo mejoro la calidad de las respuestas?",
      answer: "Para mejores respuestas: 1) Sube documentos relevantes y bien estructurados, 2) Haz preguntas específicas y claras, 3) Ajusta la configuración del modelo (temperatura, etc.), 4) Usa documentos en el mismo idioma de tus preguntas, 5) Mantén los documentos actualizados.",
      category: "RAG",
      tags: ["calidad", "respuestas", "optimización"]
    }
  ]

  const guideSteps: GuideStep[] = [
    {
      title: "Configuración inicial",
      description: "Configura tu modelo de IA y preferencias básicas",
      icon: <Settings className="w-5 h-5" />,
      completed: true
    },
    {
      title: "Subir documentos",
      description: "Carga tus primeros documentos al sistema",
      icon: <Upload className="w-5 h-5" />,
      completed: true
    },
    {
      title: "Verificar indexación",
      description: "Confirma que los documentos están procesados",
      icon: <Database className="w-5 h-5" />,
      completed: false
    },
    {
      title: "Primera consulta",
      description: "Haz tu primera pregunta al asistente",
      icon: <MessageCircle className="w-5 h-5" />,
      completed: false
    },
    {
      title: "Explorar funciones",
      description: "Descubre todas las características disponibles",
      icon: <Zap className="w-5 h-5" />,
      completed: false
    }
  ]

  const filteredFAQs = faqItems.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const categories = [...new Set(faqItems.map(faq => faq.category))]

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Ayuda y Soporte</h2>
          <p className="text-sm text-muted-foreground">
            Encuentra respuestas y aprende a usar el sistema RAG
          </p>
        </div>
        <Button>
          <Mail className="w-4 h-4 mr-2" />
          Contactar Soporte
        </Button>
      </div>

      <Tabs defaultValue="getting-started" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
          <TabsTrigger value="getting-started">Inicio Rápido</TabsTrigger>
          <TabsTrigger value="faq">Preguntas Frecuentes</TabsTrigger>
          <TabsTrigger value="guides">Guías Detalladas</TabsTrigger>
          <TabsTrigger value="contact">Contacto</TabsTrigger>
        </TabsList>

        <TabsContent value="getting-started" className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full">
            <div className="space-y-6 pr-4">
              {/* Quick Start Guide */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlayCircle className="w-5 h-5" />
                    Guía de Inicio Rápido
                  </CardTitle>
                </CardHeader>
                <CardContent>
              <div className="space-y-6">
                {/* Pasos de inicio */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Primeros Pasos</h3>
                  <div className="space-y-4">
                    {guideSteps.map((step, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step.completed ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                          {step.completed ? <CheckCircle className="w-5 h-5" /> : step.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{step.title}</h4>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                        <Badge variant={step.completed ? "default" : "secondary"}>
                          {step.completed ? "Completado" : "Pendiente"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Guía detallada paso a paso */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4">Guía Detallada</h3>
                  <div className="space-y-6">
                    {/* Paso 1 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">1</div>
                        <h4 className="font-semibold text-base">Subir tus Documentos</h4>
                      </div>
                      <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                        <p>• Ve a la sección <strong>Documentos</strong> desde el menú lateral</p>
                        <p>• Arrastra y suelta archivos PDF, DOCX, TXT o CSV en el área de carga</p>
                        <p>• También puedes hacer clic en "Seleccionar Archivos" para buscar documentos</p>
                        <p>• Los documentos se procesarán automáticamente (puede tardar unos minutos)</p>
                        <p>• Verás el estado "Listo" cuando estén disponibles para consulta</p>
                      </div>
                    </div>

                    {/* Paso 2 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold">2</div>
                        <h4 className="font-semibold text-base">Hacer tu Primera Consulta</h4>
                      </div>
                      <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                        <p>• Dirígete a la sección <strong>Chat RAG</strong></p>
                        <p>• Escribe tu pregunta en el cuadro de texto inferior</p>
                        <p>• Sé específico: "¿Cuáles son los centros de salud en Lima?" en lugar de "¿Dónde hay centros?"</p>
                        <p>• Presiona Enter o haz clic en el botón de enviar</p>
                        <p>• El sistema buscará en tus documentos y generará una respuesta con fuentes citadas</p>
                      </div>
                    </div>

                    {/* Paso 3 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-semibold">3</div>
                        <h4 className="font-semibold text-base">Revisar las Respuestas</h4>
                      </div>
                      <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                        <p>• Las respuestas incluyen citas de las fuentes utilizadas</p>
                        <p>• Haz clic en las badges de "Fuentes" para ver qué documentos se usaron</p>
                        <p>• Puedes hacer preguntas de seguimiento en la misma conversación</p>
                        <p>• Usa el botón "Nueva Conversación" para empezar un tema diferente</p>
                      </div>
                    </div>

                    {/* Paso 4 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold">4</div>
                        <h4 className="font-semibold text-base">Gestionar tu Base de Conocimiento</h4>
                      </div>
                      <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                        <p>• Ve a <strong>Base de Conocimiento</strong> para ver todos tus documentos indexados</p>
                        <p>• Puedes buscar, filtrar y eliminar documentos</p>
                        <p>• Verifica el estado de procesamiento de cada documento</p>
                        <p>• Los documentos eliminados ya no estarán disponibles para consultas</p>
                      </div>
                    </div>

                    {/* Paso 5 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-semibold">5</div>
                        <h4 className="font-semibold text-base">Configurar Preferencias (Opcional)</h4>
                      </div>
                      <div className="ml-11 space-y-2 text-sm text-muted-foreground">
                        <p>• Accede a <strong>Configuración</strong> para personalizar el sistema</p>
                        <p>• Cambia el modelo de IA (GPT-4, GPT-3.5, Gemini Pro)</p>
                        <p>• Ajusta la "temperatura" para respuestas más creativas o conservadoras</p>
                        <p>• Configura el idioma de las respuestas</p>
                        <p>• Ajusta parámetros RAG como tamaño de fragmentos y cantidad de fuentes</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips adicionales */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4">💡 Tips para Mejores Resultados</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <h5 className="font-medium mb-2">📄 Calidad de Documentos</h5>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Usa documentos bien estructurados</li>
                        <li>• Evita documentos escaneados de baja calidad</li>
                        <li>• Prefiere formatos nativos (DOCX, PDF) sobre imágenes</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <h5 className="font-medium mb-2">❓ Mejores Preguntas</h5>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Sé específico y claro en tus preguntas</li>
                        <li>• Usa el mismo idioma de tus documentos</li>
                        <li>• Divide preguntas complejas en varias simples</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                      <h5 className="font-medium mb-2">⚙️ Optimización</h5>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Experimenta con diferentes modelos de IA</li>
                        <li>• Ajusta el número de fragmentos recuperados</li>
                        <li>• Mantén tu base de conocimiento organizada</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                      <h5 className="font-medium mb-2">🔒 Seguridad</h5>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Activa el cifrado de almacenamiento</li>
                        <li>• Configura timeout de sesión apropiado</li>
                        <li>• No subas información extremadamente sensible</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
                </CardContent>
              </Card>

              {/* Key Features Overview */}
              <Card>
            <CardHeader>
              <CardTitle>Características Principales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium">Carga de Documentos</h4>
                      <p className="text-sm text-muted-foreground">Arrastra y suelta archivos para análisis automático</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <h4 className="font-medium">Chat Inteligente</h4>
                      <p className="text-sm text-muted-foreground">Preguntas en lenguaje natural con respuestas citadas</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-purple-600" />
                    <div>
                      <h4 className="font-medium">Base de Conocimiento</h4>
                      <p className="text-sm text-muted-foreground">Índice vectorial para búsqueda semántica</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-orange-600" />
                    <div>
                      <h4 className="font-medium">Seguridad</h4>
                      <p className="text-sm text-muted-foreground">Cifrado y privacidad de datos garantizada</p>
                    </div>
                  </div>
                </div>
              </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="faq" className="flex-1 overflow-y-auto">
          <div className="space-y-4 pr-4">
          {/* Search FAQ */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en preguntas frecuentes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer">Todas</Badge>
            {categories.map(category => (
              <Badge key={category} variant="secondary" className="cursor-pointer">
                {category}
              </Badge>
            ))}
          </div>

          {/* FAQ List */}
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredFAQs.map((faq) => (
                <Collapsible key={faq.id} open={openFAQ === faq.id} onOpenChange={() => setOpenFAQ(openFAQ === faq.id ? null : faq.id)}>
                  <CollapsibleTrigger asChild>
                    <Card className="cursor-pointer hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">{faq.category}</Badge>
                            </div>
                            <h4 className="font-medium text-left">{faq.question}</h4>
                          </div>
                          {openFAQ === faq.id ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="mt-2">
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground">{faq.answer}</p>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {faq.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="guides" className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full">
            <div className="space-y-6 pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Guía de Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Aprende a cargar, organizar y gestionar documentos de forma efectiva.
                </p>
                <ul className="text-sm space-y-2">
                  <li>• Formatos soportados y limitaciones</li>
                  <li>• Mejores prácticas para indexación</li>
                  <li>• Gestión de documentos grandes</li>
                  <li>• Organización por categorías</li>
                </ul>
                <Button variant="outline" className="mt-4" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Guía Completa
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Guía RAG Avanzada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Optimiza el rendimiento y la precisión del sistema RAG.
                </p>
                <ul className="text-sm space-y-2">
                  <li>• Configuración de parámetros</li>
                  <li>• Estrategias de búsqueda</li>
                  <li>• Mejora de relevancia</li>
                  <li>• Análisis de resultados</li>
                </ul>
                <Button variant="outline" className="mt-4" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Guía Completa
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuración Avanzada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Personaliza el comportamiento del sistema según tus necesidades.
                </p>
                <ul className="text-sm space-y-2">
                  <li>• Selección de modelos de IA</li>
                  <li>• Ajuste de parámetros</li>
                  <li>• Configuración de idiomas</li>
                  <li>• Opciones de seguridad</li>
                </ul>
                <Button variant="outline" className="mt-4" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Guía Completa
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Seguridad y Privacidad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Comprende las medidas de seguridad y opciones de privacidad.
                </p>
                <ul className="text-sm space-y-2">
                  <li>• Cifrado de datos</li>
                  <li>• Políticas de retención</li>
                  <li>• Control de acceso</li>
                  <li>• Cumplimiento normativo</li>
                </ul>
                <Button variant="outline" className="mt-4" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Guía Completa
                </Button>
              </CardContent>
            </Card>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="contact" className="flex-1 overflow-y-auto">
          <ScrollArea className="h-full">
            <div className="space-y-6 pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Soporte Técnico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Correo Electrónico</p>
                    <p className="text-sm text-muted-foreground">soporte@rag-assistant.com</p>
                    <p className="text-xs text-muted-foreground">Respuesta en 24 horas</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Chat en Vivo</p>
                    <p className="text-sm text-muted-foreground">Lunes a Viernes, 9AM - 6PM</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Iniciar Chat
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recursos Adicionales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Book className="w-4 h-4 mr-2" />
                    Documentación Completa
                    <ExternalLink className="w-4 h-4 ml-auto" />
                  </Button>

                  <Button variant="outline" className="w-full justify-start">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Videos Tutoriales
                    <ExternalLink className="w-4 h-4 ml-auto" />
                  </Button>

                  <Button variant="outline" className="w-full justify-start">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Comunidad y Foro
                    <ExternalLink className="w-4 h-4 ml-auto" />
                  </Button>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Estado del Sistema</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Todos los sistemas operativos</span>
                  </div>
                  <Button variant="link" className="p-0 h-auto text-xs mt-1">
                    Ver página de estado
                  </Button>
                </div>
              </CardContent>
            </Card>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}