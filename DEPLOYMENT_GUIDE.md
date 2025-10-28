# Guía de Despliegue - Fábrica de Agentes AI Weekly

Esta guía te ayudará a desplegar tu fábrica de agentes completa en GitHub y GCP (Google Cloud Platform).

## Arquitectura de Despliegue

```
┌─────────────────────────────────────────────────────────────┐
│                         GitHub                               │
│              (Repositorio de código fuente)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Push trigger
                       │
         ┌─────────────▼────────────────┐
         │      Google Cloud Build       │
         │    (CI/CD automatizado)       │
         └─────────────┬─────────────────┘
                       │
         ┌─────────────┴─────────────────┐
         │                               │
         ▼                               ▼
┌────────────────────┐         ┌────────────────────┐
│   Cloud Run APIs   │         │  Vercel Frontend   │
│                    │         │                    │
│ • document-        │         │  • React + Vite    │
│   processor        │         │  • TypeScript      │
│ • rag-backend      │         │  • Tailwind CSS    │
│ • smartaudit-api   │         │                    │
└────────────────────┘         └────────────────────┘
         │
         │ Almacenamiento
         ▼
┌────────────────────┐
│  Cloud Storage +   │
│  BigQuery          │
└────────────────────┘
```

## Pre-requisitos

### 1. Herramientas instaladas
- [Git](https://git-scm.com/)
- [Node.js 18+](https://nodejs.org/)
- [Python 3.11+](https://www.python.org/)
- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install)
- [GitHub CLI (opcional)](https://cli.github.com/)

### 2. Acceso a servicios
- Cuenta de GitHub
- Proyecto de Google Cloud Platform (actual: `uma-tech-ai-lab`)
- Cuenta de Vercel conectada a GitHub

### 3. Permisos en GCP
```bash
# Verificar proyecto actual
gcloud config get-value project

# Verificar permisos
gcloud projects get-iam-policy uma-tech-ai-lab
```

## Paso 1: Preparar el Repositorio GitHub

### 1.1. Verificar el estado del repositorio
```bash
cd C:\Users\ivang\OneDrive\Documentos\code\agente-weekly-ai
git status
```

### 1.2. Agregar cambios al staging
```bash
# Revisar archivos modificados
git status

# Agregar todos los cambios
git add .

# O agregar selectivamente
git add src/agents/smartaudit/
git add .gitignore
git add DEPLOYMENT_GUIDE.md
```

### 1.3. Crear commit
```bash
git commit -m "feat: Add SmartAudit agent and deployment configuration

- Add SmartAudit backend API with FastAPI
- Add SmartAudit frontend components
- Configure Cloud Build for all services
- Update .gitignore for Python and logs
- Add comprehensive deployment guide"
```

### 1.4. Push a GitHub
```bash
git push origin main
```

## Paso 2: Configurar Google Cloud Platform

### 2.1. Configurar proyecto
```bash
# Establecer proyecto
gcloud config set project uma-tech-ai-lab

# Habilitar APIs necesarias
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable bigquery.googleapis.com
```

### 2.2. Crear repositorios en Artifact Registry

```bash
# Crear repositorio para SmartAudit
gcloud artifacts repositories create smartaudit-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="SmartAudit API container images"

# Verificar repositorios existentes
gcloud artifacts repositories list --location=us-central1
```

### 2.3. Configurar service accounts

```bash
# Ver service accounts existentes
gcloud iam service-accounts list

# Si necesitas crear uno nuevo para SmartAudit
gcloud iam service-accounts create smartaudit-sa \
  --display-name="SmartAudit Service Account"

# Dar permisos necesarios
gcloud projects add-iam-policy-binding uma-tech-ai-lab \
  --member="serviceAccount:smartaudit-sa@uma-tech-ai-lab.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

gcloud projects add-iam-policy-binding uma-tech-ai-lab \
  --member="serviceAccount:smartaudit-sa@uma-tech-ai-lab.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"
```

## Paso 3: Desplegar Backends en Cloud Run

### Opción A: Despliegue Manual

#### 3.1. SmartAudit API
```bash
cd src/agents/smartaudit/backend/smartaudit-api

# Build y push de imagen
gcloud builds submit --tag us-central1-docker.pkg.dev/uma-tech-ai-lab/smartaudit-repo/smartaudit-api:latest

# Deploy a Cloud Run
gcloud run deploy smartaudit-api \
  --image us-central1-docker.pkg.dev/uma-tech-ai-lab/smartaudit-repo/smartaudit-api:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --timeout 300
```

#### 3.2. RAG Backend
```bash
cd ../../rag-backend

gcloud builds submit --tag gcr.io/uma-tech-ai-lab/rag-agent-backend

gcloud run deploy rag-agent-backend \
  --image gcr.io/uma-tech-ai-lab/rag-agent-backend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1
```

#### 3.3. Document Processor
```bash
cd ../document-processor

gcloud builds submit --tag gcr.io/uma-tech-ai-lab/rag-document-processor

gcloud run deploy rag-document-processor \
  --image gcr.io/uma-tech-ai-lab/rag-document-processor \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1
```

### Opción B: Despliegue Automatizado con Cloud Build

```bash
# Desde la raíz del proyecto
./scripts/deploy-all-gcp.sh
```

### 3.4. Obtener URLs de los servicios
```bash
# SmartAudit API
gcloud run services describe smartaudit-api --region us-central1 --format 'value(status.url)'

# RAG Backend
gcloud run services describe rag-agent-backend --region us-central1 --format 'value(status.url)'

# Document Processor
gcloud run services describe rag-document-processor --region us-central1 --format 'value(status.url)'
```

## Paso 4: Configurar Variables de Entorno

### 4.1. Crear archivo .env.production
```bash
# En la raíz del proyecto
cp .env .env.production
```

Editar `.env.production` con las URLs de producción:
```env
# Variables de entorno para Producción

# URL del servicio Document Processor en Cloud Run
VITE_DOCUMENT_PROCESSOR_URL=https://rag-document-processor-117511395113.us-central1.run.app

# URL del servicio RAG Backend en Cloud Run
VITE_RAG_BACKEND_URL=https://rag-agent-backend-117511395113.us-central1.run.app

# URL del servicio SmartAudit en Cloud Run
VITE_SMARTAUDIT_API_URL=https://smartaudit-api-XXXXXXXXX-uc.a.run.app

# Project ID de GCP
VITE_PROJECT_ID=uma-tech-ai-lab

# Nombre del bucket de Cloud Storage
VITE_BUCKET_NAME=uma-tech-ai-lab-rag-documents
```

### 4.2. Configurar en Vercel

En la configuración de Vercel, agregar las mismas variables de entorno:
1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega cada variable con su valor

## Paso 5: Desplegar Frontend en Vercel

### Opción A: Desde Vercel Dashboard
1. Ve a [vercel.com](https://vercel.com)
2. Importa tu repositorio de GitHub
3. Configura las variables de entorno (Paso 4.2)
4. Deploy

### Opción B: Desde CLI
```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# O con variables de entorno desde archivo
vercel --prod --env-file .env.production
```

## Paso 6: Verificar Despliegue

### 6.1. Verificar backends
```bash
# SmartAudit
curl https://smartaudit-api-XXXXXXXXX-uc.a.run.app/health

# RAG Backend
curl https://rag-agent-backend-117511395113.us-central1.run.app/health

# Document Processor
curl https://rag-document-processor-117511395113.us-central1.run.app/health
```

### 6.2. Verificar frontend
Abre la URL de Vercel en el navegador y prueba:
- ✅ Carga de documentos
- ✅ Chat RAG
- ✅ Agente SmartAudit (Analista, Auditor, Revisor)

## Paso 7: Configurar CI/CD Automatizado (Opcional)

### 7.1. Conectar GitHub con Cloud Build

```bash
# Conectar repositorio
gcloud beta builds triggers create github \
  --repo-name=agent-ai-weekly \
  --repo-owner=RGabrielR \
  --branch-pattern="^main$" \
  --build-config=src/agents/smartaudit/backend/smartaudit-api/cloudbuild.yaml \
  --included-files="src/agents/smartaudit/backend/**"
```

### 7.2. Configurar triggers para cada servicio

Crear triggers para:
- `document-processor/cloudbuild.yaml`
- `rag-backend/cloudbuild.yaml`
- `src/agents/smartaudit/backend/smartaudit-api/cloudbuild.yaml`

## Monitoreo y Logs

### Ver logs de Cloud Run
```bash
# SmartAudit
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=smartaudit-api" --limit 50

# RAG Backend
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=rag-agent-backend" --limit 50
```

### Monitorear en consola
- [Cloud Run Services](https://console.cloud.google.com/run?project=uma-tech-ai-lab)
- [Cloud Build History](https://console.cloud.google.com/cloud-build/builds?project=uma-tech-ai-lab)
- [Logs Explorer](https://console.cloud.google.com/logs?project=uma-tech-ai-lab)

## Costos Estimados

Con la configuración actual (min-instances=0):
- **Cloud Run**: ~$5-20/mes (solo pagas por uso)
- **Cloud Storage**: ~$1-5/mes (dependiendo de documentos almacenados)
- **BigQuery**: Gratis hasta 10 GB almacenados, $5/TB consultado
- **Vercel**: Gratis para proyectos personales
- **Total estimado**: ~$10-30/mes en GCP

## Troubleshooting

### Error: Permission denied
```bash
# Verificar permisos de service account
gcloud projects get-iam-policy uma-tech-ai-lab
```

### Error: Image not found
```bash
# Verificar que el repositorio en Artifact Registry existe
gcloud artifacts repositories list
```

### Error: CORS en Cloud Run
Verificar que en `main.py` de cada backend están configurados los orígenes correctos:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tu-app.vercel.app",
        "http://localhost:5173"
    ],
    ...
)
```

## Comandos Útiles

```bash
# Ver todos los servicios de Cloud Run
gcloud run services list --region us-central1

# Ver builds recientes
gcloud builds list --limit 10

# Ver logs en tiempo real
gcloud run services logs tail smartaudit-api --region us-central1

# Eliminar un servicio
gcloud run services delete SERVICE_NAME --region us-central1

# Actualizar configuración de servicio
gcloud run services update smartaudit-api \
  --region us-central1 \
  --memory 1Gi \
  --max-instances 10
```

## Próximos Pasos

- [ ] Configurar autenticación con IAP (Identity-Aware Proxy)
- [ ] Implementar rate limiting
- [ ] Configurar alertas de monitoreo
- [ ] Configurar backup automático de BigQuery
- [ ] Implementar tests automatizados en CI/CD
- [ ] Configurar staging environment

## Recursos Adicionales

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)

---

**Última actualización**: 2025-10-28
**Versión**: 1.0.0
