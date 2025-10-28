// SmartAudit Service - Cliente para servicios de auditoría médica
// Integrado con backend FastAPI en Cloud Run

export interface AnalisisRequest {
  pregunta: string
}

export interface AnalisisResponse {
  respuesta: string
  sql_generado?: string
  resultados?: any[]
}

export interface AuditoriaRequest {
  orden: {
    paciente: string
    diagnostico: string
    practica: string
    indicaciones: string
  }
}

export interface AuditoriaResponse {
  aprobado: boolean
  evaluacion: string
  criterios: Array<{ criterio: string; cumple: boolean }>
  notas?: string
  fuente?: string
}

export interface RevisionRequest {
  documento: {
    paciente: string
    fecha: string
    matricula: string
    diagnostico: string
    practica: string
    indicaciones: string
    planAfiliado: string
  }
}

export interface RevisionResponse {
  aprobado: boolean
  resumen: string
  items: Array<{
    campo: string
    completo: boolean
    observacion?: string
  }>
  faltantes?: string[]
  notas?: string
}

// URL del backend en Cloud Run
const SMARTAUDIT_API_URL = import.meta.env.VITE_SMARTAUDIT_API_URL || 'http://localhost:8000'

class SmartAuditService {
  /**
   * Consulta al Analista de Datos
   */
  async consultarAnalista(request: AnalisisRequest): Promise<AnalisisResponse> {
    try {
      const response = await fetch(`${SMARTAUDIT_API_URL}/api/smartaudit/analista`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error en consultarAnalista:', error)
      throw new Error('Error al consultar el analista de datos. Por favor intente nuevamente.')
    }
  }

  /**
   * Evaluar orden médica (Auditor Clínico)
   */
  async evaluarOrden(request: AuditoriaRequest): Promise<AuditoriaResponse> {
    try {
      const response = await fetch(`${SMARTAUDIT_API_URL}/api/smartaudit/auditor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request.orden)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error en evaluarOrden:', error)
      throw new Error('Error al evaluar la orden médica. Por favor intente nuevamente.')
    }
  }

  /**
   * Revisar documento médico (Revisor Administrativo)
   */
  async revisarDocumento(request: RevisionRequest): Promise<RevisionResponse> {
    try {
      const response = await fetch(`${SMARTAUDIT_API_URL}/api/smartaudit/revisor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request.documento)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error en revisarDocumento:', error)
      throw new Error('Error al revisar el documento. Por favor intente nuevamente.')
    }
  }
}

export const smartAuditService = new SmartAuditService()
