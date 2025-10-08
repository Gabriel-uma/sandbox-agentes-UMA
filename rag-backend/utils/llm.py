"""
Generación de respuestas usando Gemini.

Se soportan dos modos:
1. Vertex AI (por defecto) mediante service account.
2. API pública de Gemini cuando se define GENAI_API_KEY.
"""
import os
from typing import List, Dict
import logging

import vertexai
from vertexai.generative_models import GenerativeModel

import google.genai as genai
from google.genai import types as genai_types

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LLMGenerator:
    """Genera respuestas usando Gemini (Vertex AI o API pública)."""

    def __init__(self):
        self.project_id = os.environ.get('PROJECT_ID')
        self.region = os.environ.get('REGION', 'us-central1')
        # Use stable Gemini model
        self.model_name = os.environ.get(
            'MODEL_NAME',
            'models/gemini-2.5-flash'
        )
        self.genai_api_key = os.environ.get('GENAI_API_KEY')

        if not self.project_id:
            raise ValueError("PROJECT_ID environment variable is required")

        # Determinar modo de operación
        self.use_public_api = bool(self.genai_api_key)

        if self.use_public_api and not self.model_name.startswith("models/"):
            self.model_name = f"models/{self.model_name}"

        if self.use_public_api:
            # API pública de Gemini (solo API key, sin project/location)
            try:
                self.model = genai.Client(api_key=self.genai_api_key)
                logger.info(
                    "LLM initialized with Gemini public API model %s",
                    self.model_name
                )
            except Exception as e:
                logger.error(
                    "Failed to initialize Gemini public API client: %s", e
                )
                raise
        else:
            # Vertex AI nativo
            vertexai.init(project=self.project_id, location=self.region)

            try:
                self.model = GenerativeModel(self.model_name)
                logger.info(
                    "LLM initialized with Vertex AI model %s", self.model_name
                )
            except Exception as e:
                logger.error(
                    "Failed to initialize Vertex AI Gemini model %s: %s",
                    self.model_name,
                    e
                )
                raise

    def generate_answer(
        self,
        question: str,
        context_chunks: List[str],
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, any]:
        """
        Genera una respuesta basada en la pregunta y contexto

        Args:
            question: Pregunta del usuario
            context_chunks: Chunks de documentos relevantes
            conversation_history: Historial de conversación (opcional)

        Returns:
            Dict con answer, confidence, y metadata
        """
        try:
            # Construir prompt con contexto
            context_text = "\n\n".join([
                f"[Documento {i+1}]:\n{chunk}"
                for i, chunk in enumerate(context_chunks)
            ])

            # Incluir historial si existe
            history_text = ""
            if conversation_history:
                history_text = "\nHistorial de conversación:\n"
                for msg in conversation_history[-3:]:  # Últimos 3 mensajes
                    role = "Usuario" if msg['type'] == 'user' else "Asistente"
                    history_text += f"{role}: {msg['content']}\n"

            prompt = f"""Eres un asistente experto que responde preguntas basándose únicamente en la información proporcionada.

{history_text}

Contexto de documentos:
{context_text}

Pregunta del usuario: {question}

Instrucciones:
1. Responde la pregunta usando ÚNICAMENTE la información del contexto proporcionado
2. Si la respuesta no está en el contexto, indica claramente que no tienes esa información
3. Sé conciso pero completo
4. Si hay múltiples documentos relevantes, sintetiza la información
5. Responde en español de forma natural y profesional

Respuesta:"""

            # Generar respuesta
            logger.info("Generating response with Gemini")

            answer = self._generate_with_model(prompt)

            # Calcular confidence basado en la cantidad de contexto disponible
            confidence = self._calculate_confidence(context_chunks, answer)

            logger.info(f"Response generated with confidence {confidence:.2f}")

            return {
                'answer': answer,
                'confidence': confidence,
                'model': self.model_name,
                'context_chunks_used': len(context_chunks)
            }

        except Exception as e:
            logger.error(f"Error generating answer: {str(e)}", exc_info=True)
            raise

    def _calculate_confidence(self, context_chunks: List[str], answer: str) -> float:
        """
        Calcula un score de confianza basado en la respuesta

        Args:
            context_chunks: Chunks usados como contexto
            answer: Respuesta generada

        Returns:
            Score entre 0 y 1
        """
        # Heurística simple de confianza
        base_confidence = 0.5

        # Más contexto = más confianza
        if len(context_chunks) >= 3:
            base_confidence += 0.2
        elif len(context_chunks) >= 2:
            base_confidence += 0.1

        # Respuesta más larga (hasta cierto punto) = más confianza
        answer_length = len(answer.split())
        if 50 <= answer_length <= 300:
            base_confidence += 0.2
        elif answer_length > 20:
            base_confidence += 0.1

        # Si la respuesta indica incertidumbre, reducir confianza
        uncertainty_phrases = [
            'no tengo información',
            'no puedo encontrar',
            'no está en el contexto',
            'no disponible'
        ]
        if any(phrase in answer.lower() for phrase in uncertainty_phrases):
            base_confidence -= 0.3

        return max(0.1, min(1.0, base_confidence))

    def _generate_with_model(self, prompt: str) -> str:
        """Encapsula la llamada al modelo según el modo configurado."""
        generation_params = {
            "temperature": 0.3,
            "top_p": 0.8,
            "top_k": 40,
            "max_output_tokens": 1024,
        }

        if self.use_public_api:
            response = self.model.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=generation_params
            )

            if not response.candidates:
                raise ValueError("Gemini public API returned no candidates")

            # Buscar el primer texto disponible
            for candidate in response.candidates:
                parts = getattr(candidate, "content", None)
                if not parts:
                    continue
                for part in parts.parts:
                    if part.text:
                        return part.text

            raise ValueError("Gemini public API response without text content")

        # Vertex AI path
        response = self.model.generate_content(
            prompt,
            generation_config=generation_params
        )

        return response.text

    def generate_summary(self, text: str, max_length: int = 200) -> str:
        """
        Genera un resumen de un texto

        Args:
            text: Texto a resumir
            max_length: Longitud máxima en palabras

        Returns:
            Resumen del texto
        """
        try:
            prompt = f"""Resume el siguiente texto en máximo {max_length} palabras, manteniendo los puntos clave:

{text}

Resumen:"""

            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.3,
                    "max_output_tokens": max_length * 2
                }
            )

            return response.text

        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            return text[:max_length * 5]  # Fallback: truncar texto
