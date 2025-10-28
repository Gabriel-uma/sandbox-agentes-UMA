"""
Gestión de historial de conversaciones en BigQuery
"""
import json
import os
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
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
        sources: Optional[List[Any]],
        confidence: float,
        metadata: Optional[Dict] = None
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
            timestamp = datetime.utcnow()
            assistant_timestamp = timestamp + timedelta(milliseconds=1)

            assistant_metadata = dict(metadata or {})
            assistant_metadata['confidence'] = confidence

            formatted_sources: List[Dict[str, Any]] = []
            if sources:
                for source in sources:
                    if isinstance(source, dict):
                        document_id = str(
                            source.get('id')
                            or source.get('document_id')
                            or source.get('documentId')
                            or source.get('key')
                            or ''
                        ).strip()
                        document_name = (
                            source.get('name')
                            or source.get('title')
                            or document_id
                        )
                    else:
                        document_id = str(source).strip()
                        document_name = document_id

                    if not document_id:
                        document_id = document_name or ''

                    formatted_sources.append({
                        'id': document_id,
                        'name': document_name or document_id
                    })

            assistant_metadata['sources'] = formatted_sources

            rows_to_insert = [
                {
                    'conversation_id': conversation_id,
                    'user_id': None,
                    'message_type': 'user',
                    'content': user_question,
                    'timestamp': timestamp.isoformat(),
                    'metadata': json.dumps({
                        'role': 'user'
                    })
                },
                {
                    'conversation_id': conversation_id,
                    'user_id': None,
                    'message_type': 'assistant',
                    'content': assistant_answer,
                    'timestamp': assistant_timestamp.isoformat(),
                    'metadata': json.dumps(assistant_metadata)
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
    ) -> List[Dict[str, Any]]:
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
                    message_type,
                    content,
                    timestamp,
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
                raw_metadata = row.metadata
                metadata: Dict[str, Any] = {}
                if raw_metadata:
                    if isinstance(raw_metadata, dict):
                        metadata = raw_metadata
                    elif isinstance(raw_metadata, str):
                        try:
                            metadata = json.loads(raw_metadata)
                        except json.JSONDecodeError:
                            logger.warning("Failed to decode metadata JSON for conversation %s", conversation_id)
                            metadata = {}
                message_type = (row.message_type or '').lower()

                message = {
                    'type': 'assistant' if message_type == 'assistant' else 'user',
                    'content': row.content,
                    'timestamp': row.timestamp.isoformat() if hasattr(row.timestamp, 'isoformat') else str(row.timestamp)
                }

                if message['type'] == 'assistant':
                    sources = metadata.get('sources')
                    if isinstance(sources, list):
                        formatted_sources: List[str] = []
                        for source in sources:
                            if isinstance(source, dict):
                                label = source.get('name') or source.get('id')
                                if label is None:
                                    label = json.dumps(source, ensure_ascii=False)
                            else:
                                label = str(source)

                            if label:
                                formatted_sources.append(label)
                        if formatted_sources:
                            message['sources'] = formatted_sources
                    confidence = metadata.get('confidence')
                    if confidence is not None:
                        message['confidence'] = float(confidence)

                messages.append(message)

            logger.info(f"Retrieved {len(messages)} messages for conversation {conversation_id}")
            return messages

        except Exception as e:
            logger.error(f"Error retrieving conversation history: {str(e)}")
            return []

    def list_recent_conversations(
        self,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
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

    def get_usage_summary(
        self,
        days: int = 30,
        document_limit: int = 50
    ) -> Dict[str, Any]:
        """
        Obtiene métricas agregadas de uso para la base de conocimiento.

        Args:
            days: Intervalo (en días) a considerar. Si es <= 0, se usa todo el histórico.
            document_limit: Número máximo de documentos a devolver en ranking.

        Returns:
            Diccionario con métricas de uso y ranking de documentos.
        """
        summary = {
            'summary': {
                'total_queries': 0,
                'avg_latency_ms': 0.0,
                'avg_total_tokens': 0.0,
                'avg_prompt_tokens': 0.0,
                'avg_response_tokens': 0.0,
                'total_tokens': 0.0
            },
            'documents': []
        }

        try:
            summary_query = f"""
                SELECT
                    COUNT(*) AS total_queries,
                    AVG(SAFE_CAST(JSON_VALUE(metadata, '$.latency_ms') AS FLOAT64)) AS avg_latency_ms,
                    AVG(SAFE_CAST(JSON_VALUE(metadata, '$.token_usage.total_tokens') AS FLOAT64)) AS avg_total_tokens,
                    AVG(SAFE_CAST(JSON_VALUE(metadata, '$.token_usage.prompt_tokens') AS FLOAT64)) AS avg_prompt_tokens,
                    AVG(SAFE_CAST(JSON_VALUE(metadata, '$.token_usage.response_tokens') AS FLOAT64)) AS avg_response_tokens,
                    SUM(SAFE_CAST(JSON_VALUE(metadata, '$.token_usage.total_tokens') AS FLOAT64)) AS total_tokens
                FROM `{self.table_ref}`
                WHERE message_type = 'assistant'
                  AND ((@days <= 0)
                       OR timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY))
            """

            summary_job = self.client.query(
                summary_query,
                job_config=bigquery.QueryJobConfig(
                    query_parameters=[
                        bigquery.ScalarQueryParameter("days", "INT64", days)
                    ]
                )
            )

            summary_row = next(iter(summary_job.result()), None)

            if summary_row:
                summary['summary'] = {
                    'total_queries': int(summary_row.total_queries or 0),
                    'avg_latency_ms': float(summary_row.avg_latency_ms or 0.0),
                    'avg_total_tokens': float(summary_row.avg_total_tokens or 0.0),
                    'avg_prompt_tokens': float(summary_row.avg_prompt_tokens or 0.0),
                    'avg_response_tokens': float(summary_row.avg_response_tokens or 0.0),
                    'total_tokens': float(summary_row.total_tokens or 0.0)
                }

            documents_query = f"""
                SELECT
                    COALESCE(
                        JSON_VALUE(source, '$.id'),
                        JSON_VALUE(source, '$')
                    ) AS document_id,
                    COUNT(*) AS query_count
                FROM `{self.table_ref}`
                CROSS JOIN UNNEST(JSON_QUERY_ARRAY(metadata, '$.sources')) AS source
                WHERE message_type = 'assistant'
                  AND COALESCE(
                        JSON_VALUE(source, '$.id'),
                        JSON_VALUE(source, '$')
                      ) IS NOT NULL
                  AND COALESCE(
                        JSON_VALUE(source, '$.id'),
                        JSON_VALUE(source, '$')
                      ) != ''
                  AND ((@days <= 0)
                       OR timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY))
                GROUP BY document_id
                ORDER BY query_count DESC
                LIMIT @doc_limit
            """

            documents_job = self.client.query(
                documents_query,
                job_config=bigquery.QueryJobConfig(
                    query_parameters=[
                        bigquery.ScalarQueryParameter("days", "INT64", days),
                        bigquery.ScalarQueryParameter("doc_limit", "INT64", document_limit)
                    ]
                )
            )

            documents = []
            for row in documents_job.result():
                documents.append({
                    'document_id': row.document_id,
                    'query_count': int(row.query_count or 0)
                })

            summary['documents'] = documents

        except Exception as e:
            logger.error(f"Error retrieving usage summary: {str(e)}")

        return summary

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
