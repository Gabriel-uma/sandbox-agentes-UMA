"""
Pinecone index manager for ultra-fast document indexing.
"""
import logging
import os
from typing import List, Dict, Any, Optional
from pinecone import Pinecone, ServerlessSpec

logger = logging.getLogger(__name__)


class PineconeManager:
    """Manages Pinecone vector index for fast document indexing."""

    def __init__(self) -> None:
        self.api_key = os.environ.get("PINECONE_API_KEY")
        self.index_name = os.environ.get("PINECONE_INDEX_NAME", "rag-documents")

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

    def upsert_embeddings(
        self,
        document_id: str,
        chunks: List[str],
        embeddings: List[List[float]],
    ) -> Dict[str, Any]:
        """
        Upsert embeddings to Pinecone index (SUPER FAST - milliseconds).

        Args:
            document_id: Unique document identifier
            chunks: List of text chunks
            embeddings: List of embedding vectors

        Returns:
            Dictionary with upsert results
        """
        try:
            # Prepare vectors for Pinecone
            vectors = []
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                vector_id = f"{document_id}_chunk_{i}"
                metadata = {
                    "document_id": document_id,
                    "chunk_index": i,
                    "text": chunk[:1000],  # Limit text size in metadata
                }
                vectors.append({
                    "id": vector_id,
                    "values": embedding,
                    "metadata": metadata
                })

            # Upsert to Pinecone (FAST - typically <100ms)
            logger.info(f"Upserting {len(vectors)} vectors to Pinecone for document {document_id}")
            upsert_response = self.index.upsert(vectors=vectors)

            logger.info(f"✅ Successfully upserted {upsert_response['upserted_count']} vectors to Pinecone")

            return {
                "success": True,
                "upserted_count": upsert_response['upserted_count'],
                "document_id": document_id
            }

        except Exception as e:
            logger.error(f"Failed to upsert to Pinecone: {str(e)}", exc_info=True)
            raise

    def delete_document(self, document_id: str) -> bool:
        """Delete all vectors for a document."""
        try:
            # Delete by prefix (all chunks of this document)
            self.index.delete(
                filter={"document_id": {"$eq": document_id}}
            )
            logger.info(f"Deleted vectors for document {document_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document {document_id}: {str(e)}")
            return False

    def get_index_stats(self) -> Dict[str, Any]:
        """Get index statistics."""
        try:
            stats = self.index.describe_index_stats()
            return {
                "total_vectors": stats.get('total_vector_count', 0),
                "dimension": stats.get('dimension', 0),
            }
        except Exception as e:
            logger.error(f"Failed to get index stats: {str(e)}")
            return {"error": str(e)}
