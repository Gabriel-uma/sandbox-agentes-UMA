# 🚂 Instrucciones para Deploy de SmartAudit en Railway

## Opción Recomendada: GitHub + Railway

### Paso 1: Crear repositorio en GitHub (2 minutos)

1. Ve a: **https://github.com/new**
2. Configuración:
   - **Repository name**: `smartaudit-api`
   - **Description**: `SmartAudit API - Backend FastAPI para auditoría médica`
   - **Visibility**: Público o Privado (tu elección)
   - **NO marques**: Initialize with README
   - Click **"Create repository"**

### Paso 2: Pushear el código (30 segundos)

Copia y pega estos comandos en tu terminal (reemplaza `TU_USUARIO` con tu usuario de GitHub):

```bash
cd C:\Users\ivang\OneDrive\Documentos\code\agente-weekly-ai\src\agents\smartaudit\backend\smartaudit-api

# Ya tenemos git init y commit, solo conectar
git remote add origin https://github.com/TU_USUARIO/smartaudit-api.git

# Push
git branch -M main
git push -u origin main
```

### Paso 3: Deploy en Railway (3 minutos)

1. Ve a: **https://railway.app**
2. Login con tu cuenta de GitHub
3. Click en **"New Project"**
4. Selecciona **"Deploy from GitHub repo"**
5. Busca y selecciona **"smartaudit-api"**
6. Railway detectará el Dockerfile automáticamente
7. Click **"Deploy"** y espera 2-3 minutos

### Paso 4: Obtener la URL

1. Una vez desplegado, ve a **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copia la URL que te da (ejemplo: `https://smartaudit-api-production-xxxx.up.railway.app`)

### Paso 5: Verificar que funciona

Abre en tu navegador:
```
https://TU-URL-DE-RAILWAY.up.railway.app
```

Deberías ver:
```json
{
  "service": "SmartAudit API",
  "version": "1.0.0",
  "status": "healthy",
  "endpoints": [...]
}
```

### Paso 6: Configurar Frontend

```bash
# Actualizar .env local
echo VITE_SMARTAUDIT_API_URL=https://TU-URL-DE-RAILWAY.up.railway.app >> .env

# Actualizar en Vercel (producción)
vercel env add VITE_SMARTAUDIT_API_URL production
# Pegar la URL cuando te lo pida

# Redesplegar
vercel --prod
```

---

## 🎉 ¡Listo!

Tu SmartAudit estará funcionando en la nube de forma gratuita.

**Tiempo total**: ~10 minutos
