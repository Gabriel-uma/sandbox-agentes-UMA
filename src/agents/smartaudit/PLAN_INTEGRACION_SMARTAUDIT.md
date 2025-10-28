# 📋 Plan de Integración - SmartAudit

## 💰 IMPORTANTE: Entorno de Prueba con Costo Mínimo

**🚨 ESTE ES UN DESPLIEGUE DE PRUEBA - MINIMIZAR COSTOS AL MÁXIMO**

### Estrategia de Costos Cero/Mínimos

1. **Gemini API**: Usar tier gratuito (15 requests/minuto)
2. **BigQuery**: Si no hay acceso, usar **SQLite local** o **PostgreSQL gratuito** (Supabase/Neon)
3. **Cloud Run**: Usar tier gratuito (2M requests/mes) o **Railway/Render** (planes gratuitos)
4. **Alternativa sin GCP**: Si no hay permisos, usar stack completamente gratuito:
   - Backend: **Railway.app** o **Render.com** (free tier)
   - Base de datos: **Supabase** (PostgreSQL gratuito)
   - IA: **Gemini API gratuita** o **Groq API** (100% gratis)

### ⚠️ Si No Tienes Permisos de GCP

**Opción alternativa 100% gratuita:**
- ✅ **Backend**: Railway.app o Render.com (free tier)
- ✅ **Base de datos**: Supabase PostgreSQL (free tier ilimitado)
- ✅ **IA**: Gemini API Free o Groq (Llama 3 gratis)
- ✅ **Storage**: Supabase Storage (1GB gratis)

---

## 🔍 Análisis del Proyecto

### Tipo de Proyecto
**Backend Python** basado en **Google ADK (Agent Development Kit)** con 3 agentes de IA especializados:
1. **Analista** - Análisis de datos médicos/administrativos con BigQuery
2. **Auditor** - Validación de pertinencia clínica basada en guías médicas
3. **Revisor** - Revisión administrativa de órdenes médicas

### Tecnologías Identificadas
- **Google ADK (Agent Development Kit)** v0.2.0
- **Google Generative AI (Gemini)** v0.8.5
- **Google GenAI** v1.12.1
- **Google Cloud BigQuery** v3.31.0
- **Python** con dotenv para variables de entorno

---

## 🚨 Requisitos Previos Críticos

### 1. Credenciales de Google Cloud Platform (GCP)
```bash
GOOGLE_API_KEY=<tu-api-key-de-gemini>
GOOGLE_GENAI_USE_VERTEXAI=<true/false>
```

### 2. Configuración de BigQuery
- **Project ID**: `uma-datascience-dev` (hardcodeado en el código)
- **Dataset**: `Bigquery_Dataset`
- **Tabla**: `evaluaciones_auditoria`
- Requiere permisos de lectura/escritura en BigQuery

### 3. Acceso a Vertex AI
- Los agentes están preparados para deployment en Vertex AI Reasoning Engines
- Requiere staging bucket: `gs://uma-datascience-dev-ia`

---

## 🎯 Arquitectura del Sistema

### Agentes Disponibles

#### 1️⃣ **Analista de Datos Médicos**
**Funcionalidad:**
- Convierte preguntas en lenguaje natural a consultas SQL
- Ejecuta queries en BigQuery
- Analiza datos de evaluaciones médicas

**Herramientas:**
- `generar_sql()` - Genera consultas SQL usando Gemini
- `ejecutar_sql()` - Ejecuta queries en BigQuery

**Schema de BigQuery:**
```sql
evaluaciones_auditoria (
  Fecha DATE,
  Practica_solicitada STRING,
  DNI INTEGER,
  Profesional STRING,
  Estado STRING  -- 'aprobado' | 'rechazado'
)
```

#### 2️⃣ **Auditor Clínico**
**Funcionalidad:**
- Valida pertinencia clínica de órdenes médicas
- Consulta guías de práctica clínica (enfocado en Dolor Lumbar)
- Verifica justificación clínica según evidencia

**Herramientas:**
- `consultar_guia_medica()` - Consulta a Gemini con guías clínicas

**Criterios de Evaluación:**
- Verificación de tratamiento previo (4-6 semanas)
- Coherencia entre diagnóstico y práctica solicitada
- Cumplimiento de guías clínicas oficiales

