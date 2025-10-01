# OBJETIVO
Desplegar e implementar un sistema RAG completo (Frontend + Backend + Infra) en GCP, tomando como base el estado actual descrito en CONTEXT.md.  
Tu tarea es **planificar y luego implementar** siguiendo buenas prácticas, sin asumir datos faltantes sin preguntar primero.

# FEATURES A IMPLEMENTAR
- **Backend Python**: implementar `document-processor` y `rag-backend` con sus endpoints definidos en CONTEXT.md.
- **Docker**: construir y subir imágenes reales a GCR para ambos servicios.
- **Terraform**: actualizar scripts para usar imágenes reales, habilitar APIs necesarias y **crear y configurar la Service Account requerida** con los permisos mínimos para que los servicios funcionen.
- **Frontend**: reemplazar mock service `src/lib/rag-service.ts` por cliente real con variables de entorno.
- **.env**: generar archivo de variables de entorno para el Frontend.

# CONSIDERACIONES
- **Service Account**: se debe CREAR una nueva cuenta de servicio con los permisos mínimos requeridos (Storage Admin, BigQuery Editor, Vertex AI User, Logging Writer) y asociarla a Cloud Run. Documentar en `PLANNING.md` cómo y por qué se asignan cada uno de los roles.
- **Permisos IAM**: ya se dispone de permisos `roles/resourcemanager.projectIamAdmin` para crear y asignar roles. Aprovecharlo para automatizar en Terraform la creación de la SA y binding de roles.
- **Infraestructura**: aplicar buenas prácticas de IaC; mantener scripts claros y modulares.
- **LLM**: integración con Vertex AI (Gemini/PaLM) para generación de embeddings y respuestas.

# IMPORTANTE
- No ejecutes nada sin validar primero en un archivo `PLANNING.md`.
- Si falta contexto, haz preguntas tentativas antes de proponer soluciones.
- Mantén la solución simple y escalable.
- Documenta explícitamente roles/permissions otorgados a la Service Account en Terraform.

# ENTREGABLES
1. `PLANNING.md` con pasos y dudas a validar.
2. Código actualizado en `document-processor/` y `rag-backend/` con endpoints listos.
3. Scripts Terraform actualizados con creación y binding de la nueva Service Account.
4. `.env` configurado para Frontend.
5. Modificación de `src/lib/rag-service.ts` para consumir los servicios reales.
