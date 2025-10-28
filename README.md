# Fábrica de Agentes AI Weekly

Una plataforma completa de agentes de IA para análisis de documentos médicos, procesamiento RAG y auditoría inteligente.

## Características

### Agentes Implementados

#### 1. Sistema RAG (Retrieval-Augmented Generation)
- Carga y procesamiento de documentos (PDF, DOCX, TXT)
- Indexación vectorial en BigQuery
- Chat inteligente con contexto de documentos
- Búsqueda semántica avanzada

#### 2. SmartAudit - Sistema de Auditoría Médica
- **Analista de Datos**: Convierte preguntas en lenguaje natural a SQL
- **Auditor Clínico**: Valida pertinencia clínica según guías médicas
- **Revisor Administrativo**: Verifica completitud documental

## Arquitectura

```
Frontend (Vercel)          Backend (GCP Cloud Run)
┌─────────────────┐       ┌──────────────────────┐
│                 │       │                      │
│  React + Vite   │◄─────►│  Document Processor  │
│  TypeScript     │       │  (Python/FastAPI)    │
│  Tailwind CSS   │       │                      │
│                 │       ├──────────────────────┤
│                 │       │                      │
│                 │◄─────►│  RAG Backend         │
│                 │       │  (Python/FastAPI)    │
│                 │       │                      │
└─────────────────┘       ├──────────────────────┤
                          │                      │
                          │  SmartAudit API      │
                          │  (Python/FastAPI)    │
                          │                      │
                          └──────────────────────┘
                                     │
                          ┌──────────┴───────────┐
                          │                      │
                          │  Cloud Storage +     │
                          │  BigQuery            │
                          │                      │
                          └──────────────────────┘
```

## Inicio Rápido

### Prerrequisitos

- Node.js 18+
- Python 3.11+
- Google Cloud SDK (gcloud CLI)
- Cuenta de GitHub
- Proyecto en Google Cloud Platform

### Instalación Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/RGabrielR/agent-ai-weekly.git
cd agent-ai-weekly

# 2. Instalar dependencias del frontend
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# 4. Iniciar backend de SmartAudit (en una terminal separada)
cd src/agents/smartaudit/backend/smartaudit-api
pip install -r requirements.txt
python main.py

# 5. Iniciar frontend (en otra terminal)
cd ../../../..
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

## Despliegue en Producción

### Opción 1: Despliegue Automatizado

```bash
# 1. Configurar gcloud
gcloud config set project uma-tech-ai-lab

# 2. Desplegar todos los backends en Cloud Run
chmod +x scripts/deploy-all-gcp.sh
./scripts/deploy-all-gcp.sh

# 3. Configurar variables de entorno para producción
cp .env.production.example .env.production
# Actualiza las URLs con las proporcionadas por el script

# 4. Desplegar frontend en Vercel
npm i -g vercel
vercel --prod
```

### Opción 2: Despliegue Manual

Consulta la [Guía de Despliegue Completa](./DEPLOYMENT_GUIDE.md) para instrucciones detalladas.

## Estructura del Proyecto

```
agente-weekly-ai/
├── src/
│   ├── agents/
│   │   └── smartaudit/          # Agente SmartAudit
│   │       ├── backend/
│   │       │   └── smartaudit-api/
│   │       │       ├── main.py
│   │       │       ├── requirements.txt
│   │       │       └── Dockerfile
│   │       ├── components/
│   │       └── smartaudit-agent.tsx
│   ├── components/              # Componentes React
│   ├── lib/                     # Servicios y utilidades
│   └── pages/                   # Páginas de la aplicación
├── document-processor/          # Backend procesamiento de docs
├── rag-backend/                 # Backend RAG
├── scripts/                     # Scripts de despliegue
├── DEPLOYMENT_GUIDE.md          # Guía detallada de despliegue
└── README.md                    # Este archivo
```

## Tecnologías Utilizadas

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide Icons

### Backend
- FastAPI (Python)
- Uvicorn
- Pydantic
- Google Cloud Services (BigQuery, Cloud Storage)

### Infraestructura
- Google Cloud Run (Backends)
- Vercel (Frontend)
- Google Cloud Storage (Documentos)
- BigQuery (Datos y vectores)

