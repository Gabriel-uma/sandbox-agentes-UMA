# Plan de Implementación - Sistema RAG Completo

## 📋 Estado Actual

### ✅ Completado
- Frontend React/TypeScript con UI completa
- Infraestructura Terraform configurada (con service account ya definida)
- Variables de entorno Terraform configuradas (`project_id: uma-tech-ai-lab`)
- Permisos IAM disponibles: `roles/resourcemanager.projectIamAdmin`

### ❌ Faltante
- Servicios backend Python (document-processor y rag-backend)
- Dockerfiles para ambos servicios
- Imágenes Docker en GCR
- Cliente real en frontend (actualmente usa mocks)
- Archivo `.env` para frontend

---

## 🎯 Objetivos del Plan

1. Implementar servicios backend Python con endpoints funcionales
2. Crear Dockerfiles optimizados para producción
3. Actualizar Terraform para usar imágenes reales
4. Conectar frontend con servicios reales
5. Generar configuración de variables de entorno

---

## 🔍 Análisis de Service Account

### Service Account ya definida en Terraform (main.tf:51-57)
```hcl
resource "google_service_account" "rag_agent_sa" {
  account_id   = "rag-agent-service"
  display_name = "RAG Agent Service Account"
  description  = "Service account para el agente RAG con permisos mínimos necesarios"
}
```

### Roles asignados (main.tf:326-348)
| Role | Propósito | Justificación |
|------|-----------|---------------|
| `roles/storage.objectAdmin` | Leer/escribir documentos en GCS | Necesario para subir documentos procesados y acceder a documentos indexados |
| `roles/bigquery.dataEditor` | Escribir en BigQuery | Necesario para guardar historial de conversaciones |
| `roles/aiplatform.user` | Usar Vertex AI | Necesario para generar embeddings y realizar búsquedas vectoriales |
| `roles/logging.logWriter` | Escribir logs | Necesario para monitoreo y debugging |

**✅ Principio de mínimos privilegios aplicado**: Solo permisos necesarios para operación.

---

## 🐍 Implementación Backend

### 1. Document Processor Service

#### Funcionalidades
- Recibir archivos (PDF, DOCX, TXT)
- Extraer texto usando bibliotecas Python
- Generar embeddings con Vertex AI Embeddings
- Subir documento a Cloud Storage
- Indexar embeddings en Vertex AI Vector Search

#### Stack tecnológico propuesto
- **Framework**: Flask (simple y ligero)
- **Extracción de texto**: PyPDF2, python-docx, textract
- **GCP SDKs**: google-cloud-storage, google-cloud-aiplatform
- **Server**: Gunicorn (producción)

#### Endpoints
```
POST /upload
- Input: multipart/form-data con archivo
- Output: {"status": "success", "document_id": "...", "message": "..."}

GET /health
- Output: {"status": "healthy", "service": "document-processor"}
```

#### Variables de entorno requeridas
```
PROJECT_ID=uma-tech-ai-lab
BUCKET_NAME=uma-tech-ai-lab-rag-documents
INDEX_ENDPOINT=<obtenido de terraform output>
DEPLOYED_INDEX_ID=rag-deployed-index
REGION=us-central1
```

---

### 2. RAG Backend Service

#### Funcionalidades
- Recibir preguntas del usuario
- Generar embedding de la pregunta
- Buscar documentos similares en Vertex AI Vector Search
- Recuperar contexto relevante de GCS
- Generar respuesta usando Vertex AI Gemini/PaLM
- Guardar conversación en BigQuery
- Retornar respuesta + fuentes

#### Stack tecnológico propuesto
- **Framework**: Flask
- **LLM**: Vertex AI Generative AI (Gemini Pro o PaLM 2)
- **GCP SDKs**: google-cloud-aiplatform, google-cloud-bigquery, google-cloud-storage
- **Server**: Gunicorn

#### Endpoints
```
POST /query
- Input: {"question": "...", "conversation_id": "..." (opcional)}
- Output: {"answer": "...", "sources": [...], "conversation_id": "...", "confidence": 0.85}

GET /conversations/{conversation_id}
- Output: {"conversation_id": "...", "messages": [...]}

GET /health
- Output: {"status": "healthy", "service": "rag-backend"}
```

#### Variables de entorno requeridas
```
PROJECT_ID=uma-tech-ai-lab
BUCKET_NAME=uma-tech-ai-lab-rag-documents
INDEX_ENDPOINT=<obtenido de terraform output>
DEPLOYED_INDEX_ID=rag-deployed-index
DATASET_ID=rag_chat_history
TABLE_ID=conversations
REGION=us-central1
MODEL_NAME=gemini-pro (o text-bison)
```

