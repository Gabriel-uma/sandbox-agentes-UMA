# Problema: Gemini no disponible en Vertex AI

## Resumen del Error

El servicio RAG Backend desplegado en Cloud Run no puede usar ningún modelo Gemini de Vertex AI. Todos los intentos resultan en error 404:

```
404 Publisher Model `projects/uma-tech-ai-lab/locations/us-central1/publishers/google/models/[MODEL_NAME]` was not found or your project does not have access to it.
```

## Estado Actual

- **Proyecto GCP**: `uma-tech-ai-lab`
- **Región**: `us-central1`
- **Servicio**: `rag-agent-backend` (Cloud Run)
- **Service Account**: `rag-agent-service@uma-tech-ai-lab.iam.gserviceaccount.com`
- **URL del servicio**: https://rag-agent-backend-117511395113.us-central1.run.app

## APIs Habilitadas

✅ Vertex AI API (`aiplatform.googleapis.com`)
✅ Generative Language API (`generativelanguage.googleapis.com`)

## Permisos Verificados

✅ Service account tiene el rol `Vertex AI User` (`roles/aiplatform.user`)

## Configuración del Código

### Archivo: `rag-backend/utils/llm.py`

```python
import vertexai
from vertexai.generative_models import GenerativeModel

class LLMGenerator:
    def __init__(self):
        self.project_id = os.environ.get('PROJECT_ID')  # uma-tech-ai-lab
        self.region = os.environ.get('REGION', 'us-central1')
        self.model_name = os.environ.get('MODEL_NAME', 'gemini-1.5-flash-001')

        vertexai.init(project=self.project_id, location=self.region)
        self.model = GenerativeModel(self.model_name)
```

### Dependencias

```
google-cloud-aiplatform==1.70.0
```

## Modelos Intentados

Todos fallan con 404:

1. ❌ `gemini-1.5-flash-001`
2. ❌ `gemini-1.5-flash-002`
3. ❌ `gemini-1.5-pro`
4. ❌ `gemini-1.5-pro-002`
5. ❌ `gemini-2.5-flash-preview-0925`
6. ❌ `gemini-pro`

## Observaciones Importantes

### ✅ Funciona en la UI de Google Cloud

En https://console.cloud.google.com/vertex-ai/generative/language/create/text?project=uma-tech-ai-lab

- **SÍ** se puede usar Gemini
- Modelo mostrado: `gemini-2.5-flash-preview-09-2025`
- Las consultas funcionan correctamente

### ❌ NO funciona desde código/API

Todos los intentos programáticos fallan con 404.

## Logs del Error

```
File "/app/utils/llm.py", line 103, in generate_content
  response = self.model.generate_content(...)
...
google.api_core.exceptions.NotFound: 404 Publisher Model `projects/uma-tech-ai-lab/locations/us-central1/publishers/google/models/gemini-1.5-flash-001` was not found or your project does not have access to it.
```

## Arquitectura

```
Frontend (Vite + React)
    ↓ (localhost:8080/rag-backend/query)
NGINX Proxy (Docker)
    ↓ (https://rag-agent-backend-117511395113.us-central1.run.app/query)
Cloud Run (rag-agent-backend)
    ↓
Vertex AI Gemini ❌ [FALLA AQUÍ]
```

## Pruebas con cURL

### 1. Probar el endpoint directamente (con proxy local)

```bash
curl -X POST http://localhost:8080/rag-backend/query \
  -H "Content-Type: application/json" \
  -d '{"question":"hola","top_k":3}'
```

**Resultado esperado**: Error 404 sobre modelo Gemini

### 2. Probar Cloud Run directamente (sin proxy)

```bash
curl -X POST https://rag-agent-backend-117511395113.us-central1.run.app/query \
  -H "Content-Type: application/json" \
  -d '{"question":"hola","top_k":3}'
```

**Resultado esperado**: Mismo error 404

### 3. Verificar health check

```bash
curl https://rag-agent-backend-117511395113.us-central1.run.app/health
```

**Resultado esperado**: `{"service":"rag-backend","status":"healthy","version":"1.0.0"}`

### 4. Ver modelos disponibles desde gcloud

```bash
gcloud ai models list --region=us-central1 --project=uma-tech-ai-lab
```

### 5. Verificar permisos de service account

```bash
gcloud projects get-iam-policy uma-tech-ai-lab \
  --flatten="bindings[].members" \
  --filter="bindings.members:rag-agent-service@uma-tech-ai-lab.iam.gserviceaccount.com"
```

