#!/bin/bash

# Script de Despliegue Automatizado para GCP Cloud Run
# Fábrica de Agentes AI Weekly
#
# Este script despliega todos los servicios backend en Google Cloud Run

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
PROJECT_ID="uma-tech-ai-lab"
REGION="us-central1"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Despliegue de Agentes AI Weekly${NC}"
echo -e "${GREEN}  Proyecto: $PROJECT_ID${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Verificar que gcloud esté configurado
echo -e "${YELLOW}Verificando configuración de gcloud...${NC}"
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)

if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${YELLOW}Configurando proyecto $PROJECT_ID...${NC}"
    gcloud config set project $PROJECT_ID
fi

echo -e "${GREEN}✓ Proyecto configurado: $PROJECT_ID${NC}\n"

# Función para desplegar un servicio
deploy_service() {
    local SERVICE_NAME=$1
    local SERVICE_DIR=$2
    local IMAGE_PATH=$3
    local MEMORY=$4
    local CPU=$5

    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}Desplegando: $SERVICE_NAME${NC}"
    echo -e "${YELLOW}========================================${NC}"

    cd "$SERVICE_DIR"

    echo -e "${YELLOW}1. Building container image...${NC}"
    gcloud builds submit --tag "$IMAGE_PATH" --quiet

    echo -e "${YELLOW}2. Deploying to Cloud Run...${NC}"
    gcloud run deploy "$SERVICE_NAME" \
        --image "$IMAGE_PATH" \
        --region "$REGION" \
        --platform managed \
        --allow-unauthenticated \
        --memory "$MEMORY" \
        --cpu "$CPU" \
        --min-instances 0 \
        --max-instances 10 \
        --timeout 300 \
        --quiet

    # Obtener URL del servicio
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
        --region "$REGION" \
        --format 'value(status.url)')

    echo -e "${GREEN}✓ $SERVICE_NAME desplegado exitosamente${NC}"
    echo -e "${GREEN}  URL: $SERVICE_URL${NC}\n"

    cd - > /dev/null
}

# Desplegar Document Processor
echo -e "\n${GREEN}[1/3] Document Processor${NC}"
deploy_service \
    "rag-document-processor" \
    "./document-processor" \
    "gcr.io/$PROJECT_ID/rag-document-processor" \
    "1Gi" \
    "1"

# Desplegar RAG Backend
echo -e "\n${GREEN}[2/3] RAG Backend${NC}"
deploy_service \
    "rag-agent-backend" \
    "./rag-backend" \
    "gcr.io/$PROJECT_ID/rag-agent-backend" \
    "1Gi" \
    "1"

# Desplegar SmartAudit API
echo -e "\n${GREEN}[3/3] SmartAudit API${NC}"

# Primero verificar que el repositorio de Artifact Registry exista
echo -e "${YELLOW}Verificando Artifact Registry...${NC}"
if ! gcloud artifacts repositories describe smartaudit-repo \
    --location="$REGION" &>/dev/null; then
    echo -e "${YELLOW}Creando repositorio smartaudit-repo...${NC}"
    gcloud artifacts repositories create smartaudit-repo \
        --repository-format=docker \
        --location="$REGION" \
        --description="SmartAudit API container images"
fi

deploy_service \
    "smartaudit-api" \
    "./src/agents/smartaudit/backend/smartaudit-api" \
    "us-central1-docker.pkg.dev/$PROJECT_ID/smartaudit-repo/smartaudit-api:latest" \
    "512Mi" \
    "1"

# Resumen final
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  DESPLIEGUE COMPLETADO${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${GREEN}URLs de servicios desplegados:${NC}\n"

echo -e "Document Processor:"
gcloud run services describe rag-document-processor \
    --region "$REGION" \
    --format 'value(status.url)'

echo -e "\nRAG Backend:"
gcloud run services describe rag-agent-backend \
    --region "$REGION" \
    --format 'value(status.url)'

echo -e "\nSmartAudit API:"
gcloud run services describe smartaudit-api \
    --region "$REGION" \
    --format 'value(status.url)'

echo -e "\n${YELLOW}Próximos pasos:${NC}"
echo -e "1. Copia las URLs anteriores"
echo -e "2. Actualiza el archivo .env.production con estas URLs"
echo -e "3. Configura las variables de entorno en Vercel"
echo -e "4. Despliega el frontend con: ${YELLOW}vercel --prod${NC}\n"

echo -e "${GREEN}✓ Todos los servicios backend están desplegados y funcionando${NC}\n"