---

## 🐳 Dockerfiles

### Document Processor
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema para extracción de texto
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080
EXPOSE $PORT

CMD exec gunicorn --bind :$PORT --workers 2 --threads 4 --timeout 300 app:app
```

### RAG Backend
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080
EXPOSE $PORT

CMD exec gunicorn --bind :$PORT --workers 2 --threads 4 --timeout 300 app:app
```

---

## 🔧 Actualización Terraform

### Cambios necesarios en main.tf

#### Cloud Run - Document Processor (línea ~230)
**Actual:**
```hcl
image = "gcr.io/cloudrun/hello"  # Placeholder
```

**Propuesto:**
```hcl
image = "gcr.io/${var.project_id}/document-processor:${var.docker_image_tag}"
```

#### Cloud Run - RAG Backend (línea ~280)
**Actual:**
```hcl
image = "gcr.io/cloudrun/hello"  # Placeholder
```

**Propuesto:**
```hcl
image = "gcr.io/${var.project_id}/rag-backend:${var.docker_image_tag}"
```

#### Variables de entorno
Agregar a ambos servicios Cloud Run:
```hcl
env {
  name  = "PROJECT_ID"
  value = var.project_id
}
env {
  name  = "BUCKET_NAME"
  value = google_storage_bucket.documents_bucket.name
}
env {
  name  = "REGION"
  value = var.region
}
# ... más variables según el servicio
```

---

## 🌐 Actualización Frontend

### Cambios en src/lib/rag-service.ts

**Estrategia**: Reemplazar métodos mock con llamadas HTTP reales usando `fetch`.

#### Variables de entorno (.env)
```env
VITE_DOCUMENT_PROCESSOR_URL=https://rag-document-processor-xxx-uc.a.run.app
VITE_RAG_BACKEND_URL=https://rag-agent-backend-xxx-uc.a.run.app
VITE_PROJECT_ID=uma-tech-ai-lab
VITE_BUCKET_NAME=uma-tech-ai-lab-rag-documents
```

#### Métodos a actualizar
1. `uploadDocument()` → POST a Document Processor `/upload`
2. `queryDocuments()` → POST a RAG Backend `/query`
3. `getChatHistory()` → GET a RAG Backend `/conversations/{id}`
4. `healthCheck()` → GET a ambos servicios `/health`

---

## 📦 Estructura de Directorios Propuesta

```
agente-weekly-ai/
├── document-processor/
│   ├── app.py                 # Flask app principal
│   ├── requirements.txt       # Dependencias Python
│   ├── Dockerfile            # Dockerfile para build
│   ├── .dockerignore
│   └── utils/
│       ├── text_extractor.py  # Extracción de texto
│       ├── embeddings.py      # Generación de embeddings
│       └── storage.py         # Interacción con GCS
├── rag-backend/
│   ├── app.py                 # Flask app principal
│   ├── requirements.txt       # Dependencias Python
│   ├── Dockerfile            # Dockerfile para build
│   ├── .dockerignore
│   └── utils/
│       ├── vector_search.py   # Búsqueda en Vertex AI
│       ├── llm.py            # Generación con Gemini/PaLM
│       └── bigquery.py       # Persistencia en BigQuery
├── infra/                     # Terraform (ya existe)
├── src/                       # Frontend React (ya existe)
└── .env                       # Variables de entorno frontend
```

---

## ⚠️ Preguntas de Validación

### 1. Modelo de Embeddings
**Pregunta**: ¿Qué modelo de embeddings prefieres usar?
- **Opción A**: Vertex AI `textembedding-gecko@003` (768 dims, optimizado para español/inglés)
- **Opción B**: Sentence Transformers vía API custom
- **Opción C**: OpenAI embeddings (requiere API key adicional)

**Recomendación**: Opción A (nativo de GCP, sin costos externos)

---

### 2. Modelo LLM para Respuestas
**Pregunta**: ¿Qué modelo usar para generar respuestas?
- **Opción A**: `gemini-1.5-flash` (rápido, económico)
- **Opción B**: `gemini-1.5-pro` (más capaz, costoso)
- **Opción C**: `text-bison@002` (PaLM 2, legacy)

**Recomendación**: Opción A para dev, Opción B para producción

---

### 3. Chunking Strategy
**Pregunta**: ¿Cómo dividir documentos largos?
- **Opción A**: Fixed size (ej. 500 tokens con overlap de 50)
- **Opción B**: Semantic chunking (dividir por párrafos/secciones)
- **Opción C**: Sliding window (overlap mayor para mejor contexto)

