# Permisos Mínimos Necesarios para Desplegar la Infraestructura RAG

## 👤 Usuario: galabi@uma-health.com

### Permisos actuales detectados
- ❌ No tiene permisos suficientes para:
  - Crear tablas en BigQuery
  - Asignar roles IAM a service accounts
  - Modificar políticas IAM del proyecto

---

## ✅ Permisos Mínimos Requeridos

### Opción 1: Roles Predefinidos (RECOMENDADO)

Estos son los roles mínimos que necesita `galabi@uma-health.com`:

```bash
# 1. Editor - Para crear recursos (Storage, BigQuery, Cloud Run, Vertex AI)
gcloud projects add-iam-policy-binding uma-tech-ai-lab \
  --member="user:galabi@uma-health.com" \
  --role="roles/editor"

# 2. Project IAM Admin - Para asignar roles a service accounts
gcloud projects add-iam-policy-binding uma-tech-ai-lab \
  --member="user:galabi@uma-health.com" \
  --role="roles/resourcemanager.projectIamAdmin"
```

**¿Qué permite cada rol?**

| Rol | Permisos | ¿Por qué lo necesita? |
|-----|----------|----------------------|
| `roles/editor` | Crear/modificar/eliminar recursos de GCP | Para crear Cloud Storage, BigQuery, Cloud Run, Vertex AI |
| `roles/resourcemanager.projectIamAdmin` | Asignar roles IAM a service accounts | Para dar permisos a `rag-agent-service` |

---

### Opción 2: Permisos Granulares (MÁS RESTRICTIVO)

Si prefieres no dar `roles/editor` completo, estos son los permisos específicos:

```bash
# Service Usage Admin - Habilitar APIs
gcloud projects add-iam-policy-binding uma-tech-ai-lab \
  --member="user:galabi@uma-health.com" \
  --role="roles/serviceusage.serviceUsageAdmin"

# Storage Admin - Crear buckets
gcloud projects add-iam-policy-binding uma-tech-ai-lab \
  --member="user:galabi@uma-health.com" \
  --role="roles/storage.admin"

# BigQuery Admin - Crear datasets y tablas
gcloud projects add-iam-policy-binding uma-tech-ai-lab \
  --member="user:galabi@uma-health.com" \
  --role="roles/bigquery.admin"

# Vertex AI Admin - Crear índices vectoriales
gcloud projects add-iam-policy-binding uma-tech-ai-lab \
  --member="user:galabi@uma-health.com" \
  --role="roles/aiplatform.admin"

# Cloud Run Admin - Crear servicios
gcloud projects add-iam-policy-binding uma-tech-ai-lab \
  --member="user:galabi@uma-health.com" \
  --role="roles/run.admin"

# Service Account Admin - Crear service accounts
gcloud projects add-iam-policy-binding uma-tech-ai-lab \
  --member="user:galabi@uma-health.com" \
  --role="roles/iam.serviceAccountAdmin"

# Project IAM Admin - Asignar roles (CRÍTICO)
gcloud projects add-iam-policy-binding uma-tech-ai-lab \
  --member="user:galabi@uma-health.com" \
  --role="roles/resourcemanager.projectIamAdmin"

# Service Account User - Usar service accounts en Cloud Run
gcloud projects add-iam-policy-binding uma-tech-ai-lab \
  --member="user:galabi@uma-health.com" \
  --role="roles/iam.serviceAccountUser"
```

---

## 🔧 Permisos Adicionales para Cloud Build (Opcional)

Si además quieres construir imágenes Docker con Cloud Build:

```bash
# Cloud Build Editor
gcloud projects add-iam-policy-binding uma-tech-ai-lab \
  --member="user:galabi@uma-health.com" \
  --role="roles/cloudbuild.builds.editor"

# O dar permisos a la service account rag-agent-service:
gcloud projects add-iam-policy-binding uma-tech-ai-lab \
  --member="serviceAccount:rag-agent-service@uma-tech-ai-lab.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

---

## 📋 Script Completo para el Owner

**Para ejecutar por:** `fmurzone@uma-health.com` (Owner del proyecto)

```bash
#!/bin/bash
# Script para dar permisos mínimos a galabi@uma-health.com

PROJECT_ID="uma-tech-ai-lab"
USER_EMAIL="galabi@uma-health.com"

echo "🔐 Asignando permisos a ${USER_EMAIL} en proyecto ${PROJECT_ID}..."

# Opción 1: Roles predefinidos (RECOMENDADO - más simple)
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="user:${USER_EMAIL}" \
  --role="roles/editor"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="user:${USER_EMAIL}" \
  --role="roles/resourcemanager.projectIamAdmin"

echo "✅ Permisos asignados exitosamente!"
echo ""
echo "Permisos otorgados:"
echo "  - roles/editor"
echo "  - roles/resourcemanager.projectIamAdmin"
echo ""
echo "El usuario ${USER_EMAIL} ahora puede:"
echo "  ✓ Desplegar infraestructura con Terraform"
echo "  ✓ Crear recursos de GCP (Storage, BigQuery, Cloud Run, Vertex AI)"
echo "  ✓ Asignar roles IAM a service accounts"
echo ""
echo "Verificar permisos:"
echo "  gcloud projects get-iam-policy ${PROJECT_ID} --flatten=\"bindings[].members\" --filter=\"bindings.members:${USER_EMAIL}\""
```

---

## ✅ Verificación de Permisos

Después de que el Owner ejecute los comandos, verifica que tienes los permisos:

```bash
# Ver todos tus roles en el proyecto
gcloud projects get-iam-policy uma-tech-ai-lab \
  --flatten="bindings[].members" \
  --filter="bindings.members:galabi@uma-health.com" \
  --format="table(bindings.role)"
```

Deberías ver:
```
ROLE
roles/editor
roles/resourcemanager.projectIamAdmin
```

---

## 🚀 Después de Recibir Permisos

Una vez que tengas los permisos, ejecutar:

```bash
cd infra
terraform apply
```

---

## ⚠️ Consideraciones de Seguridad

### ¿Es seguro dar estos permisos?

**`roles/editor`:**
- ✅ Permite crear/modificar recursos
- ✅ NO permite eliminar el proyecto
- ✅ NO permite modificar permisos de otros usuarios
- ⚠️ Permite crear/eliminar recursos (gastos en GCP)

**`roles/resourcemanager.projectIamAdmin`:**
- ✅ Permite asignar roles a service accounts
- ✅ Puede asignar roles a otros usuarios (pero no Owner)
- ⚠️ Poder significativo sobre permisos del proyecto

### Recomendaciones:

1. **Para Desarrollo/Testing**: Los permisos solicitados son apropiados
2. **Para Producción**: Considerar:
   - Crear un proyecto separado para producción
   - Usar roles más granulares (Opción 2)
   - Implementar revisión de cambios con pull requests
   - Configurar alertas de costos en GCP

### Alternativa sin dar permisos elevados:

Si el Owner no quiere dar `roles/resourcemanager.projectIamAdmin`, puede:

1. **Pre-crear y configurar la service account** con todos sus roles
2. **Modificar el Terraform** para no intentar asignar roles (comentar recursos `google_project_iam_member`)
3. **Tu ejecutas Terraform** solo con `roles/editor`

---

## 📞 Contacto

**Owner del proyecto:** fmurzone@uma-health.com

**Solicitante:** galabi@uma-health.com

**Proyecto:** uma-tech-ai-lab

**Fecha:** 2025-10-01
