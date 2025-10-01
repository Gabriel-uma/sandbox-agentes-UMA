"""
Gestión de historial de conversaciones en BigQuery
"""
import os
import uuid
from datetime import datetime
from typing import List, Dict, Optional
from google.cloud import bigquery
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ConversationManager:
    """Gestiona conversaciones en BigQuery"""

    def __init__(self):
        self.project_id = os.environ.get('PROJECT_ID')
        self.dataset_id = os.environ.get('DATASET_ID', 'rag_chat_history')
        self.table_id = os.environ.get('TABLE_ID', 'conversations')

        if not self.project_id:
            raise ValueError("PROJECT_ID environment variable is required")

        self.client = bigquery.Client(project=self.project_id)
        self.table_ref = f"{self.project_id}.{self.dataset_id}.{self.table_id}"

        logger.info(f"Conversation manager initialized for table {self.table_ref}")

    def save_conversation_turn(
        self,
        conversation_id: str,
        user_question: str,
        assistant_answer: str,
        sources: List[str],
        confidence: float,
        metadata: Dict = None
    ) -> bool:
        """
        Guarda un turno de conversación (pregunta + respuesta)

        Args:
            conversation_id: ID único de la conversación
            user_question: Pregunta del usuario
            assistant_answer: Respuesta del asistente
            sources: Lista de IDs de documentos usados como fuente
            confidence: Score de confianza
            metadata: Metadata adicional (opcional)

        Returns:
            True si se guardó exitosamente
        """
        try:
            timestamp = datetime.utcnow().isoformat()

            rows_to_insert = [
                {
                    'conversation_id': conversation_id,
                    'timestamp': timestamp,
                    'user_message': user_question,
                    'assistant_message': assistant_answer,
                    'sources': sources,
                    'confidence': confidence,
                    'metadata': metadata or {}
                }
            ]

            errors = self.client.insert_rows_json(self.table_ref, rows_to_insert)

            if errors:
                logger.error(f"Errors inserting rows: {errors}")
                return False

            logger.info(f"Conversation turn saved for {conversation_id}")
            return True

        except Exception as e:
            logger.error(f"Error saving conversation: {str(e)}")
            return False

    def get_conversation_history(
        self,
        conversation_id: str,
        limit: int = 50
    ) -> List[Dict[str, any]]:
        """
        Recupera el historial de una conversación

        Args:
            conversation_id: ID de la conversación
            limit: Número máximo de mensajes a recuperar

        Returns:
            Lista de mensajes ordenados por timestamp
        """
        try:
            query = f"""
                SELECT
                    conversation_id,
                    timestamp,
                    user_message,
                    assistant_message,
                    sources,
                    confidence,
                    metadata
                FROM `{self.table_ref}`
                WHERE conversation_id = @conversation_id
                ORDER BY timestamp ASC
                LIMIT @limit
            """

            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("conversation_id", "STRING", conversation_id),
                    bigquery.ScalarQueryParameter("limit", "INT64", limit)
                ]
            )

            query_job = self.client.query(query, job_config=job_config)
            results = query_job.result()

            messages = []
            for row in results:
                # Agregar mensaje del usuario
                messages.append({
                    'type': 'user',
                    'content': row.user_message,
                    'timestamp': row.timestamp.isoformat() if hasattr(row.timestamp, 'isoformat') else str(row.timestamp)
                })

                # Agregar respuesta del asistente
                messages.append({
                    'type': 'assistant',
                    'content': row.assistant_message,
                    'timestamp': row.timestamp.isoformat() if hasattr(row.timestamp, 'isoformat') else str(row.timestamp),
                    'sources': row.sources,
                    'confidence': row.confidence
                })

            logger.info(f"Retrieved {len(messages)} messages for conversation {conversation_id}")
            return messages

        except Exception as e:
            logger.error(f"Error retrieving conversation history: {str(e)}")
            return []

    def list_recent_conversations(
        self,
        limit: int = 10
    ) -> List[Dict[str, any]]:
        """
        Lista las conversaciones más recientes

        Args:
            limit: Número de conversaciones a retornar

        Returns:
            Lista de conversaciones con metadata
        """
        try:
            query = f"""
                SELECT
                    conversation_id,
                    MAX(timestamp) as last_message_time,
                    COUNT(*) as message_count
                FROM `{self.table_ref}`
                GROUP BY conversation_id
                ORDER BY last_message_time DESC
                LIMIT @limit
            """

            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("limit", "INT64", limit)
                ]
            )

            query_job = self.client.query(query, job_config=job_config)
            results = query_job.result()

            conversations = []
            for row in results:
                conversations.append({
                    'conversation_id': row.conversation_id,
                    'last_message_time': row.last_message_time.isoformat() if hasattr(row.last_message_time, 'isoformat') else str(row.last_message_time),
                    'message_count': row.message_count
                })

            logger.info(f"Retrieved {len(conversations)} recent conversations")
            return conversations

        except Exception as e:
            logger.error(f"Error listing recent conversations: {str(e)}")
            return []

    def delete_conversation(self, conversation_id: str) -> bool:
        """
        Elimina una conversación completa

        Args:
            conversation_id: ID de la conversación a eliminar

        Returns:
            True si se eliminó exitosamente
        """
        try:
            query = f"""
                DELETE FROM `{self.table_ref}`
                WHERE conversation_id = @conversation_id
            """

            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("conversation_id", "STRING", conversation_id)
                ]
            )

            query_job = self.client.query(query, job_config=job_config)
            query_job.result()

            logger.info(f"Deleted conversation {conversation_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting conversation: {str(e)}")
            return False