## Posibles Causas

### 1. **Modelos no disponibles para tu organización**
Los modelos Gemini en Vertex AI pueden requerir:
- Estar en una allowlist/whitelist
- Aceptar términos de servicio adicionales
- Tener cuotas/límites habilitados

### 2. **Nombres de modelos incorrectos**
Los nombres de modelos en la API pueden ser diferentes a los mostrados en la UI.

### 3. **Región no soportada**
Aunque `us-central1` debería soportar Gemini, puede haber restricciones específicas del proyecto.

### 4. **Service account sin permisos correctos**
Aunque tiene `Vertex AI User`, puede necesitar permisos adicionales específicos de Gemini.

## Soluciones Propuestas

### Opción A: Solicitar acceso explícito a Gemini

Contactar a Google Cloud Support o tu admin de GCP para:
1. Habilitar Gemini API explícitamente para el proyecto
2. Agregar el proyecto a la allowlist de Gemini
3. Verificar cuotas y límites de uso

### Opción B: Usar región diferente

Probar con `us-east4` o `us-west1`:

```bash
gcloud run services update rag-agent-backend \
  --region=us-central1 \
  --update-env-vars="REGION=us-east4,MODEL_NAME=gemini-pro"
```

### Opción C: Usar PaLM 2 temporalmente

Cambiar a un modelo anterior que sí funcione:

```python
# En lugar de GenerativeModel
from vertexai.language_models import TextGenerationModel

model = TextGenerationModel.from_pretrained("text-bison@002")
```

### Opción D: Obtener el nombre exacto del modelo

Desde la UI de Vertex AI Studio:
1. Ve a https://console.cloud.google.com/vertex-ai/generative/language?project=uma-tech-ai-lab
2. Click en "Compilar con código"
3. Copia el nombre EXACTO del modelo que usa el código generado

## Próximos Pasos

1. **Verificar en UI**: Click en "Compilar con código" en Vertex AI Studio y ver el código Python generado
2. **Revisar cuotas**: https://console.cloud.google.com/apis/api/aiplatform.googleapis.com/quotas?project=uma-tech-ai-lab
3. **Contactar admin**: Pedir que habiliten explícitamente Gemini para el proyecto
4. **Probar región alternativa**: Desplegar en `us-east4` o `europe-west1`

## Archivos Relacionados

- `rag-backend/utils/llm.py` - Generador de respuestas con Gemini
- `rag-backend/requirements.txt` - Dependencias Python
- `rag-backend/Dockerfile` - Imagen de Docker
- `nginx.conf` - Configuración del proxy CORS

## Comandos Útiles

```bash
# Ver logs del servicio
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=rag-agent-backend" \
  --limit=20 --project=uma-tech-ai-lab

# Redeploy con variables de entorno
gcloud run deploy rag-agent-backend \
  --image gcr.io/uma-tech-ai-lab/rag-agent-backend:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "PROJECT_ID=uma-tech-ai-lab,REGION=us-central1,MODEL_NAME=gemini-pro"

# Verificar APIs habilitadas
gcloud services list --enabled --project=uma-tech-ai-lab | grep -i "vertex\|generative"
```

---

## Actualizaciones 2025-10-06

### ✅ Verificaciones adicionales realizadas
- Se actualizó la librería `google-cloud-aiplatform` a la versión `1.119.0` (soporte GA para `generate_content`).
- Se añadió el rol `roles/serviceusage.serviceUsageConsumer` y posteriormente `roles/editor` a la service account `rag-agent-service@uma-tech-ai-lab.iam.gserviceaccount.com`.
- Se configuró el quota project para ADC (`gcloud auth application-default set-quota-project uma-tech-ai-lab`) y se validó el encabezado `x-goog-user-project`.
- Se confirmó mediante `gcloud beta ai model-garden models list --billing-project=uma-tech-ai-lab --model-filter=gemini` que el proyecto ve los modelos Gemini (`CAN_PREDICT: Yes`).

### ❌ Resultado actual
- Tanto desde el SDK (`vertexai.generative_models.GenerativeModel`) como usando `google.genai.Client(vertexai=True)` o la API REST (`projects/{project}/locations/us-central1/publishers/google/models/gemini-* :generateContent`) el backend sigue devolviendo `404 Publisher Model … was not found or your project does not have access to it`.
- El error se reproduce incluso con credenciales de usuario owner (no solo con la service account), lo que descarta un problema aislado de IAM.
- Todo indica que falta habilitar el acceso al *Model Garden inference* para el proyecto (allowlist/quota interna). Estos modelos figuran como `CAN_PREDICT` en el catálogo, pero el endpoint de inference rechaza la solicitud. Este patrón coincide con proyectos que aún no han completado el proceso de habilitación empresarial de Gemini para Vertex AI.