#### 3️⃣ **Revisor Administrativo**
**Funcionalidad:**
- Revisión documental de órdenes médicas
- Validación de requisitos administrativos
- Verificación de vigencia y completitud

**Criterios Verificados:**
1. Datos del paciente completos
2. Fecha de emisión (últimos 60 días)
3. Credencial/matrícula médica
4. Diagnóstico obligatorio
5. Práctica solicitada especificada
6. Indicaciones médicas detalladas
7. Validación de plan de afiliado

---

## 🛠️ Opciones de Integración

### ⚠️ **DESAFÍO PRINCIPAL**
Este es un **backend Python sin frontend**. El proyecto actual es **Vite + React + TypeScript**.

### 📌 Opciones Propuestas

#### **Opción 1: API Backend Separado (RECOMENDADO)**
Desplegar SmartAudit como servicio independiente y conectarlo vía API.

**Ventajas:**
- ✅ Separación de responsabilidades
- ✅ Escalabilidad independiente
- ✅ Reutilizable por otros frontends

**Pasos:**
1. Crear una API REST con FastAPI/Flask
2. Exponer endpoints para cada agente
3. Desplegar en Cloud Run o App Engine
4. Conectar desde React vía fetch/axios

#### **Opción 2: Despliegue en Vertex AI + Cloud Functions**
Usar la infraestructura existente de Vertex AI Reasoning Engines.

**Ventajas:**
- ✅ Serverless y automático
- ✅ Ya preparado en el código (líneas comentadas)
- ✅ Integración nativa con GCP

**Pasos:**
1. Descomentar código de deployment en `Auditor/agent.py`
2. Desplegar agentes a Vertex AI
3. Crear Cloud Functions como proxy
4. Invocar desde React

#### **Opción 3: Iframe Embed (NO RECOMENDADO)**
Crear un frontend simple en Python (Streamlit/Gradio) y embeber en iframe.

**Desventajas:**
- ❌ UX inconsistente
- ❌ Problemas de CORS
- ❌ Mantenimiento complejo

---

## 🚀 Plan de Implementación (Opción 1 - Recomendada)

### **Fase 1: Preparación del Backend** ⏱️ 2-3 horas

#### 1.1 Crear API REST con FastAPI
```python
# smartaudit_api/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sys
sys.path.append('./adk')

from Analista.agent import root_agent as analista
from Auditor.agent import root_agent as auditor
from Revisor.agent import root_agent as revisor

app = FastAPI()

class ConsultaAnalista(BaseModel):
    pregunta: str

@app.post("/api/smartaudit/analista")
async def consultar_analista(consulta: ConsultaAnalista):
    # Implementar lógica de runner
    pass

@app.post("/api/smartaudit/auditor")
async def evaluar_orden(orden: dict):
    # Implementar lógica de auditoría
    pass

@app.post("/api/smartaudit/revisor")
async def revisar_documento(documento: dict):
    # Implementar lógica de revisión
    pass
```

#### 1.2 Configurar Requirements
```txt
fastapi==0.115.0
uvicorn[standard]==0.32.0
google-adk==0.2.0
google-genai==1.12.1
google-generativeai==0.8.5
google-cloud-bigquery==3.31.0
python-dotenv==1.0.0
```

#### 1.3 Configurar Variables de Entorno
```bash
# .env
GOOGLE_API_KEY=<tu-api-key>
GOOGLE_GENAI_USE_VERTEXAI=false
GCP_PROJECT_ID=uma-datascience-dev
BIGQUERY_DATASET=Bigquery_Dataset
BIGQUERY_TABLE=evaluaciones_auditoria
```

#### 1.4 Crear Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

### **Fase 2: Despliegue en Cloud Run** ⏱️ 1-2 horas

#### 2.1 Build y Push del Container
```bash
# Build
gcloud builds submit --tag gcr.io/uma-datascience-dev/smartaudit-api

# Deploy
gcloud run deploy smartaudit-api \
  --image gcr.io/uma-datascience-dev/smartaudit-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=$GOOGLE_API_KEY
```

#### 2.2 Configurar CORS
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://tu-dominio-frontend.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### **Fase 3: Integración Frontend React** ⏱️ 3-4 horas

