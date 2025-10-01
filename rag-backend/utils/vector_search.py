"""
Búsqueda vectorial usando Vertex AI Matching Engine
"""
import os
from typing import List, Dict, Tuple
from google.cloud import aiplatform
from vertexai.language_models import TextEmbeddingModel
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VectorSearch:
    """Gestiona búsquedas vectoriales en Vertex AI"""

    def __init__(self):
        self.project_id = os.environ.get('PROJECT_ID')
        self.region = os.environ.get('REGION', 'us-central1')
        self.index_endpoint = os.environ.get('INDEX_ENDPOINT')
        self.deployed_index_id = os.environ.get('DEPLOYED_INDEX_ID', 'rag-deployed-index')

        if not self.project_id:
            raise ValueError("PROJECT_ID environment variable is required")

        aiplatform.init(project=self.project_id, location=self.region)

        # Inicializar modelo de embeddings para queries
        self.embedding_model = TextEmbeddingModel.from_pretrained("textembedding-gecko@003")

        logger.info(f"Vector search initialized for project {self.project_id}")

    def search_similar_documents(
        self,
        query: str,
        top_k: int = 5
    ) -> List[Dict[str, any]]:
        """
        Busca documentos similares usando búsqueda vectorial

        Args:
            query: Pregunta del usuario
            top_k: Número de resultados a retornar

        Returns:
            Lista de documentos similares con scores
        """
        try:
            # 1. Generar embedding de la query
            logger.info(f"Generating embedding for query: {query[:50]}...")
            query_embedding = self.embedding_model.get_embeddings([query])[0].values

            # 2. Buscar en el índice (simulado por ahora si no hay index_endpoint)
            if not self.index_endpoint:
                logger.warning("INDEX_ENDPOINT not configured, returning mock results")
                return self._mock_search_results(query, top_k)

            # 3. Realizar búsqueda real en Vertex AI Matching Engine
            # Nota: La implementación completa requiere que el índice esté desplegado
            try:
                endpoint = aiplatform.MatchingEngineIndexEndpoint(
                    index_endpoint_name=self.index_endpoint
                )

                response = endpoint.find_neighbors(
                    deployed_index_id=self.deployed_index_id,
                    queries=[query_embedding],
                    num_neighbors=top_k
                )

                results = []
                if response and len(response) > 0:
                    for neighbor in response[0]:
                        results.append({
                            'id': neighbor.id,
                            'distance': neighbor.distance,
                            'score': 1.0 - neighbor.distance  # Convertir distancia a score
                        })

                logger.info(f"Found {len(results)} similar documents")
                return results

            except Exception as e:
                logger.warning(f"Error querying index endpoint: {str(e)}, using mock results")
                return self._mock_search_results(query, top_k)

        except Exception as e:
            logger.error(f"Error in vector search: {str(e)}")
            raise

    def _mock_search_results(self, query: str, top_k: int) -> List[Dict[str, any]]:
        """
        Genera resultados mock cuando el índice no está disponible
        """
        return [
            {
                'id': f'doc_{i}_chunk_0',
                'distance': 0.1 + (i * 0.05),
                'score': 0.9 - (i * 0.05)
            }
            for i in range(min(top_k, 3))
        ]

    def get_query_embedding(self, query: str) -> List[float]:
        """
        Genera embedding para una query

        Args:
            query: Texto de la query

        Returns:
            Vector de embedding
        """
        embedding = self.embedding_model.get_embeddings([query])[0]
        return embedding.values
