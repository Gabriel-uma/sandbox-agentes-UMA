
"""
Document Processor Service
Servicio para procesar documentos, generar embeddings e indexar en Vertex AI
"""
import os
import uuid
import tempfile
from datetime import datetime, timezone
from io import BytesIO
from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
import logging

from utils import TextExtractor, EmbeddingGenerator, StorageManager, IndexManager

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Inicializar Flask
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max

# Inicializar servicios
try:
    embedding_generator = EmbeddingGenerator()
    storage_manager = StorageManager()
    index_manager = IndexManager()
    logger.info("Services initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize services: {str(e)}")
    embedding_generator = None
    storage_manager = None
    index_manager = None


def services_ready() -> bool:
    """Verifica que los servicios requeridos estén inicializados."""
    return bool(embedding_generator and storage_manager and index_manager)


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    status = {
        'status': 'healthy',
        'service': 'document-processor',
        'version': '1.0.0'
    }

    if not services_ready():
        status['status'] = 'unhealthy'
        status['error'] = 'Services not properly initialized'
        return jsonify(status), 503

    return jsonify(status), 200


@app.route('/upload', methods=['POST'])
def upload_document():
    """Sube, procesa y registra un documento."""
    try:
        if not services_ready():
            return jsonify({
                'error': 'Service unavailable',
                'details': 'Required services are not initialized'
            }), 503

        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400

        filename = secure_filename(file.filename)
        _, ext = os.path.splitext(filename.lower())

        if ext not in TextExtractor.SUPPORTED_FORMATS:
            return jsonify({
                'error': f'Unsupported format: {ext}',
                'supported_formats': list(TextExtractor.SUPPORTED_FORMATS)
            }), 400

        document_id = str(uuid.uuid4())
        logger.info(f"Processing document {document_id}: {filename}")

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            file.save(temp_file.name)
            temp_path = temp_file.name

        try:
            logger.info(f"Extracting text from {filename}")
            text, doc_type = TextExtractor.extract_text(temp_path, filename)

            if not text or len(text.strip()) < 10:
                return jsonify({'error': 'No text could be extracted from document'}), 400

            logger.info("Chunking text")
            chunks = TextExtractor.chunk_text(text, chunk_size=500, overlap=50)

            if not chunks:
                return jsonify({'error': 'Failed to create text chunks'}), 500

            logger.info(f"Generating embeddings for {len(chunks)} chunks")
            embeddings = embedding_generator.generate_embeddings(chunks)

            logger.info("Uploading original document to GCS")
            doc_uri = storage_manager.upload_document(temp_path, document_id, filename)

            logger.info("Uploading processed chunks to GCS")
            chunks_uri = storage_manager.upload_text_chunks(document_id, chunks)

            logger.info("Uploading embeddings metadata")
            embeddings_uri = storage_manager.upload_embeddings_metadata(
                document_id,
                embeddings,
                chunks
            )

            logger.info("Updating Matching Engine index with new embeddings")
            try:
                index_manager.import_embeddings(embeddings_uri)
            except Exception as exc:
                logger.error("Failed to update index with embeddings: %s", exc, exc_info=True)
                try:
                    storage_manager.delete_document(document_id)
                except Exception as cleanup_exc:
                    logger.warning("Failed to rollback storage for %s: %s", document_id, cleanup_exc)
                return jsonify({
                    'error': 'Failed to index document in Matching Engine',
                    'details': str(exc)
                }), 500

            file_size = os.path.getsize(temp_path)
            uploaded_at = datetime.now(timezone.utc).isoformat()

            metadata = {
                'document_id': document_id,
                'filename': filename,
                'document_type': doc_type,
                'mime_type': file.mimetype,
                'size': file_size,
                'uploaded_at': uploaded_at,
                'status': 'ready',
                'total_chunks': len(chunks),
                'total_characters': len(text),
                'uris': {
                    'document': doc_uri,
                    'chunks': chunks_uri,
                    'embeddings': embeddings_uri
                }
            }

            metadata_uri = storage_manager.save_document_metadata(document_id, metadata)
            metadata['uris']['metadata'] = metadata_uri

            response = {
                'status': 'ready',
                'document_id': document_id,
                'filename': filename,
                'document_type': doc_type,
                'mime_type': file.mimetype,
                'size': file_size,
                'uploaded_at': uploaded_at,
                'total_chunks': len(chunks),
                'total_characters': len(text),
                'message': 'Document processed and indexed successfully',
                'uris': metadata['uris']
            }

            logger.info(f"Document {document_id} processed successfully")
            return jsonify(response), 200

        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({'error': str(e)}), 400

    except RuntimeError as e:
        logger.error(f"Embedding service error: {str(e)}")
        return jsonify({'error': 'Embedding service unavailable', 'details': str(e)}), 503

    except Exception as e:
        logger.error(f"Error processing document: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Internal server error processing document',
            'details': str(e)
        }), 500


@app.route('/documents', methods=['GET'])
def list_documents():
    if not services_ready():
        return jsonify({'error': 'Service unavailable'}), 503
    try:
        documents = storage_manager.list_documents()
        return jsonify({'documents': documents}), 200
    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to list documents', 'details': str(e)}), 500


@app.route('/documents/<document_id>', methods=['GET'])
def get_document_info(document_id):
    if not services_ready():
        return jsonify({'error': 'Service unavailable'}), 503
    try:
        metadata = storage_manager.get_document_metadata(document_id)
        if not metadata:
            return jsonify({'error': 'Document not found'}), 404

        chunks = storage_manager.get_document_chunks(document_id)
        metadata['chunks'] = chunks
        metadata['total_chunks'] = len(chunks)
        return jsonify(metadata), 200
    except Exception as e:
        logger.error(f"Error retrieving document info: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to retrieve document info', 'details': str(e)}), 500


@app.route('/documents/<document_id>', methods=['DELETE'])
def delete_document(document_id):
    if not services_ready():
        return jsonify({'error': 'Service unavailable'}), 503
    try:
        deleted = storage_manager.delete_document(document_id)
        if not deleted:
            return jsonify({'error': 'Document not found'}), 404
        return jsonify({'status': 'deleted', 'document_id': document_id}), 200
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to delete document', 'details': str(e)}), 500


@app.route('/documents/<document_id>/download', methods=['GET'])
def download_document(document_id):
    if not services_ready():
        return jsonify({'error': 'Service unavailable'}), 503
    try:
        content, filename, mime_type = storage_manager.download_document_content(document_id)
        return send_file(
            BytesIO(content),
            mimetype=mime_type or 'application/octet-stream',
            as_attachment=True,
            download_name=filename,
        )
    except FileNotFoundError:
        return jsonify({'error': 'Document not found'}), 404
    except Exception as e:
        logger.error(f"Error generating download: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to download document', 'details': str(e)}), 500


@app.errorhandler(413)
def request_entity_too_large(error):
    """Manejar archivos demasiado grandes"""
    return jsonify({
        'error': 'File too large',
        'max_size': '50MB'
    }), 413


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
