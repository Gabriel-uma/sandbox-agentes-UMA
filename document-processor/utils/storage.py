"""
Interacción con Google Cloud Storage
"""
import os
import json
from typing import List, Dict, Optional, Tuple

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
        """Sube un documento al bucket y retorna la URI en GCS."""
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
        """Sube chunks de texto procesado."""
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
        """Sube metadata de embeddings para indexación en Vertex AI."""
        try:
            blob_name = f"index/{document_id}/datapoints.json"
            blob = self.bucket.blob(blob_name)

            jsonl_data = []
            for idx, (embedding, chunk) in enumerate(zip(embeddings, chunks)):
                jsonl_data.append(json.dumps({
                    "id": f"{document_id}_chunk_{idx}",
                    "embedding": embedding,
                    "restricts": [
                        {"namespace": "document_id", "allow": [document_id]}
                    ],
                    "metadata": {
                        "chunk_text": chunk[:500],
                        "chunk_index": idx,
                        "document_id": document_id
                    }
                }, ensure_ascii=False))

            blob.upload_from_string(
                "\n".join(jsonl_data),
                content_type='application/json'
            )

            gcs_uri = f"gs://{self.bucket_name}/{blob_name}"
            logger.info(f"Embeddings metadata uploaded to {gcs_uri}")
            return gcs_uri

        except Exception as e:
            logger.error(f"Error uploading embeddings metadata: {str(e)}")
            raise

    def save_document_metadata(self, document_id: str, metadata: Dict) -> str:
        """Guarda metadata del documento en GCS."""
        try:
            blob_name = f"metadata/{document_id}.json"
            gcs_uri = f"gs://{self.bucket_name}/{blob_name}"

            metadata = {**metadata}
            metadata.setdefault('uris', {})['metadata'] = gcs_uri

            blob = self.bucket.blob(blob_name)
            blob.upload_from_string(
                json.dumps(metadata, ensure_ascii=False),
                content_type='application/json'
            )
            logger.info(f"Metadata saved to {gcs_uri}")
            return gcs_uri
        except Exception as e:
            logger.error(f"Error saving document metadata: {str(e)}")
            raise

    def list_documents(self) -> List[Dict]:
        """Devuelve la metadata de todos los documentos almacenados."""
        documents: List[Dict] = []
        try:
            for blob in self.client.list_blobs(self.bucket, prefix='metadata/'):
                if not blob.name.endswith('.json'):
                    continue
                try:
                    data = json.loads(blob.download_as_string())
                    documents.append(data)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid metadata format in {blob.name}")
            documents.sort(key=lambda doc: doc.get('uploaded_at', ''), reverse=True)
            return documents
        except Exception as e:
            logger.error(f"Error listing documents: {str(e)}")
            raise

    def delete_document(self, document_id: str) -> bool:
        """Elimina archivos y metadata asociados a un documento."""
        deleted_any = False
        try:
            prefixes = [
                f"documents/{document_id}/",
                f"processed/{document_id}/",
                f"index/{document_id}/"
            ]
            for prefix in prefixes:
                for blob in self.client.list_blobs(self.bucket, prefix=prefix):
                    blob.delete()
                    deleted_any = True

            metadata_blob = self.bucket.blob(f"metadata/{document_id}.json")
            if metadata_blob.exists():
                metadata_blob.delete()
                deleted_any = True

            if deleted_any:
                logger.info(f"Deleted document {document_id} from storage")
            else:
                logger.warning(f"No files found to delete for document {document_id}")
            return deleted_any
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {str(e)}")
            raise

    def get_document_metadata(self, document_id: str) -> Optional[Dict]:
        """Obtiene metadata almacenada para un documento."""
        try:
            metadata_blob = self.bucket.blob(f"metadata/{document_id}.json")
            if not metadata_blob.exists():
                return None
            return json.loads(metadata_blob.download_as_string())
        except Exception as e:
            logger.error(f"Error retrieving metadata for {document_id}: {str(e)}")
            raise

    def download_document_content(self, document_id: str) -> Tuple[bytes, str, str]:
        """Descarga el contenido del documento original."""
        metadata = self.get_document_metadata(document_id)
        if not metadata:
            raise FileNotFoundError(f"Metadata not found for document {document_id}")

        document_uri = metadata.get('uris', {}).get('document')
        if not document_uri:
            raise FileNotFoundError(f"Document URI not found for {document_id}")

        prefix = f"gs://{self.bucket_name}/"
        if not document_uri.startswith(prefix):
            raise ValueError(f"Invalid document URI: {document_uri}")

        blob_path = document_uri[len(prefix):]
        blob = self.bucket.blob(blob_path)
        if not blob.exists():
            raise FileNotFoundError(f"Document {document_id} not found in bucket")

        data = blob.download_as_bytes()
        filename = metadata.get('filename', os.path.basename(blob_path))
        mime_type = metadata.get('mime_type', blob.content_type or 'application/octet-stream')
        return data, filename, mime_type

    def get_document_chunks(self, document_id: str) -> List[str]:
        """Recupera chunks de un documento."""
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
