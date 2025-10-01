# Guía de Despliegue de Infraestructura RAG en GCP

Esta guía te ayudará a desplegar toda la infraestructura necesaria para tu aplicación RAG en Google Cloud Platform usando Terraform.

## 📋 Requisitos Previos

1. **Google Cloud SDK** instalado y configurado
2. **Terraform** instalado (versión >= 1.0)
3. **Proyecto de GCP** creado y configurado
4. **Docker** instalado para construir las imágenes
5. **Permisos de Owner** o Editor en el proyecto GCP

## 🚀 Pasos de Despliegue

### 1. Configuración Inicial

```bash
# Autenticar con Google Cloud
gcloud auth login
gcloud auth application-default login

# Configurar proyecto por defecto
gcloud config set project TU-PROJECT-ID

# Habilitar APIs necesarias (opcional, Terraform lo hace automáticamente)
gcloud services enable cloudbuild.googleapis.com run.googleapis.com storage.googleapis.com
```

### 2. Configurar Variables de Terraform

```bash
# Navegar al directorio de infraestructura
cd infra

# Copiar y editar archivo de variables
cp terraform.tfvars.example terraform.tfvars

# Editar terraform.tfvars con tus valores reales
nano terraform.tfvars
```

**IMPORTANTE**: Reemplaza `project_id` con tu Project ID real de GCP.

### 3. Inicializar y Aplicar Terraform

```bash
# Inicializar Terraform
terraform init

# Revisar el plan de despliegue
terraform plan

# Aplicar la infraestructura (confirmar con 'yes')
terraform apply
```

### 4. Obtener URLs y Configuración

Después del despliegue exitoso, Terraform mostrará las URLs y configuración necesaria:

```bash
# Ver todos los outputs
terraform output

# Ver configuración específica para frontend
terraform output frontend_env_config

# Ver configuración para backend
terraform output backend_env_config
```

## 🔗 Integración con la Aplicación

### Frontend React

Crea un archivo `.env.local` en tu directorio raíz del frontend:

```env
# URLs de los servicios desplegados
REACT_APP_DOCUMENT_PROCESSOR_URL=https://rag-document-processor-xxx-uc.a.run.app
REACT_APP_RAG_BACKEND_URL=https://rag-agent-backend-xxx-uc.a.run.app
REACT_APP_PROJECT_ID=tu-project-id
REACT_APP_BUCKET_NAME=tu-project-id-rag-documents
```

### Backend Services

Las imágenes Docker para los servicios backend deben incluir estas variables de entorno:

```dockerfile
# Variables para el Document Processor
ENV PROJECT_ID=tu-project-id
ENV BUCKET_NAME=tu-project-id-rag-documents
ENV INDEX_ENDPOINT=projects/PROJECT_NUMBER/locations/REGION/indexEndpoints/INDEX_ENDPOINT_ID
ENV DEPLOYED_INDEX_ID=rag-deployed-index

# Variables para el RAG Backend
ENV DATASET_ID=rag_chat_history
ENV TABLE_ID=conversations
```

## 🐳 Construcción y Despliegue de Imágenes Docker

### 1. Configurar Docker para GCP

```bash
# Configurar Docker para usar gcr.io
gcloud auth configure-docker

# O para Artifact Registry (recomendado)
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### 2. Construir y Subir Imágenes

```bash
# Document Processor
docker build -t gcr.io/TU-PROJECT-ID/document-processor:latest ./document-processor
docker push gcr.io/TU-PROJECT-ID/document-processor:latest

# RAG Backend
docker build -t gcr.io/TU-PROJECT-ID/rag-backend:latest ./rag-backend
docker push gcr.io/TU-PROJECT-ID/rag-backend:latest
```

### 3. Actualizar Servicios Cloud Run

```bash
# Actualizar document processor
gcloud run deploy rag-document-processor \
  --image gcr.io/TU-PROJECT-ID/document-processor:latest \
  --region us-central1

# Actualizar RAG backend
gcloud run deploy rag-agent-backend \
  --image gcr.io/TU-PROJECT-ID/rag-backend:latest \
  --region us-central1
```

## 🔑 Configuración de Credenciales para Desarrollo Local

### 1. Crear Clave de Servicio

```bash
# Crear archivo de credenciales
gcloud iam service-accounts keys create rag-service-key.json \
  --iam-account=$(terraform output -raw service_account_email)

# Configurar variable de entorno
export GOOGLE_APPLICATION_CREDENTIALS="./rag-service-key.json"
```

### 2. Configurar Frontend para Desarrollo Local

Para desarrollo local, puedes usar la clave de servicio descargada:

```javascript
// En tu componente React para subida de archivos
const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${process.env.REACT_APP_DOCUMENT_PROCESSOR_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  return response.json();
};

// Para consultas al RAG
const queryRAG = async (question) => {
  const response = await fetch(`${process.env.REACT_APP_RAG_BACKEND_URL}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  });

  return response.json();
};
```

## 📁 Estructura de APIs Esperada

### Document Processor Service

```
POST /upload
Content-Type: multipart/form-data
Body: file (documento a procesar)

Response:
{
  "status": "success",
  "document_id": "doc-123",
  "message": "Documento procesado e indexado"
}
```

### RAG Backend Service

```
POST /query
Content-Type: application/json
Body: {
  "question": "tu pregunta aquí",
  "conversation_id": "optional-conv-id"
}

Response:
{
  "answer": "respuesta del RAG",
  "sources": [...],
  "conversation_id": "conv-123"
}

GET /conversations/{conversation_id}
Response: historial de la conversación
```

## 🔧 Comandos Útiles

### Monitoreo y Logs

```bash
# Ver logs del document processor
gcloud run services logs read rag-document-processor --region=us-central1

# Ver logs del RAG backend
gcloud run services logs read rag-agent-backend --region=us-central1

# Consultar BigQuery
bq query --use_legacy_sql=false 'SELECT * FROM tu-project-id.rag_chat_history.conversations LIMIT 10'

# Listar documentos en el bucket
gsutil ls gs://tu-project-id-rag-documents/
```

### Actualización de Recursos

```bash
# Aplicar cambios en la infraestructura
terraform plan
terraform apply

# Destruir infraestructura (¡CUIDADO!)
terraform destroy
```

## 🛡️ Seguridad y Mejores Prácticas

1. **En Producción**: Cambiar `allowed_cors_origins` de `["*"]` a dominios específicos
2. **Credenciales**: Nunca subir archivos `.json` de credenciales al repositorio
3. **IAM**: Revisar regularmente los permisos asignados
4. **Monitoreo**: Configurar alertas en Cloud Monitoring
5. **Backup**: BigQuery automáticamente mantiene historial, pero considera exports regulares

## 🚨 Troubleshooting

### Error: "Permission denied"
- Verificar que las APIs estén habilitadas
- Confirmar permisos de IAM del usuario
- Validar que la cuenta de servicio tenga los roles correctos

### Error: "Image not found"
- Construir y subir las imágenes Docker antes de aplicar Terraform
- Verificar que los nombres de imagen coincidan en `main.tf`

### Error: "Quota exceeded"
- Revisar quotas del proyecto en GCP Console
- Solicitar aumento de quota si es necesario

### Vertex AI Index no se crea
- El índice necesita datos para crearse completamente
- Subir al menos un documento para inicializar el índice

---

## 📞 Soporte

Si encuentras problemas durante el despliegue:
1. Revisar los logs de Terraform
2. Verificar el estado de los recursos en GCP Console
3. Consultar la documentación oficial de GCP
4. Verificar que todas las APIs estén habilitadas

¡Tu infraestructura RAG está lista para usar! 🎉