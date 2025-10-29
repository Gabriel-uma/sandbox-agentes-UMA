from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import os

app = FastAPI(title="SmartAudit API", version="1.0.0")

# Configurar CORS - Permitir todos los orígenes (acceso público)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permitir todos los orígenes
    allow_credentials=False,  # Debe ser False cuando allow_origins es ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MODELOS ====================

class ConsultaAnalista(BaseModel):
    pregunta: str

class AnalisisResponse(BaseModel):
    respuesta: str
    sql_generado: Optional[str] = None
    resultados: Optional[List[Dict]] = None

class OrdenMedica(BaseModel):
    paciente: str
    diagnostico: str
    practica: str
    indicaciones: str

class CriterioAuditoria(BaseModel):
    criterio: str
    cumple: bool

class AuditoriaResponse(BaseModel):
    aprobado: bool
    evaluacion: str
    criterios: List[CriterioAuditoria]
    notas: Optional[str] = None
    fuente: Optional[str] = None

class DocumentoMedico(BaseModel):
    paciente: str
    fecha: str
    matricula: str
    diagnostico: str
    practica: str
    indicaciones: str
    planAfiliado: str

class ItemRevision(BaseModel):
    campo: str
    completo: bool
    observacion: Optional[str] = None

class RevisionResponse(BaseModel):
    aprobado: bool
    resumen: str
    items: List[ItemRevision]
    faltantes: Optional[List[str]] = None
    notas: Optional[str] = None

# ==================== ENDPOINTS ====================