#### 3.1 Crear Servicio de API
```typescript
// src/lib/smartaudit-service.ts
const SMARTAUDIT_API_URL = import.meta.env.VITE_SMARTAUDIT_API_URL

export interface AnalisisRequest {
  pregunta: string
}

export interface AuditoriaRequest {
  orden: {
    paciente: string
    diagnostico: string
    practica: string
    indicaciones: string
  }
}

export const smartAuditService = {
  async consultarAnalista(request: AnalisisRequest) {
    const response = await fetch(`${SMARTAUDIT_API_URL}/api/smartaudit/analista`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })
    return response.json()
  },

  async evaluarOrden(request: AuditoriaRequest) {
    const response = await fetch(`${SMARTAUDIT_API_URL}/api/smartaudit/auditor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })
    return response.json()
  }
}
```

#### 3.2 Crear Componente SmartAudit
```tsx
// src/agents/smartaudit/SmartAuditAgent.tsx
import { useState } from 'react'
import { smartAuditService } from '@/lib/smartaudit-service'

export default function SmartAuditAgent() {
  const [activeTab, setActiveTab] = useState<'analista' | 'auditor' | 'revisor'>('analista')

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0f19] via-[#12152a] to-[#1a103f] p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">SmartAudit</h1>

        {/* Tabs para cada agente */}
        <div className="flex gap-4 mb-8">
          <button onClick={() => setActiveTab('analista')}>Analista</button>
          <button onClick={() => setActiveTab('auditor')}>Auditor</button>
          <button onClick={() => setActiveTab('revisor')}>Revisor</button>
        </div>

        {/* Interfaz específica por agente */}
        {activeTab === 'analista' && <AnalistaInterface />}
        {activeTab === 'auditor' && <AuditorInterface />}
        {activeTab === 'revisor' && <RevisorInterface />}
      </div>
    </div>
  )
}
```

#### 3.3 Actualizar index.tsx
```tsx
// src/agents/smartaudit/index.tsx
import SmartAuditAgent from './SmartAuditAgent'

export default SmartAuditAgent
```

#### 3.4 Agregar Variable de Entorno
```bash
# .env
VITE_SMARTAUDIT_API_URL=https://smartaudit-api-xxxxx.run.app
```

---

### **Fase 4: UI/UX Components** ⏱️ 4-6 horas

#### 4.1 Interfaz del Analista
- Chat conversacional para preguntas en lenguaje natural
- Visualización de resultados en tablas/gráficos
- Historial de consultas

#### 4.2 Interfaz del Auditor
- Formulario para ingresar datos de orden médica
- Visualización de evaluación clínica con bullets
- Estado de aprobación/rechazo con colores

#### 4.3 Interfaz del Revisor
- Upload de documentos (OCR opcional)
- Checklist visual de criterios verificados
- Feedback detallado de errores

---

## ⚙️ Dependencias Adicionales

### Frontend (package.json)
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",  // Para gestión de estado async
    "react-markdown": "^9.0.0"          // Para renderizar respuestas de IA
  }
}
```

### Backend (requirements.txt)
```txt
# Ya incluido en el proyecto
google-adk==0.2.0
google-genai==1.12.1
google-generativeai==0.8.5
google-cloud-bigquery==3.31.0

# A agregar
fastapi==0.115.0
uvicorn[standard]==0.32.0
python-multipart==0.0.12
```

---

## 🔐 Seguridad y Configuración

### Permisos Requeridos en GCP
```bash
# Service Account necesita:
- BigQuery Data Editor
- BigQuery Job User
- Vertex AI User
- Storage Object Viewer
```

### Variables de Entorno Críticas
```bash
# Backend
GOOGLE_API_KEY=<gemini-api-key>
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCP_PROJECT_ID=uma-datascience-dev

# Frontend
VITE_SMARTAUDIT_API_URL=https://smartaudit-api.run.app
```

---

## 📊 Estimación de Tiempo Total

| Fase | Tareas | Tiempo Estimado |
|------|--------|----------------|
| **Fase 1** | Preparación Backend API | 2-3 horas |
| **Fase 2** | Despliegue Cloud Run | 1-2 horas |
| **Fase 3** | Integración Frontend | 3-4 horas |
| **Fase 4** | UI/UX Components | 4-6 horas |
| **Testing** | Pruebas end-to-end | 2-3 horas |
| **Documentación** | README y guías | 1-2 horas |
| **TOTAL** | | **13-20 horas** |

