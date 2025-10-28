# SmartAudit API – Cloud Run Deployment (us-central1)

## Imagen y Build
- Contenedor hospedado en Artifact Registry: `us-central1-docker.pkg.dev/uma-tech-ai-lab/smartaudit-repo/smartaudit-api:latest`.
- `cloudbuild.yaml` actualizado para:
  - Región `us-central1`.
  - `--max-instances 1`, `--min-instances 0`, `--memory 512Mi`, `--cpu 1` para mantener costos bajos.
  - `serviceAccount` definido como `smartaudit-sa@uma-tech-ai-lab.iam.gserviceaccount.com`.

## Despliegue Manual
Se desplegó exitosamente con:

```bash
gcloud run deploy smartaudit-api \
  --image us-central1-docker.pkg.dev/uma-tech-ai-lab/smartaudit-repo/smartaudit-api:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --max-instances 1 \
  --min-instances 0 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --project uma-tech-ai-lab
```

- URL del servicio: `https://smartaudit-api-117511395113.us-central1.run.app`
- Revisión creada: `smartaudit-api-00001-xkc`

## Estado de Cloud Build
- `gcloud builds submit` actualmente falla en el paso 3 (`gcloud run deploy`) cuando usa la service account `smartaudit-sa@uma-tech-ai-lab.iam.gserviceaccount.com`.
- Se asignaron exitosamente los roles `roles/logging.logWriter` y `roles/run.admin` a `smartaudit-sa@uma-tech-ai-lab.iam.gserviceaccount.com`.
- Falta otorgar `roles/iam.serviceAccountUser` sobre la cuenta de ejecución `117511395113-compute@developer.gserviceaccount.com`. El intento de hacerlo desde `galabi@uma-health.com` fue rechazado con `PERMISSION_DENIED (iam.serviceAccounts.setIamPolicy)`, por lo que se requiere un usuario con privilegios mayores (ej. Owner).
- Hasta que se asigne ese rol, el pipeline seguirá fallando en el paso de despliegue. El despliegue manual con la cuenta actual funciona.

## Próximos Pasos Recomendados
1. Otorgar a `smartaudit-sa@uma-tech-ai-lab.iam.gserviceaccount.com` los roles:
   - `roles/logging.logWriter`
   - `roles/run.admin` (o, mínimo, `roles/run.developer`)
   - `roles/iam.serviceAccountUser` sobre la cuenta de ejecución de Cloud Run.
2. Reintentar `gcloud builds submit --config cloudbuild.yaml --region us-central1` para habilitar pipeline automatizado.
3. Mantener monitoreo del uso en Cloud Run para confirmar que la configuración de instancias mínimas y memoria cumple con los objetivos de costo.
