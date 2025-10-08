"""
Embedding generation helper with Vertex AI fallback support.
"""
import logging
import os
from typing import List, Optional

from google.api_core import exceptions as google_exceptions
from google.cloud import aiplatform
from vertexai.language_models import TextEmbeddingModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmbeddingGenerator:
    """Generates embeddings using Vertex AI Text Embeddings."""

    DEFAULT_MODEL = "text-embedding-004"
    DEFAULT_FALLBACKS = ("text-multilingual-embedding-002", "textembedding-gecko@003", "textembedding-gecko@001")

    def __init__(self):
        self.project_id = os.environ.get("PROJECT_ID")
        self.region = os.environ.get("REGION", "us-central1")

        if not self.project_id:
            raise ValueError("PROJECT_ID environment variable is required")

        aiplatform.init(project=self.project_id, location=self.region)

        configured_model = os.environ.get("EMBEDDING_MODEL_NAME", self.DEFAULT_MODEL)
        extra_fallbacks = self._parse_fallbacks(os.environ.get("EMBEDDING_FALLBACK_MODELS"))
        candidates = self._build_candidate_list(configured_model, extra_fallbacks)

        self.model_name: Optional[str] = None
        self.model = self._initialize_first_available(candidates)

        if not self.model:
            tried = ", ".join(candidates)
            raise RuntimeError(
                "Unable to initialize any embedding model. "
                f"Tried: {tried}. Please verify model availability and permissions."
            )

        logger.info(
            "Embedding model '%s' initialized for project %s in region %s",
            self.model_name,
            self.project_id,
            self.region,
        )

    @staticmethod
    def _parse_fallbacks(raw: Optional[str]) -> List[str]:
        if not raw:
            return []
        return [item.strip() for item in raw.split(",") if item.strip()]

    def _build_candidate_list(self, primary: str, extra: List[str]) -> List[str]:
        candidates: List[str] = []
        for name in [primary, *extra, *self.DEFAULT_FALLBACKS]:
            if name and name not in candidates:
                candidates.append(name)
        return candidates

    def _initialize_first_available(self, candidates: List[str]):
        last_error: Optional[Exception] = None
        for name in candidates:
            try:
                model = TextEmbeddingModel.from_pretrained(name)
                self.model_name = name
                return model
            except (google_exceptions.NotFound, google_exceptions.PermissionDenied) as exc:
                logger.warning(
                    "Embedding model '%s' not accessible: %s", name, exc
                )
                last_error = exc
            except Exception as exc:
                logger.error(
                    "Unexpected error loading embedding model '%s': %s", name, exc
                )
                raise

        if last_error:
            logger.error(
                "Failed to initialize embedding model after trying %s candidates. Last error: %s",
                len(candidates),
                last_error,
            )
        else:
            logger.error(
                "No embedding models tried could be initialized. Candidates: %s",
                candidates,
            )
        return None

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generates embeddings for a list of texts."""
        if not self.model:
            raise RuntimeError("Embedding model is not initialized")

        try:
            embeddings: List[List[float]] = []
            batch_size = 5  # Vertex AI can process up to 5 texts per request

            for i in range(0, len(texts), batch_size):
                batch = texts[i : i + batch_size]
                batch_embeddings = self.model.get_embeddings(batch)

                for embedding in batch_embeddings:
                    embeddings.append(embedding.values)

            logger.info("Generated %s embeddings using model '%s'", len(embeddings), self.model_name)
            return embeddings

        except Exception as exc:
            logger.error("Error generating embeddings with model '%s': %s", self.model_name, exc)
            raise

    def generate_single_embedding(self, text: str) -> List[float]:
        """Generates an embedding for a single text."""
        embeddings = self.generate_embeddings([text])
        return embeddings[0] if embeddings else []
