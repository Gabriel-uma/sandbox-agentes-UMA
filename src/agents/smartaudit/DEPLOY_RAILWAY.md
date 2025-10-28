# 🚂 Guía de Despliegue SmartAudit en Railway.app

## ¿Por qué Railway?

- ✅ **Free tier generoso**: 500 horas/mes gratis
- ✅ **Deploy automático**: Desde GitHub en segundos
- ✅ **Zero config**: Detecta Dockerfile automáticamente
- ✅ **HTTPS gratuito**: Dominio y certificado incluidos
- ✅ **Logs en tiempo real**: Debugging fácil

---

## 📋 Requisitos Previos

1. Cuenta en GitHub (gratuita)
2. Cuenta en Railway.app (gratuita)
3. El código del backend ya está listo en `backend/smartaudit-api/`

---

## 🚀 Pasos para Deploy

### 1. Crear cuenta en Railway.app

1. Ve a https://railway.app
2. Click en **"Start a New Project"**
3. Selecciona **"Login with GitHub"**
4. Autoriza Railway para acceder a tus repositorios

### 2. Subir código a GitHub

**Opción A: Crear nuevo repositorio solo para SmartAudit**

```bash
# Navegar al directorio del backend
cd src/agents/smartaudit/backend/smartaudit-api

# Inicializar git
git init

# Agregar archivos
git add .

# Hacer commit
git commit -m "Initial commit - SmartAudit API"

# Crear repositorio en GitHub (via web o CLI)
# En GitHub: New Repository → smartaudit-api

# Conectar con el remoto
git remote add origin https://github.com/TU_USUARIO/smartaudit-api.git

# Push
git branch -M main
git push -u origin main
```

**Opción B: Usar el repositorio existente (recomendado)**

Si ya tienes el código en un repo (como agente-weekly-ai):

```bash
# Asegúrate de que los cambios estén commiteados
git add src/agents/smartaudit/backend/
git commit -m "Add SmartAudit backend for Railway deploy"
git push origin main
```

### 3. Desplegar en Railway

1. En Railway Dashboard, click **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Busca y selecciona tu repositorio
4. Railway detectará el Dockerfile automáticamente
5. **IMPORTANTE**: Si usas el repo completo, configura el **Root Directory**:
   - Click en **Settings** (⚙️)
   - En **Source** → **Root Directory**, establece:
     ```
     src/agents/smartaudit/backend/smartaudit-api
     ```
   - Click **Save**

6. Railway iniciará el build automáticamente

### 4. Obtener la URL del servicio

Una vez desplegado (toma ~2-3 minutos):

1. Ve a **Settings** → **Networking**
2. Click en **Generate Domain**
3. Railway generará una URL como:
   ```
   https://smartaudit-api-production-xxxx.up.railway.app
   ```
4. **Copia esta URL** - la necesitarás para el frontend

### 5. Verificar que funciona

Abre la URL en tu navegador. Deberías ver:

```json
{
  "service": "SmartAudit API",
  "version": "1.0.0",
  "status": "healthy",
  "endpoints": [
    "/api/smartaudit/analista",
    "/api/smartaudit/auditor",
    "/api/smartaudit/revisor"
  ]
}
```

También prueba: `https://TU-URL/health`

---

## 🔧 Configuración del Frontend

Una vez que tengas la URL de Railway:

1. Edita `.env` en el proyecto frontend:
   ```bash
   VITE_SMARTAUDIT_API_URL=https://smartaudit-api-production-xxxx.up.railway.app
   ```

2. Redesplegar en Vercel:
   ```bash
   # Agregar variable de entorno en Vercel
   vercel env add VITE_SMARTAUDIT_API_URL production
   # Pegar la URL de Railway cuando te lo pida

   # Redesplegar
   vercel --prod
   ```

---

## 🧪 Probar los Endpoints

### Test Analista
```bash
curl -X POST https://TU-URL/api/smartaudit/analista \
  -H "Content-Type: application/json" \
  -d '{"pregunta": "¿Cuántas prácticas se aprobaron este mes?"}'
```

### Test Auditor
```bash
curl -X POST https://TU-URL/api/smartaudit/auditor \
  -H "Content-Type: application/json" \
  -d '{
    "paciente": "Juan Pérez",
    "diagnostico": "Lumbalgia crónica",
    "practica": "Resonancia magnética lumbar",
    "indicaciones": "Dolor lumbar de 8 semanas. Tratamiento con AINEs y fisioterapia durante 6 semanas sin mejoría."
  }'
```

### Test Revisor
```bash
curl -X POST https://TU-URL/api/smartaudit/revisor \
  -H "Content-Type: application/json" \
  -d '{
    "paciente": "María González",
    "fecha": "2025-10-15",
    "matricula": "MN 12345",
    "diagnostico": "Lumbalgia",
    "practica": "RMN Lumbar",
    "indicaciones": "Paciente con dolor crónico que requiere estudio de imágenes",
    "planAfiliado": "Plan Premium"
  }'
```

---

## 📊 Monitoreo

Railway proporciona:

- **Logs en tiempo real**: En el dashboard
- **Métricas**: CPU, RAM, Network
- **Health checks**: Automáticos
- **Reinicio automático**: Si el servicio falla

### Ver logs:
1. En Railway dashboard
2. Click en tu proyecto
3. Tab **"Deployments"**
4. Click en el deployment activo
5. Ver **"Logs"** en tiempo real

---

## 💰 Límites del Free Tier

Railway Free Tier incluye:

- ✅ 500 horas de ejecución/mes (~16 horas/día)
- ✅ $5 USD de crédito mensual
- ✅ Deploy ilimitados
- ✅ 1GB RAM
- ✅ 1GB disco

**Para uso de demo/testing es más que suficiente.**

Si excedes el free tier, Railway te notifica y puedes:
- Pausar el servicio cuando no lo uses
- Upgrade a plan pago ($5/mes)

---

## 🔄 Actualizaciones Futuras

Railway redespliega automáticamente cuando haces push a GitHub:

```bash
# Hacer cambios en el código
# Commit y push
git add .
git commit -m "Update: nueva funcionalidad"
git push origin main

# Railway detecta el push y redespliega automáticamente
```

---

## 🐛 Troubleshooting

### El build falla
- Verifica que el **Root Directory** esté correctamente configurado
- Revisa los logs del build en Railway
- Asegúrate de que `requirements.txt` y `Dockerfile` estén presentes

### El servicio no responde
- Verifica que el puerto sea 8080 (Railway lo configura automáticamente)
- Revisa los logs en tiempo real
- Verifica que `uvicorn` esté escuchando en `0.0.0.0` (no `localhost`)

### CORS errors desde el frontend
- El main.py ya tiene CORS configurado para:
  - `https://agente-weekly-ai.vercel.app`
  - `http://localhost:5173`
  - `http://localhost:3000`
- Si usas otro dominio, agrégalo en `allow_origins`

---

## 📞 Soporte

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues del proyecto

---

**Tiempo estimado total de deploy**: 10-15 minutos

¡Listo! Una vez desplegado, tendrás SmartAudit funcionando en la nube de forma gratuita. 🎉
