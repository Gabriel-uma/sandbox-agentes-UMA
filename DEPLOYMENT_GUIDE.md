# Guía de Despliegue Completo - Sistema RAG

## 📋 Pre-requisitos

- [x] Google Cloud SDK instalado
- [x] Terraform instalado (>= 1.0)
- [x] Docker instalado
- [x] Node.js y npm instalados
- [x] Permisos en GCP: `roles/editor` + `roles/resourcemanager.projectIamAdmin`

## 🚀 Paso 1: Construir y Subir Imágenes Docker

### 1.1 Autenticar Docker con GCR

```bash
gcloud auth configure-docker
```

### 1.2 Construir imagen del Document Processor

```bash
cd document-processor
docker build -t gcr.io/uma-tech-ai-lab/document-processor:latest .
docker push gcr.io/uma-tech-ai-lab/document-processor:latest
cd ..
```

### 1.3 Construir imagen del RAG Backend

```bash
cd rag-backend
docker build -t gcr.io/uma-tech-ai-lab/rag-backend:latest .
docker push gcr.io/uma-tech-ai-lab/rag-backend:latest
cd ..
```

## ☁️ Paso 2: Desplegar Infraestructura con Terraform

### 2.1 Navegar al directorio de infraestructura

```bash
cd infra
```

### 2.2 Inicializar Terraform

```bash
terraform init
```

### 2.3 Revisar el plan

```bash
terraform plan
```

### 2.4 Aplicar la infraestructura

```bash
terraform apply
```

Confirmar con `yes` cuando se solicite.

### 2.5 Guardar outputs importantes

```bash
# URL del Document Processor
terraform output document_processor_url

# URL del RAG Backend
terraform output rag_backend_url

# Bucket name
terraform output bucket_name

# Todos los outputs
terraform output
```

## 🌐 Paso 3: Configurar Frontend

### 3.1 Crear archivo .env

```bash
cd ..  # Regresar al directorio raíz
cp .env.example .env
```

### 3.2 Actualizar .env con URLs reales

Editar `.env` y reemplazar las URLs con los outputs de Terraform:

```env
VITE_DOCUMENT_PROCESSOR_URL=https://rag-document-processor-[hash]-uc.a.run.app
VITE_RAG_BACKEND_URL=https://rag-agent-backend-[hash]-uc.a.run.app
VITE_PROJECT_ID=uma-tech-ai-lab
VITE_BUCKET_NAME=uma-tech-ai-lab-rag-documents
```

### 3.3 Instalar dependencias y ejecutar

```bash
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:5173`

## ✅ Paso 4: Verificación

### 4.1 Verificar servicios backend

```bash
# Health check Document Processor
curl https://[DOCUMENT_PROCESSOR_URL]/health

# Health check RAG Backend
curl https://[RAG_BACKEND_URL]/health
```

Ambos deben retornar:
```json
{
  "status": "healthy",
  "service": "...",
  "version": "1.0.0"
}
```

### 4.2 Probar subida de documento

```bash
curl -X POST \\
  -F "file=@test-document.pdf" \\
  https://[DOCUMENT_PROCESSOR_URL]/upload
```

### 4.3 Probar consulta RAG

```bash
curl -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"question": "¿Qué información tienes?"}' \\
  https://[RAG_BACKEND_URL]/query
```

### 4.4 Verificar BigQuery

```bash
cd infra
bq query --use_legacy_sql=false \\
  'SELECT * FROM uma-tech-ai-lab.rag_chat_history.conversations LIMIT 10'
```

## 📊 Paso 5: Monitoreo

### Ver logs de servicios

```bash
# Logs del Document Processor
gcloud run services logs read rag-document-processor --region=us-central1 --limit=50

# Logs del RAG Backend
gcloud run services logs read rag-agent-backend --region=us-central1 --limit=50
```

### Verificar recursos en GCP Console

1. **Cloud Run**: https://console.cloud.google.com/run
2. **Cloud Storage**: https://console.cloud.google.com/storage
3. **BigQuery**: https://console.cloud.google.com/bigquery
4. **Vertex AI**: https://console.cloud.google.com/vertex-ai

## 🔧 Comandos Útiles

### Actualizar servicios después de cambios en el código

```bash
# Rebuild y push de imágenes
docker build -t gcr.io/uma-tech-ai-lab/document-processor:latest document-processor/
docker push gcr.io/uma-tech-ai-lab/document-processor:latest

docker build -t gcr.io/uma-tech-ai-lab/rag-backend:latest rag-backend/
docker push gcr.io/uma-tech-ai-lab/rag-backend:latest

# Terraform aplicará automáticamente las nuevas imágenes
cd infra
terraform apply
```

### Ver contenido del bucket

```bash
gsutil ls -r gs://uma-tech-ai-lab-rag-documents/
```

### Consultar conversaciones en BigQuery

```bash
bq query --use_legacy_sql=false \\
  "SELECT
    conversation_id,
    timestamp,
    user_message,
    assistant_message,
    confidence
  FROM uma-tech-ai-lab.rag_chat_history.conversations
  ORDER BY timestamp DESC
  LIMIT 10"
```

## 🛡️ Seguridad para Producción

### 1. Configurar CORS específicos

Editar `infra/terraform.tfvars`:

```hcl
allowed_cors_origins = ["https://tu-dominio.com"]
```

### 2. Requerir autenticación en Cloud Run (opcional)

```bash
gcloud run services update rag-document-processor \\
  --no-allow-unauthenticated \\
  --region us-central1

gcloud run services update rag-agent-backend \\
  --no-allow-unauthenticated \\
  --region us-central1
```

### 3. Configurar alertas de monitoreo

Ir a Cloud Monitoring y configurar alertas para:
- Errores 5xx en Cloud Run
- Latencia > 10s
- CPU > 80%
- Memoria > 80%

## 🗑️ Limpieza / Destrucción

**⚠️ CUIDADO**: Esto eliminará TODOS los recursos creados

```bash
cd infra
terraform destroy
```

## 📞 Troubleshooting

### Error: "Permission denied"
- Verificar que tienes `roles/editor` y `roles/resourcemanager.projectIamAdmin`
- Ejecutar: `gcloud auth application-default login`

### Error: "Image not found"
- Asegurarte de haber construido y subido las imágenes Docker primero
- Verificar nombres de imágenes en GCR: `gcloud container images list`

### Error: "Service unavailable"
- Verificar logs con `gcloud run services logs read [SERVICE_NAME]`
- Verificar que las variables de entorno estén configuradas correctamente
- Hacer health check a los servicios

### Frontend no conecta con backend
- Verificar que `.env` tenga las URLs correctas
- Verificar que los servicios Cloud Run permitan tráfico no autenticado
- Abrir Developer Tools en el navegador y revisar errores de CORS

### BigQuery: "Table not found"
- Esperar a que Terraform termine de crear todos los recursos
- Verificar en BigQuery Console que exista el dataset `rag_chat_history`

---

## 🎉 ¡Sistema Desplegado!

Tu sistema RAG está ahora completamente funcional:

- ✅ Document Processor procesando y indexando documentos
- ✅ RAG Backend generando respuestas con Gemini
- ✅ Conversaciones guardadas en BigQuery
- ✅ Frontend conectado a los servicios

**Siguiente paso**: Subir tus primeros documentos y hacer preguntas!
