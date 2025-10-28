# SmartAudit API

Backend FastAPI para SmartAudit - Sistema de auditoría médica inteligente.

## 🚀 Deploy en Railway.app

Este servicio está configurado para deploy automático en Railway.app.

### Endpoints Disponibles

- `GET /` - Health check y información del servicio
- `GET /health` - Status del servicio
- `POST /api/smartaudit/analista` - Analista de datos médicos
- `POST /api/smartaudit/auditor` - Auditor clínico
- `POST /api/smartaudit/revisor` - Revisor administrativo

### Variables de Entorno

No se requieren variables de entorno adicionales. El servicio funciona con datos mock.

### Características

- ✅ FastAPI con validación Pydantic
- ✅ CORS configurado para dominios Vercel
- ✅ 3 agentes especializados
- ✅ Respuestas JSON estructuradas
- ✅ Manejo de errores HTTP

### Tecnologías

- Python 3.11
- FastAPI 0.115.0
- Uvicorn
- Pydantic 2.9.2

---

**Proyecto:** Uma Health - SmartAudit
**Versión:** 1.0.0
