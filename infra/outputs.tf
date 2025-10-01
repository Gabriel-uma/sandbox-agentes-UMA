# Outputs de la infraestructura RAG para integración con la aplicación

output "project_id" {
  description = "ID del proyecto GCP utilizado"
  value       = var.project_id
}

output "region" {
  description = "Región donde se desplegaron los recursos"
  value       = var.region
}

# Outputs del almacenamiento
output "documents_bucket_name" {
  description = "Nombre del bucket para almacenar documentos"
  value       = google_storage_bucket.documents_bucket.name
}

output "documents_bucket_url" {
  description = "URL del bucket de documentos"
  value       = google_storage_bucket.documents_bucket.url
}

# Outputs de BigQuery
output "bigquery_dataset_id" {
  description = "ID del dataset de BigQuery para historial"
  value       = google_bigquery_dataset.chat_history.dataset_id
}

output "bigquery_table_id" {
  description = "ID de la tabla de conversaciones"
  value       = google_bigquery_table.conversations.table_id
}

output "bigquery_table_full_id" {
  description = "ID completo de la tabla (proyecto.dataset.tabla)"
  value       = "${var.project_id}.${google_bigquery_dataset.chat_history.dataset_id}.${google_bigquery_table.conversations.table_id}"
}

# Outputs de Vertex AI
output "vector_index_id" {
  description = "ID del índice vectorial de Vertex AI"
  value       = google_vertex_ai_index.rag_vector_index.id
}

output "vector_index_name" {
  description = "Nombre del índice vectorial"
  value       = google_vertex_ai_index.rag_vector_index.name
}

output "vector_index_endpoint_id" {
  description = "ID del endpoint del índice vectorial"
  value       = google_vertex_ai_index_endpoint.rag_index_endpoint.id
}

output "vector_index_endpoint_name" {
  description = "Nombre del endpoint del índice vectorial"
  value       = google_vertex_ai_index_endpoint.rag_index_endpoint.name
}

output "deployed_index_id" {
  description = "ID del índice desplegado"
  value       = google_vertex_ai_index_endpoint_deployed_index.rag_deployed_index.deployed_index_id
}

# Outputs de Cloud Run
output "document_processor_url" {
  description = "URL del servicio de procesamiento de documentos"
  value       = google_cloud_run_v2_service.document_processor.uri
}

output "rag_backend_url" {
  description = "URL del backend del agente RAG"
  value       = google_cloud_run_v2_service.rag_backend.uri
}

output "document_processor_service_name" {
  description = "Nombre del servicio de procesamiento de documentos"
  value       = google_cloud_run_v2_service.document_processor.name
}

output "rag_backend_service_name" {
  description = "Nombre del servicio backend RAG"
  value       = google_cloud_run_v2_service.rag_backend.name
}

# Outputs de Service Account
output "service_account_email" {
  description = "Email de la cuenta de servicio principal"
  value       = google_service_account.rag_agent_sa.email
}

output "service_account_id" {
  description = "ID de la cuenta de servicio principal"
  value       = google_service_account.rag_agent_sa.id
}

# Outputs para configuración de la aplicación frontend
output "frontend_env_config" {
  description = "Configuración de variables de entorno para el frontend"
  value = {
    REACT_APP_DOCUMENT_PROCESSOR_URL = google_cloud_run_v2_service.document_processor.uri
    REACT_APP_RAG_BACKEND_URL       = google_cloud_run_v2_service.rag_backend.uri
    REACT_APP_PROJECT_ID            = var.project_id
    REACT_APP_BUCKET_NAME           = google_storage_bucket.documents_bucket.name
  }
  sensitive = false
}

# Outputs para configuración de servicios backend
output "backend_env_config" {
  description = "Configuración de variables de entorno para servicios backend"
  value = {
    PROJECT_ID                = var.project_id
    BUCKET_NAME              = google_storage_bucket.documents_bucket.name
    DATASET_ID               = google_bigquery_dataset.chat_history.dataset_id
    TABLE_ID                 = google_bigquery_table.conversations.table_id
    INDEX_ENDPOINT           = google_vertex_ai_index_endpoint.rag_index_endpoint.name
    DEPLOYED_INDEX_ID        = google_vertex_ai_index_endpoint_deployed_index.rag_deployed_index.deployed_index_id
    VECTOR_INDEX_NAME        = google_vertex_ai_index.rag_vector_index.name
    SERVICE_ACCOUNT_EMAIL    = google_service_account.rag_agent_sa.email
    REGION                   = var.region
  }
  sensitive = false
}

# Output con comandos útiles para desarrollo
output "useful_commands" {
  description = "Comandos útiles para interactuar con la infraestructura"
  value = {
    # Comandos gcloud para interactuar con los servicios
    view_logs_document_processor = "gcloud run services logs read ${google_cloud_run_v2_service.document_processor.name} --region=${var.region}"
    view_logs_rag_backend       = "gcloud run services logs read ${google_cloud_run_v2_service.rag_backend.name} --region=${var.region}"

    # Comandos para BigQuery
    query_conversations = "bq query --use_legacy_sql=false 'SELECT * FROM ${var.project_id}.${google_bigquery_dataset.chat_history.dataset_id}.${google_bigquery_table.conversations.table_id} LIMIT 10'"

    # Comandos para Cloud Storage
    list_documents = "gsutil ls gs://${google_storage_bucket.documents_bucket.name}/"

    # Comandos para obtener credenciales de servicio
    create_service_key = "gcloud iam service-accounts keys create rag-service-key.json --iam-account=${google_service_account.rag_agent_sa.email}"
  }
}

# Output resumen para fácil referencia
output "infrastructure_summary" {
  description = "Resumen de la infraestructura desplegada"
  value = {
    document_storage = {
      bucket_name = google_storage_bucket.documents_bucket.name
      bucket_url  = google_storage_bucket.documents_bucket.url
    }
    vector_search = {
      index_name     = google_vertex_ai_index.rag_vector_index.name
      endpoint_name  = google_vertex_ai_index_endpoint.rag_index_endpoint.name
      deployed_id    = google_vertex_ai_index_endpoint_deployed_index.rag_deployed_index.deployed_index_id
    }
    chat_storage = {
      dataset_id = google_bigquery_dataset.chat_history.dataset_id
      table_id   = google_bigquery_table.conversations.table_id
    }
    services = {
      document_processor_url = google_cloud_run_v2_service.document_processor.uri
      rag_backend_url       = google_cloud_run_v2_service.rag_backend.uri
    }
    security = {
      service_account = google_service_account.rag_agent_sa.email
    }
  }
}