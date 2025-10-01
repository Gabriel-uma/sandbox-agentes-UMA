#!/bin/bash

# Script para destruir la infraestructura RAG
# CUIDADO: Este script eliminará TODOS los recursos creados por Terraform

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_error "⚠️  ADVERTENCIA: Este script eliminará TODOS los recursos de infraestructura"
print_error "Esto incluye:"
echo "  • Bucket de Cloud Storage (y todos los documentos)"
echo "  • Dataset de BigQuery (y todo el historial de chats)"
echo "  • Índice de Vertex AI"
echo "  • Servicios Cloud Run"
echo "  • Cuentas de servicio"

print_warning "¿Estás SEGURO de que quieres continuar? (escribe 'DESTRUIR' para confirmar)"
read -r response

if [ "$response" != "DESTRUIR" ]; then
    print_status "Operación cancelada"
    exit 0
fi

print_warning "Última oportunidad. ¿Realmente quieres eliminar todo? (y/N)"
read -r final_response

if [[ ! "$final_response" =~ ^[Yy]$ ]]; then
    print_status "Operación cancelada"
    exit 0
fi

print_status "Iniciando destrucción de infraestructura..."

# Verificar que Terraform está inicializado
if [ ! -d ".terraform" ]; then
    print_error "Terraform no está inicializado. Ejecuta 'terraform init' primero."
    exit 1
fi

# Mostrar plan de destrucción
print_status "Generando plan de destrucción..."
terraform plan -destroy

print_warning "¿Proceder con la destrucción? (y/N)"
read -r destroy_response

if [[ ! "$destroy_response" =~ ^[Yy]$ ]]; then
    print_status "Destrucción cancelada"
    exit 0
fi

# Ejecutar destrucción
print_status "Destruyendo infraestructura..."
terraform destroy -auto-approve

print_success "Infraestructura destruida completamente"
print_warning "Recuerda limpiar cualquier imagen Docker que hayas subido manualmente"

# Mostrar comandos para limpiar imágenes Docker
PROJECT_ID=$(terraform output -raw project_id 2>/dev/null || echo "tu-project-id")
echo ""
print_status "Para limpiar imágenes Docker (opcional):"
echo "gcloud container images delete gcr.io/$PROJECT_ID/document-processor --force-delete-tags"
echo "gcloud container images delete gcr.io/$PROJECT_ID/rag-backend --force-delete-tags"