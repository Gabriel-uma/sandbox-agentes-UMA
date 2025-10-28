# 🚀 Guía de Despliegue SmartAudit en GCP

## ✅ Ventajas de Desplegar en GCP

1. **Ya tienes infraestructura existente** - Proyecto `uma-tech-ai-lab` con ChatRag desplegado
2. **BigQuery ya configurado** - Proyecto `uma-datascience-dev` con datos médicos
3. **Gemini API optimizada** - Mejor rendimiento dentro del ecosistema Google
4. **Free tier generoso** - Cloud Run: 2M requests/mes gratuitos
5. **ADK nativo** - Google Agent Development Kit funciona mejor en GCP
6. **Gestión centralizada** - Todo en una misma plataforma

---

## 💰 Estimación de Costos (Free Tier)

### ✅ Servicios Gratuitos Incluidos

| Servicio | Free Tier | Suficiente para |
|----------|-----------|----------------|
| **Cloud Run** | 2M requests/mes | ~66,000 requests/día |
| **Gemini API** | 15 RPM (1,500 requests/día) | Testing y demo |
| **BigQuery** | 1TB consultas/mes | Análisis ilimitado |
| **Cloud Build** | 120 builds/día | CI/CD completo |
| **Artifact Registry** | 500MB storage | Imágenes Docker |

### 💵 Costos Esperados (Post Free Tier)

- **Cloud Run**: ~$0.10 - $0.50 por día con tráfico moderado
- **Gemini API**: Considerar pasar a Vertex AI para mayor cuota
- **BigQuery**: Gratis hasta 1TB/mes de consultas
- **Total estimado**: **$3 - $15 USD/mes** en uso normal

---

## 🏗️ Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                        │
│         https://agente-weekly-ai.vercel.app                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloud Run: smartaudit-api                      │
│     https://smartaudit-api-xxx.us-central1.run.app         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Analista   │  │   Auditor    │  │   Revisor    │    │
│  │   Agent      │  │   Agent      │  │   Agent      │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
│                    ┌───────▼────────┐                      │
│                    │   Google ADK   │                      │
│                    │   + Gemini     │                      │
│                    └───────┬────────┘                      │
└────────────────────────────┼─────────────────────────────┘
                             │
        ┌────────────────────┴───────────────────┐
        │                                        │
        ▼                                        ▼
┌───────────────────┐                  ┌──────────────────┐
│    BigQuery       │                  │   Gemini API     │
│ uma-datascience   │                  │  (Vertex AI)     │
│      -dev         │                  │                  │
│                   │                  │  gemini-1.5-pro  │
└───────────────────┘                  └──────────────────┘
```

---

## 📋 Prerrequisitos

### 1. Verificar Acceso a GCP

```bash
# Verificar autenticación
gcloud auth list

# Verificar proyecto activo
gcloud config get-value project

# Si necesitas cambiar de proyecto
gcloud config set project uma-tech-ai-lab
```

### 2. Habilitar APIs Necesarias

```bash
# Habilitar servicios requeridos
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  bigquery.googleapis.com
```

### 3. Crear Service Account

```bash
# Crear service account para SmartAudit
gcloud iam service-accounts create smartaudit-sa \
  --display-name="SmartAudit Service Account"

# Asignar permisos necesarios
gcloud projects add-iam-policy-binding uma-datascience-dev \
  --member="serviceAccount:smartaudit-sa@uma-tech-ai-lab.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding uma-datascience-dev \
  --member="serviceAccount:smartaudit-sa@uma-tech-ai-lab.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

gcloud projects add-iam-policy-binding uma-tech-ai-lab \
  --member="serviceAccount:smartaudit-sa@uma-tech-ai-lab.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

---

## 🛠️ Paso 1: Preparar el Backend

### 1.1 Estructura del Proyecto

```bash
cd src/agents/smartaudit/backend
mkdir -p smartaudit-api
cd smartaudit-api
```

### 1.2 Crear API FastAPI

Crear archivo `main.py`:

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import sys

# Agregar ruta a los agentes
sys.path.append('./adk')

# Importar agentes (ajustar según estructura real)
from Analista.agent import root_agent as analista_agent
from Auditor.agent import root_agent as auditor_agent
from Revisor.agent import root_agent as revisor_agent