---

## 🚧 Consideraciones y Limitaciones

### ⚠️ Puntos de Atención
1. **Project ID hardcodeado**: Cambiar `uma-datascience-dev` por variable de entorno
2. **Sin autenticación**: Implementar OAuth2 o API Keys
3. **Sin rate limiting**: Agregar throttling para evitar abuso
4. **Código con secciones comentadas**: Limpiar antes de deploy
5. **Dependencia de Gemini API**: Verificar quotas y costos

### 🔄 Mejoras Futuras
- [ ] Sistema de caché para consultas frecuentes
- [ ] Logs estructurados con Cloud Logging
- [ ] Métricas y monitoring con Cloud Monitoring
- [ ] Tests automatizados (pytest)
- [ ] CI/CD con Cloud Build
- [ ] Documentación OpenAPI/Swagger

---

## 📝 Checklist Pre-Deployment

- [ ] Verificar acceso a Google Cloud Platform
- [ ] Confirmar API Key de Gemini activa
- [ ] Validar permisos de BigQuery
- [ ] Crear Service Account con permisos necesarios
- [ ] Configurar staging bucket en GCS
- [ ] Revisar y actualizar requirements.txt
- [ ] Crear archivo .env con todas las variables
- [ ] Testear conexión a BigQuery localmente
- [ ] Verificar quotas de Gemini API
- [ ] Preparar estrategia de rollback

---

## 🎯 Próximos Pasos Recomendados

1. **Validar acceso a GCP** y credenciales necesarias
2. **Crear API REST** con FastAPI (Fase 1)
3. **Testear agentes localmente** antes de desplegar
4. **Desplegar a Cloud Run** (Fase 2)
5. **Construir interfaces React** (Fases 3 y 4)
6. **Integrar con showcase** existente
7. **Testing end-to-end** con datos reales

---

## 📞 Contacto y Soporte

