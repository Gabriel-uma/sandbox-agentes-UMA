import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  Bot,
  Languages,
  Database,
  Shield,
  Save,
  RotateCcw,
  TestTube,
  Zap,
  Globe,
  Lock
} from "lucide-react"

interface AIModelConfig {
  id: string
  name: string
  description: string
  maxTokens: number
  available: boolean
}

export function SettingsSection() {
  const [settings, setSettings] = useState({
    // AI Model Settings
    selectedModel: "gpt-4-turbo",
    temperature: [0.7],
    maxResponseLength: [2048],
    topP: [0.9],
    presencePenalty: [0.1],

    // Language Settings
    responseLanguage: "es",
    autoDetectLanguage: true,

    // System Settings
    autoSave: true,
    enableNotifications: true,
    darkMode: "auto",

    // Security Settings
    encryptStorage: true,
    sessionTimeout: 30,

    // RAG Settings
    maxDocuments: 100,
    chunkSize: 512,
    overlapSize: 50,
    retrievalCount: 5,

    // Custom Prompt
    systemPrompt: "Eres un asistente experto que ayuda a responder preguntas basándose en documentos. Proporciona respuestas precisas y cita las fuentes relevantes."
  })

  const [unsavedChanges, setUnsavedChanges] = useState(false)

  const aiModels: AIModelConfig[] = [
    {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      description: "Modelo más avanzado, ideal para análisis complejos",
      maxTokens: 4096,
      available: true
    },
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      description: "Más rápido y económico, bueno para consultas generales",
      maxTokens: 2048,
      available: true
    },
    {
      id: "claude-3",
      name: "Claude 3 Sonnet",
      description: "Excelente para análisis de documentos largos",
      maxTokens: 8192,
      available: false
    },
    {
      id: "gemini-pro",
      name: "Gemini Pro",
      description: "Modelo de Google, integración con GCP",
      maxTokens: 2048,
      available: true
    }
  ]

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setUnsavedChanges(true)
  }

  const saveSettings = () => {
    // In real implementation, save to backend
    console.log("Saving settings:", settings)
    setUnsavedChanges(false)
  }

  const resetSettings = () => {
    // Reset to defaults
    setUnsavedChanges(true)
  }

  const testModel = async () => {
    // Test current model configuration
    console.log("Testing model with current settings...")
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Configuración</h2>
          <p className="text-sm text-muted-foreground">
            Personaliza el comportamiento del sistema RAG
          </p>
        </div>
        <div className="flex gap-2">
          {unsavedChanges && (
            <Badge variant="secondary">Cambios sin guardar</Badge>
          )}
          <Button variant="outline" onClick={resetSettings}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Restablecer
          </Button>
          <Button onClick={saveSettings} disabled={!unsavedChanges}>
            <Save className="w-4 h-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>
      </div>

      <Tabs defaultValue="ai-model" className="flex-1">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ai-model">Modelo IA</TabsTrigger>
          <TabsTrigger value="language">Idioma</TabsTrigger>
          <TabsTrigger value="rag">RAG</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
        </TabsList>

        <TabsContent value="ai-model" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Configuración del Modelo de IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Model Selection */}
              <div className="space-y-3">
                <Label>Modelo de IA</Label>
                <Select value={settings.selectedModel} onValueChange={(value) => updateSetting('selectedModel', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {aiModels.map((model) => (
                      <SelectItem key={model.id} value={model.id} disabled={!model.available}>
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <div className="font-medium">{model.name}</div>
                            <div className="text-xs text-muted-foreground">{model.description}</div>
                          </div>
                          {!model.available && (
                            <Badge variant="secondary">No disponible</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Temperature */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Creatividad (Temperature)</Label>
                  <span className="text-sm text-muted-foreground">{settings.temperature[0]}</span>
                </div>
                <Slider
                  value={settings.temperature}
                  onValueChange={(value) => updateSetting('temperature', value)}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  0 = Más determinista, 1 = Más creativo
                </p>
              </div>

              {/* Max Response Length */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Longitud Máxima de Respuesta</Label>
                  <span className="text-sm text-muted-foreground">{settings.maxResponseLength[0]} tokens</span>
                </div>
                <Slider
                  value={settings.maxResponseLength}
                  onValueChange={(value) => updateSetting('maxResponseLength', value)}
                  max={4096}
                  min={256}
                  step={256}
                  className="w-full"
                />
              </div>

              {/* Advanced Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Top P</Label>
                    <span className="text-sm text-muted-foreground">{settings.topP[0]}</span>
                  </div>
                  <Slider
                    value={settings.topP}
                    onValueChange={(value) => updateSetting('topP', value)}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Penalización de Presencia</Label>
                    <span className="text-sm text-muted-foreground">{settings.presencePenalty[0]}</span>
                  </div>
                  <Slider
                    value={settings.presencePenalty}
                    onValueChange={(value) => updateSetting('presencePenalty', value)}
                    max={2}
                    min={-2}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Test Model */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={testModel}>
                  <TestTube className="w-4 h-4 mr-2" />
                  Probar Configuración
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Custom System Prompt */}
          <Card>
            <CardHeader>
              <CardTitle>Prompt del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label>Instrucciones personalizadas para el asistente</Label>
                <Textarea
                  value={settings.systemPrompt}
                  onChange={(e) => updateSetting('systemPrompt', e.target.value)}
                  placeholder="Ingresa instrucciones personalizadas..."
                  className="min-h-24"
                />
                <p className="text-xs text-muted-foreground">
                  Estas instrucciones guiarán el comportamiento del asistente IA.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="language" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Languages className="w-5 h-5" />
                Configuración de Idioma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Idioma de respuestas</Label>
                <Select value={settings.responseLanguage} onValueChange={(value) => updateSetting('responseLanguage', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Detección automática de idioma</Label>
                  <p className="text-xs text-muted-foreground">
                    Detectar automáticamente el idioma de la pregunta
                  </p>
                </div>
                <Switch
                  checked={settings.autoDetectLanguage}
                  onCheckedChange={(checked) => updateSetting('autoDetectLanguage', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rag" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Configuración RAG
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Máximo de documentos</Label>
                  <span className="text-sm text-muted-foreground">{settings.maxDocuments}</span>
                </div>
                <Slider
                  value={[settings.maxDocuments]}
                  onValueChange={(value) => updateSetting('maxDocuments', value[0])}
                  max={500}
                  min={10}
                  step={10}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Tamaño de fragmento</Label>
                    <span className="text-sm text-muted-foreground">{settings.chunkSize} chars</span>
                  </div>
                  <Slider
                    value={[settings.chunkSize]}
                    onValueChange={(value) => updateSetting('chunkSize', value[0])}
                    max={2048}
                    min={256}
                    step={256}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Superposición</Label>
                    <span className="text-sm text-muted-foreground">{settings.overlapSize} chars</span>
                  </div>
                  <Slider
                    value={[settings.overlapSize]}
                    onValueChange={(value) => updateSetting('overlapSize', value[0])}
                    max={512}
                    min={0}
                    step={25}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Fragmentos a recuperar</Label>
                  <span className="text-sm text-muted-foreground">{settings.retrievalCount}</span>
                </div>
                <Slider
                  value={[settings.retrievalCount]}
                  onValueChange={(value) => updateSetting('retrievalCount', value[0])}
                  max={20}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Número de fragmentos relevantes a considerar para cada respuesta
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuración del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Guardado automático</Label>
                  <p className="text-xs text-muted-foreground">
                    Guardar conversaciones automáticamente
                  </p>
                </div>
                <Switch
                  checked={settings.autoSave}
                  onCheckedChange={(checked) => updateSetting('autoSave', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones</Label>
                  <p className="text-xs text-muted-foreground">
                    Recibir notificaciones del sistema
                  </p>
                </div>
                <Switch
                  checked={settings.enableNotifications}
                  onCheckedChange={(checked) => updateSetting('enableNotifications', checked)}
                />
              </div>

              <div className="space-y-3">
                <Label>Tema de la interfaz</Label>
                <Select value={settings.darkMode} onValueChange={(value) => updateSetting('darkMode', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Oscuro</SelectItem>
                    <SelectItem value="auto">Automático</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Configuración de Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Cifrado de almacenamiento</Label>
                  <p className="text-xs text-muted-foreground">
                    Cifrar datos locales y conversaciones
                  </p>
                </div>
                <Switch
                  checked={settings.encryptStorage}
                  onCheckedChange={(checked) => updateSetting('encryptStorage', checked)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Timeout de sesión</Label>
                  <span className="text-sm text-muted-foreground">{settings.sessionTimeout} minutos</span>
                </div>
                <Slider
                  value={[settings.sessionTimeout]}
                  onValueChange={(value) => updateSetting('sessionTimeout', value[0])}
                  max={120}
                  min={5}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Tiempo antes de cerrar sesión automáticamente por inactividad
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-medium">Privacidad de Datos</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Los documentos y conversaciones se procesan de forma segura. Los datos nunca se comparten con terceros.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}