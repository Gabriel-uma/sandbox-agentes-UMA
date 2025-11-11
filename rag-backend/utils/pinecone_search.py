"""
Pinecone vector search for ultra-fast RAG queries.
"""
import logging
import os
from typing import List, Dict, Any
from pinecone import Pinecone
from vertexai.language_models import TextEmbeddingModel
from google.cloud import aiplatform

logger = logging.getLogger(__name__)


class PineconeSearch:
    """Fast vector search using Pinecone."""

    def __init__(self) -> None:
        self.api_key = os.environ.get("PINECONE_API_KEY")
        self.index_name = os.environ.get("PINECONE_INDEX_NAME", "rag-documents")
        self.project_id = os.environ.get("PROJECT_ID")
        self.region = os.environ.get("REGION", "us-central1")

        if not self.api_key:
            raise ValueError("PINECONE_API_KEY environment variable is required")

        # Initialize Pinecone client
        self.pc = Pinecone(api_key=self.api_key)

        # Get index
        try:
            self.index = self.pc.Index(self.index_name)
            logger.info(f"Connected to Pinecone index: {self.index_name}")
        except Exception as e:
            logger.error(f"Failed to connect to Pinecone index {self.index_name}: {e}")
            raise

        # Initialize embedding model
        aiplatform.init(project=self.project_id, location=self.region)
        embedding_model_name = os.environ.get("EMBEDDING_MODEL_NAME", "text-embedding-004")
        try:
            self.embedding_model = TextEmbeddingModel.from_pretrained(embedding_model_name)
            logger.info(f"Loaded embedding model: {embedding_model_name}")
        except Exception as exc:
            logger.error(f"Failed to load embedding model: {exc}")
            raise

    def search_similar_documents(
        self,
        query: str,
        top_k: int = 5,
        filter_dict: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents using vector similarity.

        Args:
            query: Natural language question from the user
            top_k: Number of results to return
            filter_dict: Optional metadata filter

        Returns:
            List of matching results with id, score, and metadata
        """
        try:
            logger.info(f"🚀 Generating embedding for query: {query[:50]}...")
            query_embedding = self.embedding_model.get_embeddings([query])[0].values

            logger.info(f"🔍 Searching Pinecone for top {top_k} results")

            # Query Pinecone (ULTRA FAST - typically <50ms)
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                filter=filter_dict
            )

            # Format results
            formatted_results = []
            for match in results.get('matches', []):
                formatted_results.append({
                    'id': match['id'],
                    'score': match['score'],
                    'document_id': match.get('metadata', {}).get('document_id', ''),
                    'chunk_index': match.get('metadata', {}).get('chunk_index', 0),
                    'text': match.get('metadata', {}).get('text', '')
                })

            logger.info(f"✅ Found {len(formatted_results)} results from Pinecone")
            return formatted_results

        except Exception as e:
            logger.error(f"❌ Error searching Pinecone: {str(e)}", exc_info=True)
            return []

    def get_index_stats(self) -> Dict[str, Any]:
        """Get Pinecone index statistics."""
        try:
            stats = self.index.describe_index_stats()
            return {
                "total_vectors": stats.get('total_vector_count', 0),
                "dimension": stats.get('dimension', 0),
                "index_fullness": stats.get('index_fullness', 0)
            }
        except Exception as e:
            logger.error(f"Failed to get Pinecone stats: {str(e)}")
            return {"error": str(e)}
