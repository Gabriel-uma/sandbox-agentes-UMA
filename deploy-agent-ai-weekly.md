Objetivo: desplegar el proyecto completo alojado en https://github.com/RGabrielR/agent-ai-weekly
, con frontend React + Vite en Vercel y backend en GCP Cloud Run.

Si ocurre cualquier error, guardar un archivo DEPLOY_ERROR.md en la raíz del repositorio explicando:

Qué paso falló.

Por qué falló (error técnico completo).

Qué contexto o configuración falta para continuar.

🪣 1️⃣ Preparación y configuración inicial
git clone https://github.com/RGabrielR/agent-ai-weekly.git
cd agent-ai-weekly


Si el proyecto tiene carpetas separadas (frontend/ y backend/), identifícalas.
El frontend usa React + Vite, por lo tanto el directorio esperado de build será dist/.

🌐 2️⃣ Despliegue del Frontend (React + Vite) en Vercel

Crea un nuevo proyecto en https://vercel.com
 y conéctalo al repositorio GitHub.

En la configuración del proyecto:

Framework: Vite

Build Command:

npm install && npm run build


Output Directory:

dist


Variables de entorno (ajusta cuando el backend esté desplegado):

VITE_API_URL=https://<BACKEND_URL>


Despliega y guarda la URL resultante, por ejemplo:

https://agent-ai-weekly.vercel.app


Si el build falla o no detecta el framework, generar DEPLOY_ERROR.md con:

Logs de error (build.log o consola de Vercel).

Qué dependencia o script está fallando (vite.config.js, npm run build, etc.).

Recomendaciones (por ejemplo, “instalar node v18+ o revisar variables de entorno”).

⚙️ 3️⃣ Despliegue del Backend en Google Cloud Run
3.1. Crear imagen Docker (si no existe)

Si el backend no tiene Dockerfile, crear automáticamente uno estándar:

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 8080
CMD ["npm", "start"]

3.2. Build y Push a Container Registry
gcloud auth login
gcloud config set project <PROJECT_ID>

gcloud builds submit --tag gcr.io/<PROJECT_ID>/agent-ai-weekly-backend


Si falla (por permisos, red, credenciales, etc.), generar DEPLOY_ERROR.md con:

Logs de Cloud Build.

Mensaje de error.

Comando exacto que falló.

Qué permisos o roles GCP faltan (ej: roles/cloudbuild.builds.editor, roles/run.admin, roles/iam.serviceAccountUser).

3.3. Desplegar en Cloud Run
gcloud run deploy agent-ai-weekly-backend \
  --image gcr.io/<PROJECT_ID>/agent-ai-weekly-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080


Al terminar, anotar la URL:

https://agent-ai-weekly-backend-xxxxxx-uc.a.run.app


Si el despliegue falla, el agente debe crear DEPLOY_ERROR.md con:

Logs de despliegue.

Causa técnica (timeout, IAM, configuración incorrecta, puerto, etc.).

Pasos recomendados (por ejemplo: “el contenedor no expone el puerto 8080” o “falta variable de entorno DB_URL”).

🔗 4️⃣ Vincular el Frontend con el Backend

Editar las variables en Vercel:

VITE_API_URL=https://agent-ai-weekly-backend-xxxxxx-uc.a.run.app


Re-desplegar el frontend.

Si la conexión da CORS o fetch errors, crear DEPLOY_ERROR.md con:

Error exacto (CORS policy, NetworkError, etc.).

Header de respuesta del backend.

Qué configuración falta (ej. permitir * en Access-Control-Allow-Origin).

✅ 5️⃣ Validación final

Probar acceso público:

https://agent-ai-weekly.vercel.app


Verificar que las llamadas al backend respondan correctamente.

Si todo funciona, crear DEPLOY_SUCCESS.md con:

URLs finales (frontend + backend).

Fecha y hora del despliegue.

Versión de commit (git rev-parse HEAD).

💰 6️⃣ Control de costos

Cloud Run free tier:
2 M requests / 360 000 s CPU / 1 GiB RAM gratis/mes.
Escala a 0 cuando no se usa.

Vercel Hobby plan: 100 % gratuito para proyectos personales.

No se generarán costos si no hay tráfico continuo o builds muy pesados.

🧩 Resultado esperado
Servicio	Plataforma	Resultado
Frontend	Vercel	https://agent-ai-weekly.vercel.app
Backend	Cloud Run	https://agent-ai-weekly-backend-xxxxxx-uc.a.run.app
Logs de error (si aplica)	Markdown	DEPLOY_ERROR.md
Éxito	Markdown	DEPLOY_SUCCESS.md