Para dudas durante la implementación:
- Revisar documentación de [Google ADK](https://cloud.google.com/vertex-ai/docs/agent-builder)
- Consultar [BigQuery Python Client](https://cloud.google.com/python/docs/reference/bigquery/latest)
- Verificar [Gemini API docs](https://ai.google.dev/docs)

---

---

## 🎨 Diseño del Frontend - Basado en ChatRag

### Estructura Inspirada en ChatRag

El frontend de SmartAudit debe seguir el mismo patrón de diseño que ChatRag para mantener consistencia visual:

#### Componentes Principales (similar a ChatRag)

```
SmartAuditAgent/
├── Sidebar (izquierda)
│   ├── Logo y título "SmartAudit"
│   ├── Navegación entre agentes
│   │   ├── 📊 Analista
│   │   ├── 🔍 Auditor
│   │   └── ✅ Revisor
│   ├── Configuración
│   └── Theme Toggle
│
└── MainContent (derecha)
    ├── Header con título del agente activo
    └── Área de contenido específica por agente
```

### 📊 Vista del Analista (similar a enhanced-chat-interface.tsx)

**Diseño tipo Chat Conversacional:**

```tsx
// src/agents/smartaudit/components/analista-interface.tsx
import { useState } from 'react'
import { Send, BarChart3 } from 'lucide-react'
import { smartAuditService } from '@/lib/smartaudit-service'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  sqlQuery?: string
  results?: any[]
}

export function AnalistaInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await smartAuditService.consultarAnalista({
        pregunta: input
      })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.respuesta,
        timestamp: new Date(),
        sqlQuery: response.sql_generado,
        results: response.resultados
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Analista de Datos</h2>
            <p className="text-sm text-muted-foreground">
              Pregunta sobre datos médicos en lenguaje natural
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area (similar a ChatRag) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Analista de Datos Médicos</p>
            <p className="text-sm">
              Pregunta sobre estadísticas, profesionales, prácticas y estados
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.type === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>

              {/* Mostrar SQL generado */}
              {message.sqlQuery && (
                <div className="mt-3 p-3 bg-background/50 rounded border border-border">
                  <p className="text-xs text-muted-foreground mb-1">SQL Generado:</p>
                  <code className="text-xs font-mono">{message.sqlQuery}</code>
                </div>
              )}

              {/* Mostrar resultados en tabla */}
              {message.results && message.results.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm border border-border rounded">
                    <thead>
                      <tr className="bg-background/50">
                        {Object.keys(message.results[0]).map(key => (
                          <th key={key} className="px-2 py-1 text-left border-b border-border">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {message.results.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((value: any, j) => (
                            <td key={j} className="px-2 py-1 border-b border-border">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs mt-2 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area (similar a ChatRag) */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ej: ¿Cuántas prácticas se aprobaron este mes?"
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
```

### 🔍 Vista del Auditor (formulario + resultados)

```tsx
// src/agents/smartaudit/components/auditor-interface.tsx
import { useState } from 'react'
import { CheckCircle, XCircle, FileCheck } from 'lucide-react'
import { smartAuditService } from '@/lib/smartaudit-service'

interface EvaluacionResult {
  aprobado: boolean
  evaluacion: string
  criterios: Array<{ criterio: string; cumple: boolean }>
  notas?: string
}

export function AuditorInterface() {
  const [formData, setFormData] = useState({
    paciente: '',
    diagnostico: '',
    practica: '',
    indicaciones: ''
  })
  const [resultado, setResultado] = useState<EvaluacionResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await smartAuditService.evaluarOrden({ orden: formData })
      setResultado(response)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileCheck className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold">Auditor Clínico</h2>
        </div>
        <p className="text-muted-foreground">
          Validación de pertinencia clínica según guías médicas
        </p>
      </div>

      <div className="flex gap-6 flex-1">
        {/* Formulario */}
        <div className="w-1/2 space-y-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Datos de la Orden Médica</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Paciente</label>
                <input
                  type="text"
                  value={formData.paciente}
                  onChange={(e) => setFormData({...formData, paciente: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="Nombre completo"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Diagnóstico</label>
                <input
                  type="text"
                  value={formData.diagnostico}
                  onChange={(e) => setFormData({...formData, diagnostico: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="Ej: Lumbalgia crónica"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Práctica Solicitada</label>
                <input
                  type="text"
                  value={formData.practica}
                  onChange={(e) => setFormData({...formData, practica: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  placeholder="Ej: Resonancia de columna lumbar"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Indicaciones Médicas</label>
                <textarea
                  value={formData.indicaciones}
                  onChange={(e) => setFormData({...formData, indicaciones: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background h-24"
                  placeholder="Detalle clínico que justifica la práctica"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Evaluando...' : 'Evaluar Orden'}
              </button>
            </form>
          </div>
        </div>

        {/* Resultados */}
        <div className="w-1/2">
          {resultado && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                {resultado.aprobado ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-500" />
                )}
                <h3 className="text-xl font-semibold">
                  {resultado.aprobado ? 'Orden Aprobada' : 'Orden Rechazada'}
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Evaluación Clínica:</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {resultado.evaluacion}
                  </p>
                </div>

                {resultado.criterios && (
                  <div>
                    <h4 className="font-medium mb-2">Criterios Verificados:</h4>
                    <ul className="space-y-2">
                      {resultado.criterios.map((criterio, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          {criterio.cumple ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                          )}
                          <span>{criterio.criterio}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {resultado.notas && !resultado.aprobado && (
                  <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <h4 className="font-medium mb-2 text-destructive">
                      Notas para el médico:
                    </h4>
                    <p className="text-sm">{resultado.notas}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!resultado && (
            <div className="bg-card border border-border rounded-lg p-6 h-full flex items-center justify-center text-center">
              <div>
                <FileCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Complete el formulario y haga clic en "Evaluar Orden"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### ✅ Vista del Revisor (checklist administrativo)

```tsx
// src/agents/smartaudit/components/revisor-interface.tsx
import { useState } from 'react'
import { Upload, CheckSquare, XSquare } from 'lucide-react'

export function RevisorInterface() {
  // Similar al Auditor pero enfocado en criterios administrativos
  // Checklist visual de:
  // - Datos del paciente ✓
  // - Fecha vigente ✓
  // - Matrícula médica ✓
  // - Diagnóstico ✓
  // - Práctica especificada ✓
  // - Indicaciones médicas ✓
  // - Plan de afiliado ✓

  return (
    <div className="flex flex-col h-full bg-background p-6">
      {/* Similar estructura al Auditor pero con checklist visual */}
    </div>
  )
}
```

### 🎨 Sidebar SmartAudit

```tsx
// src/agents/smartaudit/components/smartaudit-sidebar.tsx
import { BarChart3, FileCheck, CheckSquare, Settings, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type AgentSection = 'analista' | 'auditor' | 'revisor' | 'settings' | 'help'

interface SmartAuditSidebarProps {
  activeSection: AgentSection
  onSectionChange: (section: AgentSection) => void
}

export function SmartAuditSidebar({ activeSection, onSectionChange }: SmartAuditSidebarProps) {
  const navigationItems = [
    { icon: BarChart3, label: 'Analista', section: 'analista' as const },
    { icon: FileCheck, label: 'Auditor', section: 'auditor' as const },
    { icon: CheckSquare, label: 'Revisor', section: 'revisor' as const },
  ]

  const settingsItems = [
    { icon: Settings, label: 'Configuración', section: 'settings' as const },
    { icon: HelpCircle, label: 'Ayuda', section: 'help' as const },
  ]

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-fuchsia-400 to-purple-500 rounded flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-sidebar-foreground">SmartAudit</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 overflow-y-auto">
        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <Button
              key={item.label}
              variant={activeSection === item.section ? 'secondary' : 'ghost'}
              className={`w-full justify-start gap-3 h-10 ${
                activeSection === item.section
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/50'
              }`}
              onClick={() => onSectionChange(item.section)}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-sm">{item.label}</span>
            </Button>
          ))}
        </nav>

        <div className="mt-8">
          <h3 className="text-xs font-semibold text-sidebar-foreground/60 mb-3 px-3 uppercase">
            Configuración
          </h3>
          <nav className="space-y-1">
            {settingsItems.map((item) => (
              <Button
                key={item.label}
                variant={activeSection === item.section ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-3 h-10"
                onClick={() => onSectionChange(item.section)}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm">{item.label}</span>
              </Button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
```

### 🎯 Componente Principal SmartAudit

```tsx
// src/agents/smartaudit/SmartAuditAgent.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { ArrowLeft } from 'lucide-react'
import { SmartAuditSidebar } from './components/smartaudit-sidebar'
import { AnalistaInterface } from './components/analista-interface'
import { AuditorInterface } from './components/auditor-interface'
import { RevisorInterface } from './components/revisor-interface'

type AgentSection = 'analista' | 'auditor' | 'revisor' | 'settings' | 'help'

export default function SmartAuditAgent() {
  const [activeSection, setActiveSection] = useState<AgentSection>('analista')
  const navigate = useNavigate()

  const renderSection = () => {
    switch (activeSection) {
      case 'analista':
        return <AnalistaInterface />
      case 'auditor':
        return <AuditorInterface />
      case 'revisor':
        return <RevisorInterface />
      case 'settings':
        return <div className="p-6">Configuración (TODO)</div>
      case 'help':
        return <div className="p-6">Ayuda (TODO)</div>
      default:
        return <AnalistaInterface />
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex h-screen bg-background relative">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-400 to-purple-500 text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la fábrica
        </button>

        {/* Sidebar */}
        <SmartAuditSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {renderSection()}
        </main>
      </div>
    </ThemeProvider>
  )
}
```

---

## 📝 Checklist de Implementación Frontend

- [ ] Crear estructura de carpetas en `/src/agents/smartaudit/components/`
- [ ] Implementar `smartaudit-sidebar.tsx` (basado en Sidebar de ChatRag)
- [ ] Implementar `analista-interface.tsx` (chat conversacional)
- [ ] Implementar `auditor-interface.tsx` (formulario + resultados)
- [ ] Implementar `revisor-interface.tsx` (checklist administrativo)
- [ ] Crear servicio `smartaudit-service.ts` para llamadas API
- [ ] Integrar con el componente principal `SmartAuditAgent.tsx`
- [ ] Agregar estilos y animaciones consistentes con ChatRag
- [ ] Agregar botón "Volver a la fábrica"
- [ ] Testing de UI con datos mock

---

**Documento generado:** 15 de octubre de 2025
**Versión:** 2.0
**Estado:** Listo para implementación con minimización de costos