**Recomendación**: Opción A (más simple para MVP)

---

### 4. Manejo de Tipos de Archivo
**Pregunta**: ¿Qué tipos de archivo soportar inicialmente?
- **Opción A**: Solo PDF y TXT (más simple)
- **Opción B**: PDF, TXT, DOCX (requiere más dependencias)
- **Opción C**: PDF, TXT, DOCX, PPTX, HTML (complejo)

**Recomendación**: Opción B (balance entre utilidad y complejidad)

---

### 5. Despliegue de Imágenes Docker
**Pregunta**: ¿Construir imágenes localmente o usar Cloud Build?
- **Opción A**: Local + `docker push` (más rápido para desarrollo)
- **Opción B**: Cloud Build automático (mejor para CI/CD)

**Recomendación**: Opción A para MVP, migrar a Opción B después

---

### 6. Autenticación Cloud Run
**Pregunta**: ¿Los servicios deben requerir autenticación?
- **Opción A**: `allow-unauthenticated` (público, más simple)
- **Opción B**: Require authentication (más seguro, requiere tokens)

**Recomendación**: Opción A para dev, Opción B para producción

---

### 7. CORS en Frontend
**Pregunta**: ¿Desde dónde se accederá al frontend?
- **Opción A**: `localhost` para desarrollo local
- **Opción B**: Dominio específico (ej. `https://app.uma-health.com`)
- **Opción C**: Ambos

**Recomendación**: Opción C (configurar ambos en `allowed_cors_origins`)

---

## 🚀 Plan de Ejecución (Orden Propuesto)

### Fase 1: Backend Implementation
1. ✅ Crear estructura de directorios
2. ✅ Implementar `document-processor/app.py` con endpoints básicos
3. ✅ Implementar `rag-backend/app.py` con endpoints básicos
4. ✅ Crear `requirements.txt` para ambos servicios
5. ✅ Crear Dockerfiles

### Fase 2: Docker & GCR
6. ✅ Construir imagen `document-processor`
7. ✅ Construir imagen `rag-backend`
8. ✅ Hacer push a GCR

### Fase 3: Terraform
9. ✅ Actualizar `main.tf` con imágenes reales
10. ✅ Agregar variables de entorno a Cloud Run services
11. ✅ Ejecutar `terraform plan` para validar
12. ✅ Ejecutar `terraform apply`

### Fase 4: Frontend Integration
13. ✅ Crear archivo `.env` con outputs de Terraform
14. ✅ Actualizar `src/lib/rag-service.ts` con cliente real
15. ✅ Probar integración end-to-end

### Fase 5: Testing & Validation
16. ✅ Subir documento de prueba
17. ✅ Hacer query al RAG
18. ✅ Verificar guardado en BigQuery
19. ✅ Validar logs en Cloud Logging

---

## 📊 Estimación de Costos (Aproximado)

| Servicio | Uso estimado | Costo mensual |
|----------|--------------|---------------|
| Cloud Run (2 servicios) | ~100 requests/día | $5-10 |
| Cloud Storage | 10 GB | $0.20 |
| BigQuery | 1 GB datos + queries | $1-2 |
| Vertex AI Embeddings | 1M tokens/mes | $0.025 |
| Vertex AI Gemini Flash | 1M tokens/mes | $0.075 |
| **Total estimado** | | **~$6-13/mes** |

---

## ✅ Checklist de Validación

Antes de proceder con la implementación, por favor valida:

- [ ] **Modelo de embeddings**: ¿Vertex AI `textembedding-gecko@003`?
- [ ] **Modelo LLM**: ¿Gemini 1.5 Flash para dev?
- [ ] **Tipos de archivo**: ¿PDF, TXT, DOCX?
- [ ] **Chunking**: ¿Fixed size 500 tokens?
- [ ] **Autenticación**: ¿`allow-unauthenticated` para dev?
- [ ] **Build strategy**: ¿Local docker build + push?
- [ ] **CORS origins**: ¿Incluir localhost + dominio futuro?

---

## 🎯 Próximo Paso

Una vez validadas las decisiones arriba, procederé con:
1. Crear estructura de directorios para backend
2. Implementar servicios Python con la configuración validada
3. Crear Dockerfiles
4. Actualizar Terraform
5. Integrar frontend

**¿Estás de acuerdo con las recomendaciones? ¿Algún cambio antes de comenzar la implementación?**
