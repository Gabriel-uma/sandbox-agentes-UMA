"""
RAG Backend Service
Servicio para consultas RAG, búsqueda vectorial y generación de respuestas
"""
import os
import uuid
from flask import Flask, request, jsonify
import logging

from utils import VectorSearch, LLMGenerator, ConversationManager, StorageRetriever

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Inicializar Flask
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max

# Inicializar servicios
try:
    vector_search = VectorSearch()
    llm_generator = LLMGenerator()
    conversation_manager = ConversationManager()
    storage_retriever = StorageRetriever()
    logger.info("All services initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize services: {str(e)}")
    vector_search = None
    llm_generator = None
    conversation_manager = None
    storage_retriever = None


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    status = {
        'status': 'healthy',
        'service': 'rag-backend',
        'version': '1.0.0'
    }

    # Verificar que los servicios estén inicializados
    if not all([vector_search, llm_generator, conversation_manager, storage_retriever]):
        status['status'] = 'unhealthy'
        status['error'] = 'Services not properly initialized'
        return jsonify(status), 503

    return jsonify(status), 200


@app.route('/query', methods=['POST'])
def query_rag():
    """
    Endpoint principal para consultas RAG

    Proceso:
    1. Recibir pregunta
    2. Buscar documentos similares (vector search)
    3. Recuperar chunks relevantes
    4. Generar respuesta con LLM
    5. Guardar en BigQuery
    6. Retornar respuesta
    """
    try:
        data = request.get_json()

        if not data or 'question' not in data:
            return jsonify({'error': 'Missing required field: question'}), 400

        question = data['question'].strip()

        if not question:
            return jsonify({'error': 'Question cannot be empty'}), 400

        # Obtener o crear conversation_id
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            logger.info(f"Created new conversation: {conversation_id}")
        else:
            logger.info(f"Continuing conversation: {conversation_id}")

        # Parámetros opcionales
        top_k = data.get('top_k', 5)
        include_history = data.get('include_history', True)

        logger.info(f"Processing query: {question[:50]}...")

        # 1. Buscar documentos similares
        logger.info("Searching for similar documents")
        search_results = vector_search.search_similar_documents(question, top_k=top_k)

        if not search_results:
            return jsonify({
                'answer': 'No encontré documentos relevantes para responder tu pregunta. Por favor, sube documentos primero o reformula tu pregunta.',
                'sources': [],
                'conversation_id': conversation_id,
                'confidence': 0.0
            }), 200

        # 2. Recuperar chunks de los documentos encontrados
        logger.info(f"Retrieving {len(search_results)} chunks")
        chunk_ids = [result['id'] for result in search_results]
        chunks = storage_retriever.get_chunks_by_ids(chunk_ids)

        if not chunks:
            logger.warning("No chunks retrieved from storage")
            chunks = ["Información no disponible en este momento."]

        # 3. Obtener historial de conversación si se solicita
        conversation_history = []
        if include_history:
            conversation_history = conversation_manager.get_conversation_history(
                conversation_id,
                limit=10
            )

        # 4. Generar respuesta con LLM
        logger.info("Generating answer with LLM")
        llm_response = llm_generator.generate_answer(
            question=question,
            context_chunks=chunks,
            conversation_history=conversation_history
        )

        answer = llm_response['answer']
        confidence = llm_response['confidence']

        # 5. Extraer document_ids de los chunks
        sources = list(set([
            chunk_id.split('_chunk_')[0]
            for chunk_id in chunk_ids
        ]))

        # 6. Guardar en BigQuery
        logger.info("Saving conversation to BigQuery")
        conversation_manager.save_conversation_turn(
            conversation_id=conversation_id,
            user_question=question,
            assistant_answer=answer,
            sources=sources,
            confidence=confidence,
            metadata={
                'model': llm_response.get('model'),
                'chunks_used': len(chunks),
                'top_k': top_k
            }
        )

        # 7. Preparar respuesta
        response = {
            'answer': answer,
            'sources': sources,
            'conversation_id': conversation_id,
            'confidence': confidence,
            'metadata': {
                'chunks_retrieved': len(chunks),
                'model_used': llm_response.get('model')
            }
        }

        logger.info(f"Query processed successfully with confidence {confidence:.2f}")
        return jsonify(response), 200

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({'error': str(e)}), 400

    except Exception as e:
        logger.error(f"Error processing query: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Internal server error processing query',
            'details': str(e)
        }), 500


@app.route('/conversations/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    """
    Recupera el historial completo de una conversación
    """
    try:
        messages = conversation_manager.get_conversation_history(conversation_id)

        if not messages:
            return jsonify({
                'error': 'Conversation not found or empty'
            }), 404

        return jsonify({
            'conversation_id': conversation_id,
            'messages': messages,
            'total_messages': len(messages)
        }), 200

    except Exception as e:
        logger.error(f"Error retrieving conversation: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/conversations', methods=['GET'])
def list_conversations():
    """
    Lista las conversaciones recientes
    """
    try:
        limit = request.args.get('limit', default=10, type=int)

        if limit < 1 or limit > 100:
            return jsonify({'error': 'Limit must be between 1 and 100'}), 400

        conversations = conversation_manager.list_recent_conversations(limit=limit)

        return jsonify({
            'conversations': conversations,
            'total': len(conversations)
        }), 200

    except Exception as e:
        logger.error(f"Error listing conversations: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    """
    Elimina una conversación
    """
    try:
        success = conversation_manager.delete_conversation(conversation_id)

        if success:
            return jsonify({
                'message': 'Conversation deleted successfully',
                'conversation_id': conversation_id
            }), 200
        else:
            return jsonify({
                'error': 'Failed to delete conversation'
            }), 500

    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
