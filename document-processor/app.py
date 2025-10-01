"""
Document Processor Service
Servicio para procesar documentos, generar embeddings e indexar en Vertex AI
"""
import os
import uuid
import tempfile
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import logging

from utils import TextExtractor, EmbeddingGenerator, StorageManager

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
    logger.info("Services initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize services: {str(e)}")
    embedding_generator = None
    storage_manager = None


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    status = {
        'status': 'healthy',
        'service': 'document-processor',
        'version': '1.0.0'
    }

    # Verificar que los servicios estén inicializados
    if not embedding_generator or not storage_manager:
        status['status'] = 'unhealthy'
        status['error'] = 'Services not properly initialized'
        return jsonify(status), 503

    return jsonify(status), 200


@app.route('/upload', methods=['POST'])
def upload_document():
    """
    Endpoint para subir y procesar documentos

    Proceso:
    1. Recibir archivo
    2. Validar formato
    3. Extraer texto
    4. Dividir en chunks
    5. Generar embeddings
    6. Subir a GCS
    7. Preparar para indexación en Vertex AI
    """
    try:
        # Validar que se haya enviado un archivo
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400

        # Validar formato
        filename = secure_filename(file.filename)
        _, ext = os.path.splitext(filename.lower())

        if ext not in TextExtractor.SUPPORTED_FORMATS:
            return jsonify({
                'error': f'Unsupported format: {ext}',
                'supported_formats': list(TextExtractor.SUPPORTED_FORMATS)
            }), 400

        # Generar ID único para el documento
        document_id = str(uuid.uuid4())
        logger.info(f"Processing document {document_id}: {filename}")

        # Guardar archivo temporalmente
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            file.save(temp_file.name)
            temp_path = temp_file.name

        try:
            # 1. Extraer texto
            logger.info(f"Extracting text from {filename}")
            text, doc_type = TextExtractor.extract_text(temp_path, filename)

            if not text or len(text.strip()) < 10:
                return jsonify({
                    'error': 'No text could be extracted from document'
                }), 400

            # 2. Dividir en chunks
            logger.info("Chunking text")
            chunks = TextExtractor.chunk_text(text, chunk_size=500, overlap=50)

            if not chunks:
                return jsonify({
                    'error': 'Failed to create text chunks'
                }), 500

            # 3. Generar embeddings
            logger.info(f"Generating embeddings for {len(chunks)} chunks")
            embeddings = embedding_generator.generate_embeddings(chunks)

            # 4. Subir documento original a GCS
            logger.info("Uploading original document to GCS")
            doc_uri = storage_manager.upload_document(temp_path, document_id, filename)

            # 5. Subir chunks procesados
            logger.info("Uploading processed chunks to GCS")
            chunks_uri = storage_manager.upload_text_chunks(document_id, chunks)

            # 6. Subir embeddings metadata para Vertex AI
            logger.info("Uploading embeddings metadata")
            embeddings_uri = storage_manager.upload_embeddings_metadata(
                document_id,
                embeddings,
                chunks
            )

            response = {
                'status': 'success',
                'document_id': document_id,
                'filename': filename,
                'document_type': doc_type,
                'total_chunks': len(chunks),
                'total_characters': len(text),
                'message': 'Document processed and indexed successfully',
                'uris': {
                    'document': doc_uri,
                    'chunks': chunks_uri,
                    'embeddings': embeddings_uri
                }
            }

            logger.info(f"Document {document_id} processed successfully")
            return jsonify(response), 200

        finally:
            # Limpiar archivo temporal
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({'error': str(e)}), 400

    except Exception as e:
        logger.error(f"Error processing document: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Internal server error processing document',
            'details': str(e)
        }), 500


@app.route('/documents/<document_id>', methods=['GET'])
def get_document_info(document_id):
    """
    Obtener información de un documento procesado
    """
    try:
        chunks = storage_manager.get_document_chunks(document_id)

        if not chunks:
            return jsonify({
                'error': 'Document not found or no chunks available'
            }), 404

        return jsonify({
            'document_id': document_id,
            'total_chunks': len(chunks),
            'status': 'processed'
        }), 200

    except Exception as e:
        logger.error(f"Error retrieving document info: {str(e)}")
        return jsonify({'error': str(e)}), 500


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
