#!/bin/bash

# ========================================
# Script de Despliegue SmartAudit en GCP
# ========================================

set -e  # Exit on error

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
PROJECT_ID="uma-tech-ai-lab"
DATA_PROJECT_ID="uma-datascience-dev"
REGION="us-central1"
SERVICE_NAME="smartaudit-api"
SERVICE_ACCOUNT="smartaudit-sa"
REPOSITORY="smartaudit-repo"

# Funciones de utilidad
print_step() {
    echo -e "${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════╗"
echo "║                                               ║"
echo "║       SmartAudit GCP Deployment Script       ║"
echo "║                                               ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar gcloud instalado
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI not installed. Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Verificar autenticación
print_step "Verificando autenticación..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    print_error "No authenticated account found. Run: gcloud auth login"
    exit 1
fi
print_success "Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')"

# Configurar proyecto
print_step "Configurando proyecto..."
gcloud config set project $PROJECT_ID
print_success "Project set to: $PROJECT_ID"

# Paso 1: Habilitar APIs
print_step "Habilitando APIs necesarias..."
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    aiplatform.googleapis.com \
    bigquery.googleapis.com \
    --quiet

print_success "APIs habilitadas"

# Paso 2: Crear Service Account (si no existe)
print_step "Configurando Service Account..."

if gcloud iam service-accounts describe ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com &> /dev/null; then
    print_warning "Service Account ya existe"
else
    print_step "Creando Service Account..."
    gcloud iam service-accounts create $SERVICE_ACCOUNT \
        --display-name="SmartAudit Service Account" \
        --quiet

    # Asignar permisos
    print_step "Asignando permisos..."
    gcloud projects add-iam-policy-binding $DATA_PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/bigquery.dataEditor" \
        --quiet

    gcloud projects add-iam-policy-binding $DATA_PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/bigquery.jobUser" \
        --quiet

    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com" \
        --role="roles/aiplatform.user" \
        --quiet

    print_success "Service Account creado y configurado"
fi

# Paso 3: Crear Artifact Registry Repository (si no existe)
print_step "Configurando Artifact Registry..."

if gcloud artifacts repositories describe $REPOSITORY --location=$REGION &> /dev/null; then
    print_warning "Repository ya existe"
else
    print_step "Creando repository..."
    gcloud artifacts repositories create $REPOSITORY \
        --repository-format=docker \
        --location=$REGION \
        --description="SmartAudit API containers" \
        --quiet

    print_success "Repository creado"
fi

# Paso 4: Build y Deploy
print_step "Iniciando build y deploy..."

# Verificar si existe main.py
if [ ! -f "backend/smartaudit-api/main.py" ]; then
    print_error "No se encontró backend/smartaudit-api/main.py"
    print_warning "Asegúrate de estar en el directorio correcto"
    exit 1
fi

cd backend/smartaudit-api

# Deploy usando Cloud Build (automático)
print_step "Desplegando a Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --service-account ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com \
    --set-env-vars GOOGLE_CLOUD_PROJECT=$DATA_PROJECT_ID,BIGQUERY_DATASET=Bigquery_Dataset,BIGQUERY_TABLE=evaluaciones_auditoria,ENVIRONMENT=production \
    --max-instances 5 \
    --min-instances 0 \
    --memory 1Gi \
    --cpu 1 \
    --timeout 300 \
    --quiet

cd ../..

print_success "Deploy completado!"

# Paso 5: Obtener URL del servicio
print_step "Obteniendo URL del servicio..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region $REGION \
    --format 'value(status.url)')

print_success "Servicio desplegado en: $SERVICE_URL"

# Paso 6: Test health check
print_step "Testeando health check..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $SERVICE_URL/health)

if [ "$HTTP_CODE" -eq 200 ]; then
    print_success "Health check OK (HTTP $HTTP_CODE)"
else
    print_error "Health check failed (HTTP $HTTP_CODE)"
fi

# Resumen final
echo -e "\n${GREEN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                               ║${NC}"
echo -e "${GREEN}║           🎉 Deployment Successful! 🎉         ║${NC}"
echo -e "${GREEN}║                                               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}📋 Información del Servicio:${NC}"
echo -e "   ${GREEN}URL:${NC} $SERVICE_URL"
echo -e "   ${GREEN}Project:${NC} $PROJECT_ID"
echo -e "   ${GREEN}Region:${NC} $REGION"
echo -e "   ${GREEN}Service Account:${NC} ${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"

echo -e "\n${BLUE}🔧 Próximos pasos:${NC}"
echo -e "   1. Agregar la URL al .env del frontend:"
echo -e "      ${YELLOW}VITE_SMARTAUDIT_API_URL=$SERVICE_URL${NC}"
echo -e "   2. Redesplegar frontend en Vercel"
echo -e "   3. Testear los endpoints:"
echo -e "      ${YELLOW}curl $SERVICE_URL/health${NC}"

echo -e "\n${BLUE}📊 Comandos útiles:${NC}"
echo -e "   Ver logs:"
echo -e "      ${YELLOW}gcloud run services logs tail $SERVICE_NAME --region $REGION${NC}"
echo -e "   Ver métricas:"
echo -e "      ${YELLOW}https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics${NC}"

print_success "\nDone! 🚀"
