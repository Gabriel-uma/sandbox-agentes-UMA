"""
Matching Engine index manager for importing embeddings from GCS.
"""
import logging
import os
import time
import threading
from typing import Optional, Callable
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
        initial_delay: float,
        on_complete: Optional[Callable[[bool, Optional[str]], None]] = None
    ) -> None:
        """Internal method that performs the actual sync embedding import with retries.

        Args:
            directory: GCS directory containing embeddings
            complete_overwrite: Whether to overwrite the entire index
            max_retries: Maximum number of retry attempts
            initial_delay: Initial delay for exponential backoff
            on_complete: Optional callback function called when indexing completes.
                        Receives (success: bool, error_message: Optional[str])
        """
        import threading
        thread_name = threading.current_thread().name
        logger.info("🔄 [%s] Starting index update for %s from %s", thread_name, self.index_resource, directory)

        last_error: Optional[Exception] = None
        delay = initial_delay

        for attempt in range(max_retries + 1):
            try:
                logger.info("🔄 [%s] Attempt %d/%d: Calling index.update_embeddings...",
                           thread_name, attempt + 1, max_retries + 1)
                self.index.update_embeddings(
                    contents_delta_uri=directory,
                    is_complete_overwrite=complete_overwrite
                )
                logger.info("✅ [%s] Successfully completed index update for %s", thread_name, self.index_resource)

                # Call callback on success
                if on_complete:
                    logger.info("📞 [%s] Calling success callback...", thread_name)
                    try:
                        on_complete(True, None)
                        logger.info("✅ [%s] Success callback completed", thread_name)
                    except Exception as callback_error:
                        logger.error("❌ [%s] Error in indexing completion callback: %s", thread_name, str(callback_error), exc_info=True)
                else:
                    logger.warning("⚠️ [%s] No callback provided", thread_name)

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
                        # Call callback on failure
                        if on_complete:
                            try:
                                on_complete(False, error_msg)
                            except Exception as callback_error:
                                logger.error("Error in indexing completion callback: %s", str(callback_error))
                        return
                else:
                    logger.error("ResourceExhausted error (non-quota): %s", error_msg)
                    # Call callback on failure
                    if on_complete:
                        try:
                            on_complete(False, error_msg)
                        except Exception as callback_error:
                            logger.error("Error in indexing completion callback: %s", str(callback_error))
                    return

            except Exception as e:
                error_msg = str(e)
                logger.error("Failed to update index in background: %s", error_msg)
                # Call callback on failure
                if on_complete:
                    try:
                        on_complete(False, error_msg)
                    except Exception as callback_error:
                        logger.error("Error in indexing completion callback: %s", str(callback_error))
                return

        if last_error:
            error_msg = str(last_error)
            logger.error("Background indexing failed after all retries: %s", error_msg)
            # Call callback on final failure
            if on_complete:
                try:
                    on_complete(False, error_msg)
                except Exception as callback_error:
                    logger.error("Error in indexing completion callback: %s", str(callback_error))

    def import_embeddings(
        self,
        embeddings_uri: str,
        *,
        complete_overwrite: bool = False,
        max_retries: int = 5,
        initial_delay: float = 2.0,
        async_mode: bool = True,
        on_complete: Optional[Callable[[bool, Optional[str]], None]] = None
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
            on_complete: Optional callback called when indexing completes (async mode only).
                        Receives (success: bool, error_message: Optional[str])
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
            # NO usar daemon=True para que Cloud Run no mate el thread antes de que termine
            thread = threading.Thread(
                target=self._do_import_embeddings_sync,
                args=(directory, complete_overwrite, max_retries, initial_delay, on_complete),
                daemon=False,  # Cambiado de True a False para que el thread complete
                name=f"indexing-{directory.split('/')[-1][:8]}"
            )
            thread.start()
            logger.info("Indexing started in NON-DAEMON background thread for %s (thread: %s)",
                       self.index_resource, thread.name)
        else:
            # Run synchronously (for testing or when immediate result is needed)
            # Note: on_complete callback is ignored in sync mode since caller gets immediate result
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
