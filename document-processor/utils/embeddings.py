"""
Generación de embeddings usando Vertex AI
"""
import os
from typing import List
from google.cloud import aiplatform
from vertexai.language_models import TextEmbeddingModel
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmbeddingGenerator:
    """Genera embeddings usando Vertex AI Text Embeddings"""

    def __init__(self):
        project_id = os.environ.get('PROJECT_ID')
        region = os.environ.get('REGION', 'us-central1')

        if not project_id:
            raise ValueError("PROJECT_ID environment variable is required")

        aiplatform.init(project=project_id, location=region)
        self.model = TextEmbeddingModel.from_pretrained("textembedding-gecko@003")
        logger.info(f"Embedding model initialized for project {project_id}")

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Genera embeddings para una lista de textos

        Args:
            texts: Lista de strings para generar embeddings

        Returns:
            Lista de vectores de embeddings (768 dimensiones)
        """
        try:
            # Vertex AI puede procesar hasta 5 textos por request
            embeddings = []
            batch_size = 5

            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                batch_embeddings = self.model.get_embeddings(batch)

                for embedding in batch_embeddings:
                    embeddings.append(embedding.values)

            logger.info(f"Generated {len(embeddings)} embeddings")
            return embeddings

        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            raise

    def generate_single_embedding(self, text: str) -> List[float]:
        """
        Genera embedding para un solo texto

        Args:
            text: String para generar embedding

        Returns:
            Vector de embedding (768 dimensiones)
        """
        embeddings = self.generate_embeddings([text])
        return embeddings[0] if embeddings else []