## Variables de Entorno

### Desarrollo (.env)
```env
VITE_DOCUMENT_PROCESSOR_URL=http://localhost:8080
VITE_RAG_BACKEND_URL=http://localhost:8080
VITE_SMARTAUDIT_API_URL=http://localhost:8080
VITE_PROJECT_ID=uma-tech-ai-lab
VITE_BUCKET_NAME=uma-tech-ai-lab-rag-documents
```

### Producción (.env.production)
```env
VITE_DOCUMENT_PROCESSOR_URL=https://rag-document-processor-xxx.run.app
VITE_RAG_BACKEND_URL=https://rag-agent-backend-xxx.run.app
VITE_SMARTAUDIT_API_URL=https://smartaudit-api-xxx.run.app
VITE_PROJECT_ID=uma-tech-ai-lab
VITE_BUCKET_NAME=uma-tech-ai-lab-rag-documents
```

## Uso

### Sistema RAG

1. **Cargar Documentos**
   - Ve a la sección "Documentos"
   - Arrastra o selecciona archivos PDF, DOCX o TXT
   - Espera a que se procesen e indexen

2. **Chatear con Documentos**
   - Ve a la sección "Chat"
   - Haz preguntas sobre el contenido de tus documentos
   - El sistema usará RAG para proporcionar respuestas contextuales

### SmartAudit

1. **Analista de Datos**
   - Haz preguntas en lenguaje natural sobre datos médicos
   - Ejemplo: "¿Cuántas auditorías se aprobaron este mes?"

2. **Auditor Clínico**
   - Ingresa datos de la orden médica
   - Obtén evaluación de pertinencia clínica
   - Revisa criterios y recomendaciones

3. **Revisor Administrativo**
   - Carga documento médico
   - Verifica completitud de campos requeridos
   - Recibe lista de faltantes y observaciones

## API Endpoints

### Document Processor
- `POST /upload` - Cargar documento
- `GET /health` - Health check

### RAG Backend
- `POST /chat` - Chat con contexto RAG
- `GET /documents` - Listar documentos
- `GET /health` - Health check

### SmartAudit API
- `POST /api/smartaudit/analista` - Consulta al analista
- `POST /api/smartaudit/auditor` - Evaluación clínica
- `POST /api/smartaudit/revisor` - Revisión administrativa
- `GET /health` - Health check

## Monitoreo y Logs

```bash
# Ver logs de Cloud Run
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Monitorear servicio específico
gcloud run services logs tail smartaudit-api --region us-central1

# Ver métricas en consola
https://console.cloud.google.com/run?project=uma-tech-ai-lab
```

## Costos Estimados

Con la configuración actual (min-instances=0):
- **Cloud Run**: ~$5-20/mes (pago por uso)
- **Cloud Storage**: ~$1-5/mes
- **BigQuery**: Gratis hasta 10 GB, luego $5/TB
- **Vercel**: Gratis (plan hobby)
- **Total**: ~$10-30/mes

## Troubleshooting

### Backend no responde
```bash
# Verificar que el servicio está corriendo
gcloud run services list --region us-central1

# Ver logs
gcloud run services logs tail SERVICE_NAME --region us-central1
```

### Error CORS
Verifica que en los backends (`main.py`) estén configurados los orígenes correctos:
```python
allow_origins=[
    "https://tu-app.vercel.app",
    "http://localhost:5173"
]
```

### Variables de entorno no actualizadas
Si cambias variables de entorno:
1. Reinicia el servidor de desarrollo: `npm run dev`
2. En producción, redespliega: `vercel --prod`

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Roadmap

- [ ] Autenticación de usuarios
- [ ] Rate limiting en APIs
- [ ] Tests automatizados
- [ ] CI/CD con GitHub Actions
- [ ] Dashboard de analytics
- [ ] Más agentes especializados
- [ ] Integración con Google ADK

## Licencia

Este proyecto es privado y de uso interno.

## Soporte

Para reportar bugs o solicitar features, abre un issue en GitHub.

---

**Última actualización**: Octubre 2025
**Versión**: 1.0.0
**Mantenedor**: AI Weekly Team
