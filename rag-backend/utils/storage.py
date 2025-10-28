"""
Recuperación de chunks de documentos desde Cloud Storage
"""
import os
import json
from typing import List, Dict, Optional
from google.cloud import storage
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class StorageRetriever:
    """Recupera información de documentos desde GCS"""

    def __init__(self):
        self.project_id = os.environ.get('PROJECT_ID')
        self.bucket_name = os.environ.get('BUCKET_NAME')

        if not self.project_id or not self.bucket_name:
            raise ValueError("PROJECT_ID and BUCKET_NAME environment variables are required")

        self.client = storage.Client(project=self.project_id)
        self.bucket = self.client.bucket(self.bucket_name)
        self._metadata_cache: Dict[str, Dict] = {}
        self._label_cache: Dict[str, str] = {}

        logger.info(f"Storage retriever initialized for bucket: {self.bucket_name}")

    def get_chunk_by_id(self, chunk_id: str) -> Dict[str, any]:
        """
        Recupera un chunk específico por su ID

        Args:
            chunk_id: ID del chunk (formato: document_id_chunk_index)

        Returns:
            Dict con información del chunk
        """
        try:
            # Parsear el ID para obtener document_id y chunk_index
            parts = chunk_id.rsplit('_chunk_', 1)
            if len(parts) != 2:
                logger.warning(f"Invalid chunk_id format: {chunk_id}")
                return {}

            document_id = parts[0]
            chunk_index = int(parts[1])

            # Recuperar chunks del documento
            chunks = self.get_document_chunks(document_id)

            if chunk_index < len(chunks):
                return {
                    'chunk_id': chunk_id,
                    'document_id': document_id,
                    'chunk_index': chunk_index,
                    'text': chunks[chunk_index]
                }

            return {}

        except Exception as e:
            logger.error(f"Error retrieving chunk {chunk_id}: {str(e)}")
            return {}

    def get_document_chunks(self, document_id: str) -> List[str]:
        """
        Recupera todos los chunks de un documento

        Args:
            document_id: ID del documento

        Returns:
            Lista de chunks de texto
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
            logger.error(f"Error retrieving chunks for document {document_id}: {str(e)}")
            return []

    def get_chunks_by_ids(self, chunk_ids: List[str]) -> List[str]:
        """
        Recupera múltiples chunks por sus IDs

        Args:
            chunk_ids: Lista de IDs de chunks

        Returns:
            Lista de textos de chunks
        """
        chunks = []

        for chunk_id in chunk_ids:
            chunk_data = self.get_chunk_by_id(chunk_id)
            if chunk_data and 'text' in chunk_data:
                chunks.append(chunk_data['text'])

        logger.info(f"Retrieved {len(chunks)} chunks from {len(chunk_ids)} IDs")
        return chunks

    def get_document_metadata(self, document_id: str) -> Optional[Dict]:
        """
        Obtiene metadata almacenada para un documento, con caché simple.
        """
        if document_id in self._metadata_cache:
            return self._metadata_cache[document_id]

        try:
            blob_name = f"metadata/{document_id}.json"
            blob = self.bucket.blob(blob_name)

            if not blob.exists():
                logger.warning(f"Metadata not found for document {document_id}")
                return None

            metadata = json.loads(blob.download_as_string())
            self._metadata_cache[document_id] = metadata
            return metadata

        except Exception as e:
            logger.error(f"Error retrieving metadata for document {document_id}: {str(e)}")
            return None

    def get_document_label(self, document_id: str) -> str:
        """
        Devuelve un nombre legible para el documento (filename si está disponible).
        """
        if document_id in self._label_cache:
            return self._label_cache[document_id]

        metadata = self.get_document_metadata(document_id)
        if metadata:
            label = metadata.get('filename') or metadata.get('name')
            if label:
                self._label_cache[document_id] = label
                return label

        # Fallback: intentar derivar un título a partir del primer chunk
        chunks = self.get_document_chunks(document_id)
        if chunks:
            first_chunk = chunks[0]
            keywords = ['guía', 'servicio', 'servicios', 'hospital', 'centro', 'centros', 'manual', 'documento', 'informe', 'programa', 'listado', 'lista', 'reporte']
            candidates_long: List[str] = []
            candidates_general: List[str] = []

            for raw_line in first_chunk.splitlines():
                cleaned = raw_line.strip().strip("•*-_|—")
                if not cleaned:
                    continue
                if cleaned.lower().startswith('http'):
                    continue

                normalized = ' '.join(cleaned.split())
                lowered = normalized.lower()

                if any(keyword in lowered for keyword in keywords) and ' ' in normalized and len(normalized) >= 18:
                    label = normalized[:80]
                    self._label_cache[document_id] = label
                    return label

                if len(normalized) >= 60 and ' ' in normalized:
                    candidates_long.append(normalized)
                else:
                    candidates_general.append(normalized)

            if candidates_long:
                label = candidates_long[0][:80]
                self._label_cache[document_id] = label
                return label

            if candidates_general:
                label = candidates_general[0][:80]
                self._label_cache[document_id] = label
                return label

        # Último recurso: retornar el ID
        self._label_cache[document_id] = document_id
        return document_id
