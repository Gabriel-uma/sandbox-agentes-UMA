"""
Interacción con Google Cloud Storage
"""
import os
import json
from typing import List, Dict
from google.cloud import storage
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class StorageManager:
    """Gestiona operaciones con Google Cloud Storage"""

    def __init__(self):
        self.project_id = os.environ.get('PROJECT_ID')
        self.bucket_name = os.environ.get('BUCKET_NAME')

        if not self.project_id or not self.bucket_name:
            raise ValueError("PROJECT_ID and BUCKET_NAME environment variables are required")

        self.client = storage.Client(project=self.project_id)
        self.bucket = self.client.bucket(self.bucket_name)
        logger.info(f"Storage manager initialized for bucket: {self.bucket_name}")

    def upload_document(self, file_path: str, document_id: str, original_filename: str) -> str:
        """
        Sube un documento al bucket

        Args:
            file_path: Ruta local del archivo
            document_id: ID único del documento
            original_filename: Nombre original del archivo

        Returns:
            GCS URI del documento subido
        """
        try:
            blob_name = f"documents/{document_id}/{original_filename}"
            blob = self.bucket.blob(blob_name)

            blob.upload_from_filename(file_path)
            blob.metadata = {
                'document_id': document_id,
                'original_filename': original_filename
            }
            blob.patch()

            gcs_uri = f"gs://{self.bucket_name}/{blob_name}"
            logger.info(f"Document uploaded to {gcs_uri}")
            return gcs_uri

        except Exception as e:
            logger.error(f"Error uploading document: {str(e)}")
            raise

    def upload_text_chunks(self, document_id: str, chunks: List[str]) -> str:
        """
        Sube chunks de texto procesado

        Args:
            document_id: ID del documento
            chunks: Lista de chunks de texto

        Returns:
            GCS URI de los chunks
        """
        try:
            blob_name = f"processed/{document_id}/chunks.json"
            blob = self.bucket.blob(blob_name)

            chunks_data = {
                'document_id': document_id,
                'chunks': chunks,
                'total_chunks': len(chunks)
            }

            blob.upload_from_string(
                json.dumps(chunks_data, ensure_ascii=False),
                content_type='application/json'
            )

            gcs_uri = f"gs://{self.bucket_name}/{blob_name}"
            logger.info(f"Chunks uploaded to {gcs_uri}")
            return gcs_uri

        except Exception as e:
            logger.error(f"Error uploading chunks: {str(e)}")
            raise

    def upload_embeddings_metadata(
        self,
        document_id: str,
        embeddings: List[List[float]],
        chunks: List[str]
    ) -> str:
        """
        Sube metadata de embeddings para indexación en Vertex AI

        Args:
            document_id: ID del documento
            embeddings: Lista de vectores de embeddings
            chunks: Lista de chunks correspondientes

        Returns:
            GCS URI del archivo de metadata
        """
        try:
            # Formato esperado por Vertex AI Vector Search
            blob_name = f"index/{document_id}/embeddings.json"
            blob = self.bucket.blob(blob_name)

            # Crear archivo JSON Lines con formato de Vertex AI
            jsonl_data = []
            for idx, (embedding, chunk) in enumerate(zip(embeddings, chunks)):
                jsonl_data.append(json.dumps({
                    "id": f"{document_id}_chunk_{idx}",
                    "embedding": embedding,
                    "restricts": [
                        {"namespace": "document_id", "allow": [document_id]}
                    ],
                    "metadata": {
                        "chunk_text": chunk[:500],  # Limitar a 500 chars
                        "chunk_index": idx,
                        "document_id": document_id
                    }
                }, ensure_ascii=False))

            blob.upload_from_string(
                '\n'.join(jsonl_data),
                content_type='application/json'
            )

            gcs_uri = f"gs://{self.bucket_name}/{blob_name}"
            logger.info(f"Embeddings metadata uploaded to {gcs_uri}")
            return gcs_uri

        except Exception as e:
            logger.error(f"Error uploading embeddings metadata: {str(e)}")
            raise

    def get_document_chunks(self, document_id: str) -> List[str]:
        """
        Recupera chunks de un documento

        Args:
            document_id: ID del documento

        Returns:
            Lista de chunks
        """
        try:
            blob_name = f"processed/{document_id}/chunks.json"
            blob = self.bucket.blob(blob_name)

            if not blob.exists():
                logger.warning(f"Chunks not found for document {document_id}")
                return []

            data = json.loads(blob.download_as_string())
            return data.get('chunks', [])

        except Exception as e:
            logger.error(f"Error retrieving chunks: {str(e)}")
            return []
