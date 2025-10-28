"""
Matching Engine index manager for importing embeddings from GCS.
"""
import logging
import os
import time
import threading
from typing import Optional
from google.cloud import aiplatform
from google.api_core import exceptions as google_exceptions
from google.api_core import retry

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

    def _do_import_embeddings_sync(
        self,
        directory: str,
        complete_overwrite: bool,
        max_retries: int,
        initial_delay: float
    ) -> None:
        """Internal method that performs the actual sync embedding import with retries."""
        last_error: Optional[Exception] = None
        delay = initial_delay

        for attempt in range(max_retries + 1):
            try:
                self.index.update_embeddings(
                    contents_delta_uri=directory,
                    is_complete_overwrite=complete_overwrite
                )
                logger.info("Successfully completed index update for %s", self.index_resource)
                return

            except google_exceptions.ResourceExhausted as e:
                last_error = e
                error_msg = str(e)

                # Check if it's a quota/concurrent operations error
                if "429" in error_msg or "quota" in error_msg.lower() or "concurrent" in error_msg.lower():
                    if attempt < max_retries:
                        wait_time = delay * (2 ** attempt)  # Exponential backoff
                        logger.warning(
                            "Quota exceeded (attempt %d/%d). Retrying in %.1f seconds... Error: %s",
                            attempt + 1,
                            max_retries,
                            wait_time,
                            error_msg
                        )
                        time.sleep(wait_time)
                        continue
                    else:
                        logger.error(
                            "Failed to update index after %d attempts due to quota limits: %s",
                            max_retries + 1,
                            error_msg
                        )
                        return  # Don't raise in background thread
                else:
                    logger.error("ResourceExhausted error (non-quota): %s", error_msg)
                    return

            except Exception as e:
                logger.error("Failed to update index in background: %s", str(e))
                return

        if last_error:
            logger.error("Background indexing failed after all retries: %s", str(last_error))

    def import_embeddings(
        self,
        embeddings_uri: str,
        *,
        complete_overwrite: bool = False,
        max_retries: int = 5,
        initial_delay: float = 2.0,
        async_mode: bool = True
    ) -> None:
        """
        Triggers an embeddings update using the JSONL stored at the provided GCS URI.

        Implements exponential backoff retry logic for quota exceeded errors (429).
        By default runs in async mode to avoid blocking the upload response.

        Args:
            embeddings_uri: GCS URI to the embeddings file/directory
            complete_overwrite: Whether to completely overwrite the index
            max_retries: Maximum number of retry attempts for quota errors
            initial_delay: Initial delay in seconds before first retry
            async_mode: If True, runs indexing in background thread (default: True)
        """
        directory = self._extract_directory(embeddings_uri)
        logger.info(
            "Updating index %s with contents from %s (overwrite=%s, async=%s)",
            self.index_resource,
            directory,
            complete_overwrite,
            async_mode
        )

        if async_mode:
            # Run indexing in background thread to avoid blocking HTTP response
            thread = threading.Thread(
                target=self._do_import_embeddings_sync,
                args=(directory, complete_overwrite, max_retries, initial_delay),
                daemon=True
            )
            thread.start()
            logger.info("Indexing started in background thread for %s", self.index_resource)
        else:
            # Run synchronously (for testing or when immediate result is needed)
            self._do_import_embeddings_sync(directory, complete_overwrite, max_retries, initial_delay)

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
