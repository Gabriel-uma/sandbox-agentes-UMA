"""
Matching Engine index manager for importing embeddings from GCS.
"""
import logging
import os
from google.cloud import aiplatform

logger = logging.getLogger(__name__)


class IndexManager:
    """Handles uploads into a Vertex AI Matching Engine index via embeddings exports."""

    def __init__(self) -> None:
        self.project_id = os.environ.get("PROJECT_ID")
        self.region = os.environ.get("REGION", "us-central1")
        raw_index_id = os.environ.get("INDEX_ID")

        if not self.project_id:
            raise ValueError("PROJECT_ID environment variable is required")

        if not raw_index_id:
            raise ValueError("INDEX_ID environment variable is required for indexing embeddings")

        if raw_index_id.startswith("projects/"):
            self.index_resource = raw_index_id
        else:
            self.index_resource = f"projects/{self.project_id}/locations/{self.region}/indexes/{raw_index_id}"

        aiplatform.init(project=self.project_id, location=self.region)
        self.index = aiplatform.MatchingEngineIndex(index_name=self.index_resource)

        logger.info("Index manager initialized for %s", self.index_resource)

    def import_embeddings(self, embeddings_uri: str, *, complete_overwrite: bool = False) -> None:
        """Triggers an embeddings update using the JSONL stored at the provided GCS URI."""
        directory = self._extract_directory(embeddings_uri)
        logger.info(
            "Updating index %s with contents from %s (overwrite=%s)",
            self.index_resource,
            directory,
            complete_overwrite,
        )
        self.index.update_embeddings(
            contents_delta_uri=directory,
            is_complete_overwrite=complete_overwrite,
        )

    @staticmethod
    def _extract_directory(uri: str) -> str:
        if not uri.startswith("gs://"):
            raise ValueError(f"Expected a GCS URI, got: {uri}")
        if uri.endswith("/"):
            return uri.rstrip('/')
        if uri.endswith(".json") or uri.endswith(".jsonl"):
            parts = uri.rsplit('/', 1)
            if len(parts) == 1:
                raise ValueError(f"Cannot determine directory from URI: {uri}")
            return parts[0]
        parts = uri.rsplit('/', 1)
        if len(parts) == 1:
            raise ValueError(f"Cannot determine directory from URI: {uri}")
        return uri.rstrip('/')
