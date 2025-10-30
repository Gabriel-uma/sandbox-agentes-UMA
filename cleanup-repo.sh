#!/bin/bash
# Script de limpieza del repositorio
# Ejecutar con: bash cleanup-repo.sh

echo "🧹 Iniciando limpieza del repositorio..."

# 1. Eliminar carpetas duplicadas/innecesarias
echo "📁 Eliminando carpetas innecesarias..."
rm -rf project/
rm -rf buckets/
rm -rf .next/
rm -rf dist/

# 2. Eliminar archivos de log
echo "📝 Eliminando archivos de log..."
rm -f cloud-build.log
rm -f rag-backend-build.log
find . -name "*.log" -type f -not -path "./node_modules/*" -delete

# 3. Eliminar archivos comprimidos innecesarios
echo "🗜️ Eliminando archivos comprimidos..."
rm -f src/agents/smartaudit/backend/smartaudit-api-deploy.tar.gz
rm -f src/agents/smartaudit/smart_audit-main.zip

# 4. Eliminar configuraciones obsoletas de Next.js
echo "⚙️ Eliminando configuraciones obsoletas..."
rm -f next.config.mjs
rm -f next-env.d.ts
rm -f tsconfig-next.json

# 5. Eliminar Docker files obsoletos en root
echo "🐳 Eliminando archivos Docker obsoletos..."
rm -f docker-compose.yml
rm -f Dockerfile
rm -f nginx.conf

# 6. Eliminar duplicado de postcss config
echo "📋 Eliminando archivos duplicados..."
rm -f postcss.config.js

# 7. Eliminar repositorios git anidados
echo "🔗 Eliminando repositorios git anidados..."
rm -rf src/agents/smartaudit/backend/smartaudit-api/.git

# 8. Eliminar archivos de test temporales
echo "🧪 Eliminando archivos de test..."
rm -f test-*.json

# 9. Limpiar __pycache__
echo "🐍 Limpiando cache de Python..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null

# 10. Limpiar .pytest_cache
echo "🧪 Limpiando cache de pytest..."
find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null

echo ""
echo "✅ Limpieza completada!"
echo ""
echo "⚠️  SIGUIENTE PASO: Remover carpetas duplicadas del repositorio Git"
echo "Ejecuta los siguientes comandos si estás seguro:"
echo ""
echo "  git rm -r components/"
echo "  git rm -r lib/"
echo "  git rm -r hooks/"
echo "  git rm -r styles/"
echo "  git rm -r public/"
echo ""
echo "  (Verifica primero que todo esté en src/)"
echo ""
echo "🔐 ADVERTENCIA: Los archivos de terraform state se han ignorado en .gitignore"
echo "Considera eliminarlos del historial de git si contienen información sensible"
echo ""