app = FastAPI(title="SmartAudit API", version="1.0.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://agente-weekly-ai.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MODELOS ====================

class ConsultaAnalista(BaseModel):
    pregunta: str

class AnalisisResponse(BaseModel):
    respuesta: str
    sql_generado: Optional[str] = None
    resultados: Optional[List[Dict]] = None

class OrdenMedica(BaseModel):
    paciente: str
    diagnostico: str
    practica: str
    indicaciones: str

class AuditoriaResponse(BaseModel):
    aprobado: bool
    evaluacion: str
    criterios: List[Dict[str, any]]
    notas: Optional[str] = None
    fuente: Optional[str] = None

class DocumentoMedico(BaseModel):
    paciente: str
    fecha: str
    matricula: str
    diagnostico: str
    practica: str
    indicaciones: str
    planAfiliado: str

class RevisionResponse(BaseModel):
    aprobado: bool
    resumen: str
    items: List[Dict[str, any]]
    faltantes: Optional[List[str]] = None
    notas: Optional[str] = None

# ==================== ENDPOINTS ====================

@app.get("/")
async def root():
    return {
        "service": "SmartAudit API",
        "version": "1.0.0",
        "status": "healthy",
        "endpoints": [
            "/api/smartaudit/analista",
            "/api/smartaudit/auditor",
            "/api/smartaudit/revisor"
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/api/smartaudit/analista", response_model=AnalisisResponse)
async def consultar_analista(consulta: ConsultaAnalista):
    """
    Endpoint para el Analista de Datos
    Convierte preguntas en lenguaje natural a consultas SQL
    """
    try:
        # TODO: Implementar lógica real del agente
        # Por ahora retornamos mock data

        # Ejemplo de uso del agente (descomentar cuando esté listo):
        # response = analista_agent.query(
        #     prompt=consulta.pregunta,
        #     session_id="web-session-" + str(uuid.uuid4())
        # )

        return AnalisisResponse(
            respuesta=f"Análisis para: {consulta.pregunta}\n\nResultados encontrados en la base de datos.",
            sql_generado="SELECT COUNT(*) as total FROM evaluaciones_auditoria WHERE Estado = 'aprobado'",
            resultados=[
                {"total": 142, "mes": "Enero"},
                {"total": 158, "mes": "Febrero"},
                {"total": 173, "mes": "Marzo"}
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/smartaudit/auditor", response_model=AuditoriaResponse)
async def evaluar_orden(orden: OrdenMedica):
    """
    Endpoint para el Auditor Clínico
    Valida pertinencia clínica según guías médicas
    """
    try:
        # TODO: Implementar lógica real del agente
        # Por ahora retornamos evaluación mock

        cumple_indicaciones = len(orden.indicaciones) > 50
        menciona_tratamiento = "semana" in orden.indicaciones.lower()

        return AuditoriaResponse(
            aprobado=cumple_indicaciones and menciona_tratamiento,
            evaluacion=(
                f"La orden médica para {orden.practica} cumple con los criterios de pertinencia clínica."
                if cumple_indicaciones and menciona_tratamiento
                else f"La orden médica para {orden.practica} no cumple con los criterios mínimos."
            ),
            criterios=[
                {
                    "criterio": "Diagnóstico específico documentado",
                    "cumple": len(orden.diagnostico) > 0
                },
                {
                    "criterio": "Indicaciones clínicas detalladas",
                    "cumple": cumple_indicaciones
                },
                {
                    "criterio": "Tratamiento previo documentado (4-6 semanas)",
                    "cumple": menciona_tratamiento
                }
            ],
            notas=(
                None if cumple_indicaciones and menciona_tratamiento
                else "Se requiere documentar tratamiento previo de 4-6 semanas."
            ),
            fuente="Ministerio de Salud - Guía Práctica Clínica 2015"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/smartaudit/revisor", response_model=RevisionResponse)
async def revisar_documento(documento: DocumentoMedico):
    """
    Endpoint para el Revisor Administrativo
    Valida completitud documental
    """
    try:
        # Validaciones administrativas
        from datetime import datetime, timedelta

        fecha_valida = False
        if documento.fecha:
            try:
                fecha_doc = datetime.fromisoformat(documento.fecha)
                fecha_limite = datetime.now() - timedelta(days=60)
                fecha_valida = fecha_doc > fecha_limite
            except:
                pass

        items = [
            {
                "campo": "Datos del Paciente",
                "completo": len(documento.paciente) > 5,
                "observacion": None if len(documento.paciente) > 5 else "Nombre incompleto"
            },
            {
                "campo": "Fecha de Emisión",
                "completo": fecha_valida,
                "observacion": None if fecha_valida else "Fecha fuera del rango válido"
            },
            {
                "campo": "Matrícula Médica",
                "completo": len(documento.matricula) > 0,
                "observacion": None if len(documento.matricula) > 0 else "Matrícula no especificada"
            },
            {
                "campo": "Diagnóstico",
                "completo": len(documento.diagnostico) > 0,
                "observacion": None if len(documento.diagnostico) > 0 else "Diagnóstico faltante"
            },
            {
                "campo": "Práctica Solicitada",
                "completo": len(documento.practica) > 0,
                "observacion": None if len(documento.practica) > 0 else "Práctica no especificada"
            },
            {
                "campo": "Indicaciones Médicas",
                "completo": len(documento.indicaciones) > 30,
                "observacion": None if len(documento.indicaciones) > 30 else "Indicaciones insuficientes"
            },
            {
                "campo": "Plan de Afiliado",
                "completo": len(documento.planAfiliado) > 0,
                "observacion": None if len(documento.planAfiliado) > 0 else "Plan no especificado"
            }
        ]

        todos_completos = all(item["completo"] for item in items)
        faltantes = [item["campo"] for item in items if not item["completo"]]
        completados = len([item for item in items if item["completo"]])
        total = len(items)

        return RevisionResponse(
            aprobado=todos_completos,
            resumen=(
                f"Documentación completa. Todos los {total} requisitos verificados."
                if todos_completos
                else f"Documentación incompleta. {completados} de {total} campos verificados."
            ),
            items=items,
            faltantes=faltantes if faltantes else None,
            notas=(
                "Documento listo para auditoría clínica."
                if todos_completos
                else "Complete los campos faltantes antes de continuar."
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

### 1.3 Crear requirements.txt

```txt
fastapi==0.115.0
uvicorn[standard]==0.32.0
pydantic==2.9.2
python-multipart==0.0.12
google-adk==0.2.0
google-genai==1.12.1
google-generativeai==0.8.5
google-cloud-bigquery==3.31.0
python-dotenv==1.0.0
```

### 1.4 Crear Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema si son necesarias
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código de la aplicación
COPY . .

# Exponer puerto
EXPOSE 8080

# Comando para ejecutar
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### 1.5 Crear .dockerignore

```
__pycache__
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.env
.git
.gitignore
README.md
.pytest_cache
```

---

## 🚀 Paso 2: Desplegar en Cloud Run

### 2.1 Build y Deploy (Opción Automática)

```bash
# Desde el directorio smartaudit-api/
gcloud run deploy smartaudit-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account smartaudit-sa@uma-tech-ai-lab.iam.gserviceaccount.com \
  --set-env-vars GOOGLE_CLOUD_PROJECT=uma-datascience-dev \
  --max-instances 5 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300
```

### 2.2 Build y Deploy (Opción Manual con Artifact Registry)

```bash
# 1. Crear repositorio en Artifact Registry (solo primera vez)
gcloud artifacts repositories create smartaudit-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="SmartAudit API containers"

# 2. Configurar Docker para autenticación
gcloud auth configure-docker us-central1-docker.pkg.dev

# 3. Build de la imagen
docker build -t us-central1-docker.pkg.dev/uma-tech-ai-lab/smartaudit-repo/smartaudit-api:latest .

# 4. Push a Artifact Registry
docker push us-central1-docker.pkg.dev/uma-tech-ai-lab/smartaudit-repo/smartaudit-api:latest

# 5. Deploy a Cloud Run
gcloud run deploy smartaudit-api \
  --image us-central1-docker.pkg.dev/uma-tech-ai-lab/smartaudit-repo/smartaudit-api:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --service-account smartaudit-sa@uma-tech-ai-lab.iam.gserviceaccount.com
```

### 2.3 Configurar Variables de Entorno

```bash
# Actualizar service con variables de entorno
gcloud run services update smartaudit-api \
  --region us-central1 \
  --set-env-vars \
GOOGLE_CLOUD_PROJECT=uma-datascience-dev,\
BIGQUERY_DATASET=Bigquery_Dataset,\
BIGQUERY_TABLE=evaluaciones_auditoria,\
ENVIRONMENT=production
```

---

## 🔐 Paso 3: Configurar Seguridad y CORS

### 3.1 Obtener URL del Servicio

```bash
gcloud run services describe smartaudit-api \
  --region us-central1 \
  --format 'value(status.url)'
```

Ejemplo de salida: `https://smartaudit-api-abc123-uc.a.run.app`

### 3.2 Configurar Custom Domain (Opcional)

```bash
# Mapear dominio personalizado
gcloud run domain-mappings create \
  --service smartaudit-api \
  --domain smartaudit-api.umasalud.com \
  --region us-central1
```

---

## 🌐 Paso 4: Conectar Frontend

### 4.1 Actualizar Variables de Entorno Frontend

Editar `.env`:

```bash
VITE_SMARTAUDIT_API_URL=https://smartaudit-api-abc123-uc.a.run.app
```

### 4.2 Actualizar Servicio (ya implementado)

El archivo `src/lib/smartaudit-service.ts` ya está configurado para usar `import.meta.env.VITE_SMARTAUDIT_API_URL`.

### 4.3 Redesplegar Frontend en Vercel

```bash
# Agregar variable de entorno en Vercel Dashboard
# o via CLI:
vercel env add VITE_SMARTAUDIT_API_URL production

# Valor: https://smartaudit-api-abc123-uc.a.run.app

# Redesplegar
vercel --prod
```

---

## 📊 Paso 5: Monitoreo y Logs

### 5.1 Ver Logs en Tiempo Real

```bash
gcloud run services logs tail smartaudit-api \
  --region us-central1 \
  --format "table(timestamp, severity, textPayload)"
```

### 5.2 Métricas en Cloud Console

Ir a: https://console.cloud.google.com/run/detail/us-central1/smartaudit-api/metrics

Monitorear:
- Request count
- Request latency
- Container CPU utilization
- Container memory utilization
- Error rate

### 5.3 Configurar Alertas

```bash
# Crear alerta para errores
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="SmartAudit API Errors" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=60s
```

---

## 🧪 Paso 6: Testing

### 6.1 Test Health Check

```bash
curl https://smartaudit-api-abc123-uc.a.run.app/health
```

### 6.2 Test Analista Endpoint

```bash
curl -X POST https://smartaudit-api-abc123-uc.a.run.app/api/smartaudit/analista \
  -H "Content-Type: application/json" \
  -d '{"pregunta": "¿Cuántas prácticas se aprobaron este mes?"}'
```

### 6.3 Test Auditor Endpoint

```bash
curl -X POST https://smartaudit-api-abc123-uc.a.run.app/api/smartaudit/auditor \
  -H "Content-Type: application/json" \
  -d '{
    "paciente": "Juan Pérez",
    "diagnostico": "Lumbalgia crónica",
    "practica": "Resonancia magnética lumbar",
    "indicaciones": "Paciente con dolor lumbar de 8 semanas de evolución. Tratamiento conservador con AINEs y fisioterapia durante 6 semanas sin mejoría significativa."
  }'
```

---

## 🔄 Actualizaciones Futuras

### Redesplegar con Cambios

```bash
# Opción 1: Deploy directo desde código
gcloud run deploy smartaudit-api --source .

# Opción 2: Build nueva imagen y deploy
docker build -t us-central1-docker.pkg.dev/uma-tech-ai-lab/smartaudit-repo/smartaudit-api:v2 .
docker push us-central1-docker.pkg.dev/uma-tech-ai-lab/smartaudit-repo/smartaudit-api:v2
gcloud run deploy smartaudit-api --image us-central1-docker.pkg.dev/uma-tech-ai-lab/smartaudit-repo/smartaudit-api:v2
```

### Rollback a Versión Anterior

```bash
# Listar revisiones
gcloud run revisions list --service smartaudit-api --region us-central1

# Rollback
gcloud run services update-traffic smartaudit-api \
  --to-revisions REVISION_NAME=100 \
  --region us-central1
```

---

## 📝 Checklist Final

- [ ] Service Account creado con permisos correctos
- [ ] APIs habilitadas (Run, Build, BigQuery, AI Platform)
- [ ] Backend desplegado en Cloud Run
- [ ] CORS configurado correctamente
- [ ] Variables de entorno configuradas
- [ ] Health check funcionando
- [ ] Endpoints testeados
- [ ] Frontend conectado y funcionando
- [ ] Logs y métricas configuradas
- [ ] Alertas creadas (opcional)
- [ ] Documentación actualizada

---

## 💡 Tips y Mejores Prácticas

1. **Usar Secrets Manager** para API keys sensibles
2. **Configurar límites de rate** en Cloud Armor
3. **Habilitar Cloud CDN** para cachear respuestas
4. **Usar Cloud Scheduler** para warm-up y evitar cold starts
5. **Implementar circuit breaker** para llamadas a BigQuery
6. **Agregar retry logic** para llamadas a Gemini API
7. **Usar Cloud Trace** para debugging de latencia
8. **Configurar budgets** en Billing para controlar costos

---

**Última actualización:** 15 de octubre de 2025
**Versión:** 1.0
**Proyecto:** uma-tech-ai-lab / uma-datascience-dev
