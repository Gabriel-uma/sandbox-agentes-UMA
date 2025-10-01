# Variables de configuración para la infraestructura RAG

variable "project_id" {
  description = "ID del proyecto de Google Cloud Platform"
  type        = string
  # REEMPLAZAR: Cambiar por tu project ID real
  # Ejemplo: "mi-proyecto-rag-123"
}

variable "region" {
  description = "Región de GCP donde desplegar los recursos"
  type        = string
  default     = "us-central1"
  # OPCIONES RECOMENDADAS: us-central1, us-east1, europe-west1, asia-southeast1
}

variable "zone" {
  description = "Zona específica dentro de la región"
  type        = string
  default     = "us-central1-a"
  # NOTA: Debe coincidir con la región seleccionada
}

variable "environment" {
  description = "Ambiente de despliegue (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment debe ser uno de: dev, staging, prod."
  }
}

variable "embedding_dimensions" {
  description = "Dimensiones del modelo de embeddings utilizado"
  type        = number
  default     = 768
  # NOTA: 768 para modelos como sentence-transformers/all-MiniLM-L6-v2
  # 1536 para OpenAI text-embedding-ada-002
  # 384 para modelos más pequeños
}

variable "max_replica_count" {
  description = "Número máximo de réplicas para los servicios Cloud Run"
  type        = number
  default     = 10
}

variable "min_replica_count" {
  description = "Número mínimo de réplicas para el backend RAG"
  type        = number
  default     = 1
}

variable "cpu_limit" {
  description = "Límite de CPU para contenedores Cloud Run"
  type        = string
  default     = "2"
  # OPCIONES: "1", "2", "4", "8"
}

variable "memory_limit" {
  description = "Límite de memoria para contenedores Cloud Run"
  type        = string
  default     = "4Gi"
  # OPCIONES: "512Mi", "1Gi", "2Gi", "4Gi", "8Gi", "16Gi", "32Gi"
}

variable "bucket_lifecycle_days" {
  description = "Días después de los cuales eliminar documentos antiguos del bucket"
  type        = number
  default     = 365
}

variable "enable_cors" {
  description = "Habilitar CORS en el bucket de documentos"
  type        = bool
  default     = true
}

variable "allowed_cors_origins" {
  description = "Orígenes permitidos para CORS"
  type        = list(string)
  default     = ["*"]
  # RECOMENDADO: Especificar dominios específicos en producción
  # Ejemplo: ["https://mi-app.com", "https://www.mi-app.com"]
}

variable "vector_search_neighbors" {
  description = "Número aproximado de vecinos para búsqueda vectorial"
  type        = number
  default     = 10
}

variable "vector_index_leaf_nodes" {
  description = "Número de embeddings por nodo hoja en el índice"
  type        = number
  default     = 1000
}

variable "vector_search_percentage" {
  description = "Porcentaje de nodos hoja a buscar"
  type        = number
  default     = 10
}

variable "bigquery_location" {
  description = "Ubicación del dataset de BigQuery (debe coincidir con region para mejor rendimiento)"
  type        = string
  default     = "US"
  # OPCIONES: "US", "EU", o regiones específicas como "us-central1"
}

variable "enable_bigquery_partitioning" {
  description = "Habilitar particionamiento por fecha en BigQuery"
  type        = bool
  default     = true
}

variable "docker_image_tag" {
  description = "Tag de las imágenes Docker a desplegar"
  type        = string
  default     = "latest"
  # RECOMENDADO: Usar tags específicos en producción (ej. "v1.0.0")
}