### Recomendación inmediata
1. Abrir un caso con Google Cloud Support solicitando la habilitación de **Vertex AI Gemini Inference** en el proyecto `uma-tech-ai-lab` (región `us-central1`). Incluir el mensaje exacto de error `404 Publisher Model … was not found or your project does not have access to it`.
2. Verificar en la consola que los **Generative AI Enterprise Add-on Terms** estén aceptados para el proyecto y la organización.
3. Una vez se confirme el acceso, repetir la prueba rápida:
   ```bash
   python -c "import vertexai; from vertexai.generative_models import GenerativeModel; vertexai.init(project='uma-tech-ai-lab', location='us-central1'); print(GenerativeModel('gemini-1.5-flash-002').generate_content('ping').text)"
   ```
4. Si la llamada responde correctamente, redeployar Cloud Run (no se requieren cambios de región ni en el código actual).

### Plan de contingencia temporal
- Se habilitó en el backend un modo alternativo que usa la **API pública de Gemini** cuando se define `GENAI_API_KEY`.
  - Nueva dependencia: `google-genai>=1.41.0` (actualizar contenedores/imagen).
  - Flujo a seguir: almacenar la API Key en Secret Manager y exponerla como env var `GENAI_API_KEY` en Cloud Run.
  - Configuración de respuesta idéntica a la previa (temperatura, top_p, top_k, tokens), por lo que el resto del pipeline RAG no cambia.
  - Al eliminar la variable, el servicio vuelve automáticamente a Vertex AI.
- Cloud Run fue redeployado con `GENAI_API_KEY` y `MODEL_NAME=models/gemini-2.5-flash`; el health check responde 200 y las llamadas a `/query` usan la API pública correctamente (ver logs 2025-10-07 12:4x UTC).
- Se eliminó la lógica de mocks en `VectorSearch`; ahora el backend exige `INDEX_ENDPOINT` y `DEPLOYED_INDEX_ID` reales y consulta el Matching Engine para obtener los IDs de chunks que luego se recuperan desde GCS.
- Se ajustó la configuración de **ambos** Cloud Run para optimizar costos: `min_instances=0`, `max_instances=2`, `cpu=1`, `memory=2Gi`, `run.googleapis.com/cpu-throttling=true`. Los cambios están aplicados manualmente y codificados en `infra/main.tf` (faltaría ejecutar `terraform apply` para consolidarlo).
- El Document Processor ahora publica archivos `index/<document_id>/datapoints.json` y llama a `update_embeddings` cuando finaliza el procesamiento. Se renombraron los blobs existentes y se ejecutó un script que llamó a `update_embeddings` para los 5 documentos cargados (logs 2025-10-07 17:xx UTC). El índice `projects/117511395113/locations/us-central1/indexes/7032636899952951296` quedó sincronizado con los embeddings de GCS.
- UI: Se ajustó el layout del Chat RAG (`EnhancedChatInterface`) para permitir scroll vertical completo (se aplicó `min-h-0` y `ScrollArea` flexible), evitando que la pantalla quede truncada y manteniendo visible la navegación lateral y el historial.
- Para pruebas manuales desde PowerShell es necesario enviar el cuerpo en UTF-8 (ejemplo: `Invoke-RestMethod ... -Body ([Text.Encoding]::UTF8.GetBytes($json)) -ContentType 'application/json; charset=utf-8'`). De otra forma Flask rechaza el request con `Failed to decode JSON object`.
- Terraform `apply` ejecutado (2025-10-07 17:10 UTC). Ambos servicios quedaron con `cpu=1`, `memory=2Gi`, `min_instances=0`, `max_instances=2` y `cpu-throttling=true` codificado en estado y en Terraform.
- Pendiente: documentar en DEPLOYMENT_GUIDE cómo reindexar manualmente (`scripts/reindex.py` ejemplificado arriba) si se cargan embeddings por fuera del Document Processor.


**Última actualización**: 2025-10-06 (17:?? UTC)
**Status**: 🔴 BLOQUEADO - Falta habilitación de inference para Model Garden / Gemini en Vertex AI
