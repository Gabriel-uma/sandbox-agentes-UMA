# Configuración principal de Terraform para RAG Agent en GCP
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

# Provider de Google Cloud
provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Habilitar APIs necesarias
resource "google_project_service" "apis" {
  for_each = toset([
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "storage.googleapis.com",
    "bigquery.googleapis.com",
    "aiplatform.googleapis.com",
    "cloudfunctions.googleapis.com",
    "iam.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com"
  ])

  service = each.value
  project = var.project_id

  disable_dependent_services = true
  disable_on_destroy         = false
}

# Cuenta de servicio principal para la aplicación
resource "google_service_account" "rag_agent_sa" {
  account_id   = "rag-agent-service"
  display_name = "RAG Agent Service Account"
  description  = "Service account para el agente RAG con permisos mínimos necesarios"

  depends_on = [google_project_service.apis]
}

# Bucket de Cloud Storage para documentos
resource "google_storage_bucket" "documents_bucket" {
  name     = "${var.project_id}-rag-documents"
  location = var.region

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.apis]
}

# Dataset de BigQuery para historial de chats
resource "google_bigquery_dataset" "chat_history" {
  dataset_id  = "rag_chat_history"
  description = "Dataset para almacenar historial de conversaciones del agente RAG"
  location    = var.region

  access {
    role          = "OWNER"
    user_by_email = google_service_account.rag_agent_sa.email
  }

  depends_on = [google_project_service.apis]
}

# Tabla de BigQuery para conversaciones
resource "google_bigquery_table" "conversations" {
  dataset_id = google_bigquery_dataset.chat_history.dataset_id
  table_id   = "conversations"

  schema = jsonencode([
    {
      name = "conversation_id"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "user_id"
      type = "STRING"
      mode = "NULLABLE"
    },
    {
      name = "message_type"
      type = "STRING"
      mode = "REQUIRED"
      description = "user or assistant"
    },
    {
      name = "content"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "timestamp"
      type = "TIMESTAMP"
      mode = "REQUIRED"
    },
    {
      name = "metadata"
      type = "JSON"
      mode = "NULLABLE"
    }
  ])

  time_partitioning {
    type  = "DAY"
    field = "timestamp"
  }

  depends_on = [google_bigquery_dataset.chat_history]
}

# Índice de Vertex AI para búsqueda vectorial
resource "google_vertex_ai_index" "rag_vector_index" {
  provider     = google-beta
  region       = var.region
  display_name = "RAG Vector Search Index"
  description  = "Índice vectorial para búsqueda semántica de documentos"

  metadata {
    contents_delta_uri = "gs://${google_storage_bucket.documents_bucket.name}/index"
    config {
      dimensions                  = 768  # Ajustar según el modelo de embeddings
      approximate_neighbors_count = 10
      distance_measure_type      = "COSINE_DISTANCE"
      feature_norm_type          = "UNIT_L2_NORM"  # Requerido para COSINE_DISTANCE
      algorithm_config {
        tree_ah_config {
          leaf_node_embedding_count    = 1000
          leaf_nodes_to_search_percent = 10
        }
      }
    }
  }

  depends_on = [google_project_service.apis, google_storage_bucket.documents_bucket]
}

# Endpoint para el índice vectorial
resource "google_vertex_ai_index_endpoint" "rag_index_endpoint" {
  provider     = google-beta
  region       = var.region
  display_name = "RAG Vector Search Endpoint"
  description  = "Endpoint para consultas al índice vectorial"

  depends_on = [google_vertex_ai_index.rag_vector_index]
}

# Despliegue del índice en el endpoint
resource "google_vertex_ai_index_endpoint_deployed_index" "rag_deployed_index" {
  provider          = google-beta
  index_endpoint    = google_vertex_ai_index_endpoint.rag_index_endpoint.id
  index             = google_vertex_ai_index.rag_vector_index.id
  deployed_index_id = "rag-deployed-index"
  display_name      = "RAG Deployed Index"

  automatic_resources {
    min_replica_count = 1
    max_replica_count = 3
  }

  depends_on = [google_vertex_ai_index_endpoint.rag_index_endpoint]
}

# Cloud Run para procesamiento de documentos
resource "google_cloud_run_v2_service" "document_processor" {
  name     = "rag-document-processor"
  location = var.region

  template {
    service_account = google_service_account.rag_agent_sa.email

    containers {
      image = "gcr.io/${var.project_id}/document-processor:latest"

      env {
        name  = "PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "BUCKET_NAME"
        value = google_storage_bucket.documents_bucket.name
      }

      env {
        name  = "REGION"
        value = var.region
      }

      env {
        name  = "INDEX_ENDPOINT"
        value = google_vertex_ai_index_endpoint.rag_index_endpoint.name
      }

      env {
        name  = "DEPLOYED_INDEX_ID"
        value = google_vertex_ai_index_endpoint_deployed_index.rag_deployed_index.deployed_index_id
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "4Gi"
        }
      }

      ports {
        container_port = 8080
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
  }

  depends_on = [
    google_project_service.apis,
    google_service_account.rag_agent_sa,
    google_vertex_ai_index_endpoint_deployed_index.rag_deployed_index
  ]
}

# Cloud Run para el backend del agente RAG
resource "google_cloud_run_v2_service" "rag_backend" {
  name     = "rag-agent-backend"
  location = var.region

  template {
    service_account = google_service_account.rag_agent_sa.email

    containers {
      image = "gcr.io/${var.project_id}/rag-backend:latest"

      env {
        name  = "PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "DATASET_ID"
        value = google_bigquery_dataset.chat_history.dataset_id
      }

      env {
        name  = "TABLE_ID"
        value = google_bigquery_table.conversations.table_id
      }

      env {
        name  = "INDEX_ENDPOINT"
        value = google_vertex_ai_index_endpoint.rag_index_endpoint.name
      }

      env {
        name  = "DEPLOYED_INDEX_ID"
        value = google_vertex_ai_index_endpoint_deployed_index.rag_deployed_index.deployed_index_id
      }

      env {
        name  = "BUCKET_NAME"
        value = google_storage_bucket.documents_bucket.name
      }

      env {
        name  = "REGION"
        value = var.region
      }

      env {
        name  = "MODEL_NAME"
        value = "gemini-1.5-flash"
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "4Gi"
        }
      }

      ports {
        container_port = 8080
      }
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }
  }

  depends_on = [
    google_project_service.apis,
    google_service_account.rag_agent_sa,
    google_bigquery_table.conversations,
    google_vertex_ai_index_endpoint_deployed_index.rag_deployed_index
  ]
}

# Permisos IAM para la cuenta de servicio
resource "google_project_iam_member" "rag_storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.rag_agent_sa.email}"
}

resource "google_project_iam_member" "rag_bigquery_admin" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.rag_agent_sa.email}"
}

resource "google_project_iam_member" "rag_vertex_ai_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.rag_agent_sa.email}"
}

resource "google_project_iam_member" "rag_logging_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.rag_agent_sa.email}"
}

# Permitir acceso público a los servicios Cloud Run
resource "google_cloud_run_v2_service_iam_member" "document_processor_public" {
  name   = google_cloud_run_v2_service.document_processor.name
  location = google_cloud_run_v2_service.document_processor.location
  role   = "roles/run.invoker"
  member = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "rag_backend_public" {
  name   = google_cloud_run_v2_service.rag_backend.name
  location = google_cloud_run_v2_service.rag_backend.location
  role   = "roles/run.invoker"
  member = "allUsers"
}