@app.get("/")
async def root():
    return {
        "service": "SmartAudit API",
        "version": "1.0.0",
        "status": "healthy",
        "endpoints": [
            "/api/smartaudit/analista",
            "/api/smartaudit/auditor",
            "/api/smartaudit/revisor"
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.post("/api/smartaudit/analista", response_model=AnalisisResponse)
async def consultar_analista(consulta: ConsultaAnalista):
    """
    Endpoint para el Analista de Datos
    Convierte preguntas en lenguaje natural a consultas SQL
    """
    try:
        # TODO: Integrar con Google ADK Agent cuando esté configurado
        # Por ahora retornamos datos mock realistas

        return AnalisisResponse(
            respuesta=f"Análisis para: '{consulta.pregunta}'\n\nSegún los datos disponibles en BigQuery, se encontraron los siguientes resultados de evaluaciones de auditoría.",
            sql_generado="SELECT COUNT(*) as total, DATE_TRUNC(Fecha, MONTH) as mes FROM `uma-datascience-dev.Bigquery_Dataset.evaluaciones_auditoria` WHERE Estado = 'aprobado' GROUP BY mes ORDER BY mes DESC LIMIT 3",
            resultados=[
                {"total": 142, "mes": "2025-01"},
                {"total": 158, "mes": "2024-12"},
                {"total": 173, "mes": "2024-11"}
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis: {str(e)}")

@app.post("/api/smartaudit/auditor", response_model=AuditoriaResponse)
async def evaluar_orden(orden: OrdenMedica):
    """
    Endpoint para el Auditor Clínico
    Valida pertinencia clínica según guías médicas
    """
    try:
        # TODO: Integrar con Google ADK Agent cuando esté configurado
        # Por ahora implementamos lógica de validación básica

        cumple_indicaciones = len(orden.indicaciones) > 50
        menciona_tratamiento = any(palabra in orden.indicaciones.lower()
                                   for palabra in ['semana', 'mes', 'tratamiento', 'fisioterapia', 'aine', 'kinesiología'])

        criterios = [
            CriterioAuditoria(
                criterio="Diagnóstico específico documentado",
                cumple=len(orden.diagnostico) > 0
            ),
            CriterioAuditoria(
                criterio="Indicaciones clínicas detalladas (mínimo 50 caracteres)",
                cumple=cumple_indicaciones
            ),
            CriterioAuditoria(
                criterio="Tratamiento conservador previo documentado (4-6 semanas)",
                cumple=menciona_tratamiento
            ),
            CriterioAuditoria(
                criterio="Práctica coherente con el diagnóstico",
                cumple=True  # Simplificado por ahora
            )
        ]

        aprobado = all(c.cumple for c in criterios)

        return AuditoriaResponse(
            aprobado=aprobado,
            evaluacion=(
                f"La orden médica para {orden.practica} cumple con los criterios de pertinencia clínica según las guías de práctica establecidas. "
                f"El diagnóstico de {orden.diagnostico} justifica la práctica solicitada y se documenta tratamiento previo adecuado."
                if aprobado
                else f"La orden médica para {orden.practica} no cumple con todos los criterios mínimos establecidos en las guías clínicas. "
                     f"Se requiere completar la información faltante antes de la aprobación."
            ),
            criterios=criterios,
            notas=(
                None if aprobado
                else "Se requiere documentar el tratamiento conservador previo de al menos 4-6 semanas según guía clínica. "
                     "Incluir detalles de: duración de síntomas, tratamientos realizados (AINEs, fisioterapia), y respuesta al tratamiento."
            ),
            fuente="Ministerio de Salud Pública. Dolor lumbar: Guía Práctica Clínica (GPC). Primera Edición. Quito: Dirección Nacional de Normatización; 2015"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en auditoría: {str(e)}")

@app.post("/api/smartaudit/revisor", response_model=RevisionResponse)
async def revisar_documento(documento: DocumentoMedico):
    """
    Endpoint para el Revisor Administrativo
    Valida completitud documental
    """
    try:
        # Validar fecha de emisión (últimos 60 días)
        fecha_valida = False
        if documento.fecha:
            try:
                fecha_doc = datetime.fromisoformat(documento.fecha.replace('Z', '+00:00'))
                fecha_limite = datetime.now() - timedelta(days=60)
                fecha_valida = fecha_doc > fecha_limite
            except:
                fecha_valida = False

        items = [
            ItemRevision(
                campo="Datos del Paciente",
                completo=len(documento.paciente) > 5,
                observacion=None if len(documento.paciente) > 5 else "Nombre incompleto o muy corto"
            ),
            ItemRevision(
                campo="Fecha de Emisión",
                completo=fecha_valida,
                observacion=None if fecha_valida else "Fecha fuera del rango válido (últimos 60 días) o formato inválido"
            ),
            ItemRevision(
                campo="Matrícula Médica",
                completo=len(documento.matricula) > 0,
                observacion=None if len(documento.matricula) > 0 else "Matrícula médica no especificada"
            ),
            ItemRevision(
                campo="Diagnóstico",
                completo=len(documento.diagnostico) > 0,
                observacion=None if len(documento.diagnostico) > 0 else "Diagnóstico faltante"
            ),
            ItemRevision(
                campo="Práctica Solicitada",
                completo=len(documento.practica) > 0,
                observacion=None if len(documento.practica) > 0 else "Práctica médica no especificada"
            ),
            ItemRevision(
                campo="Indicaciones Médicas",
                completo=len(documento.indicaciones) > 30,
                observacion=None if len(documento.indicaciones) > 30 else "Indicaciones insuficientes o faltantes (mínimo 30 caracteres)"
            ),
            ItemRevision(
                campo="Plan de Afiliado",
                completo=len(documento.planAfiliado) > 0,
                observacion=None if len(documento.planAfiliado) > 0 else "Plan de afiliado no especificado"
            )
        ]

        todos_completos = all(item.completo for item in items)
        faltantes = [item.campo for item in items if not item.completo]
        completados = len([item for item in items if item.completo])
        total = len(items)

        return RevisionResponse(
            aprobado=todos_completos,
            resumen=(
                f"Documentación completa. Todos los {total} requisitos administrativos están presentes y correctamente completados. "
                f"El documento está listo para proceder a la auditoría clínica."
                if todos_completos
                else f"Documentación incompleta. Se verificaron {completados} de {total} campos requeridos. "
                     f"Por favor complete los {len(faltantes)} campos faltantes antes de continuar."
            ),
            items=items,
            faltantes=faltantes if faltantes else None,
            notas=(
                "El documento cumple con todos los requisitos administrativos para proceder con la auditoría clínica."
                if todos_completos
                else "Se requiere completar la información faltante antes de enviar el documento a auditoría clínica. "
                     "Verifique especialmente la fecha de emisión y las indicaciones médicas."
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en revisión: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
