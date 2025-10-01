# CONTEXTO DEL SISTEMA

## FRONTEND (React + Vite + TypeScript)
Funcionalidades actuales:
- Chat Interface (agente RAG)
- Document Upload
- Knowledge Base
- Chat History
- Projects Panel
- Settings
- Theme Support

Estado actual:
- UI completa ✅
- Usa mock service ⚠️
- Sin variables de entorno GCP ⚠️

Variables esperadas:
```env
VITE_DOCUMENT_PROCESSOR_URL=https://rag-document-processor-xxx-uc.a.run.app
VITE_RAG_BACKEND_URL=https://rag-agent-backend-xxx-uc.a.run.app
VITE_PROJECT_ID=uma-tech-ai-lab
VITE_BUCKET_NAME=uma-tech-ai-lab-rag-documents
