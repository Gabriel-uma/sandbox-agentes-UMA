# Dockerfile para el proxy CORS
FROM nginx:alpine

# Copiar la configuración de nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Exponer el puerto 8080
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
