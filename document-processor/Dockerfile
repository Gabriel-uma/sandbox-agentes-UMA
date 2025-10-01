FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema para extracción de texto
RUN apt-get update && apt-get install -y \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código de la aplicación
COPY . .

# Variables de entorno
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

EXPOSE $PORT

# Usar gunicorn para producción
CMD exec gunicorn --bind :$PORT --workers 2 --threads 4 --timeout 300 app:app
