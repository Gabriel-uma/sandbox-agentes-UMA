#!/bin/bash

# Script de despliegue automatizado para la infraestructura RAG
# Uso: ./deploy.sh [project_id] [region]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con color
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

# Verificar argumentos
PROJECT_ID=${1:-""}
REGION=${2:-"us-central1"}

if [ -z "$PROJECT_ID" ]; then
    print_error "Uso: $0 <project_id> [region]"
    print_error "Ejemplo: $0 mi-proyecto-rag us-central1"
    exit 1
fi

print_status "Iniciando despliegue de infraestructura RAG"
print_status "Proyecto: $PROJECT_ID"
print_status "Región: $REGION"

# Verificar herramientas necesarias
print_status "Verificando herramientas necesarias..."

if ! command -v terraform &> /dev/null; then
    print_error "Terraform no está instalado"
    exit 1
fi

if ! command -v gcloud &> /dev/null; then
    print_error "Google Cloud SDK no está instalado"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado"
    exit 1
fi

print_success "Todas las herramientas están disponibles"

# Configurar gcloud
print_status "Configurando Google Cloud..."
gcloud config set project $PROJECT_ID
gcloud auth application-default login --quiet || print_warning "ADC ya configurado"

# Habilitar APIs necesarias
print_status "Habilitando APIs necesarias..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    storage.googleapis.com \
    bigquery.googleapis.com \
    aiplatform.googleapis.com \
    cloudfunctions.googleapis.com \
    iam.googleapis.com \
    logging.googleapis.com \
    monitoring.googleapis.com

print_success "APIs habilitadas"

# Verificar que el archivo terraform.tfvars existe
if [ ! -f "terraform.tfvars" ]; then
    print_warning "terraform.tfvars no encontrado. Creando desde ejemplo..."
    cp terraform.tfvars.example terraform.tfvars
    sed -i "s/tu-proyecto-id-aqui/$PROJECT_ID/g" terraform.tfvars
    sed -i "s/us-central1/$REGION/g" terraform.tfvars
    print_warning "Por favor, revisa y ajusta terraform.tfvars antes de continuar"
    read -p "Presiona Enter para continuar..."
fi

# Inicializar Terraform
print_status "Inicializando Terraform..."
terraform init

# Planificar despliegue
print_status "Generando plan de Terraform..."
terraform plan -out=tfplan

# Confirmar despliegue
print_warning "¿Deseas continuar con el despliegue? (y/N)"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    print_status "Despliegue cancelado"
    exit 0
fi

# Aplicar infraestructura
print_status "Aplicando infraestructura..."
terraform apply tfplan

# Mostrar outputs importantes
print_success "¡Infraestructura desplegada exitosamente!"
print_status "Configuración para tu aplicación:"

echo ""
print_status "URLs de servicios:"
terraform output document_processor_url
terraform output rag_backend_url

echo ""
print_status "Configuración para frontend (.env.local):"
terraform output -json frontend_env_config | jq -r 'to_entries[] | "\(.key)=\(.value)"'

echo ""
print_status "Próximos pasos:"
echo "1. Construir y subir las imágenes Docker de tus servicios"
echo "2. Configurar las variables de entorno en tu aplicación"
echo "3. Probar la integración subiendo un documento"

print_success "Despliegue completado"

# Limpiar archivo de plan
rm -f tfplan