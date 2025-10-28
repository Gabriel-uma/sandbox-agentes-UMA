import { useState } from 'react'
import { CheckCircle, XCircle, FileCheck } from 'lucide-react'
import { smartAuditService, type AuditoriaResponse } from '@/lib/smartaudit-service'

export function AuditorInterface() {
  const [formData, setFormData] = useState({
    paciente: '',
    diagnostico: '',
    practica: '',
    indicaciones: ''
  })
  const [resultado, setResultado] = useState<AuditoriaResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await smartAuditService.evaluarOrden({ orden: formData })
      setResultado(response)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      paciente: '',
      diagnostico: '',
      practica: '',
      indicaciones: ''
    })
    setResultado(null)
  }

  return (
    <div className="flex flex-col h-full bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileCheck className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold">Auditor Clínico</h2>
        </div>
        <p className="text-muted-foreground">
          Validación de pertinencia clínica según guías médicas oficiales
        </p>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Formulario */}
        <div className="w-1/2 overflow-y-auto">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold mb-4 text-lg">Datos de la Orden Médica</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Paciente *</label>
                <input
                  type="text"
                  value={formData.paciente}
                  onChange={(e) => setFormData({...formData, paciente: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Nombre completo del paciente"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Diagnóstico *</label>
                <input
                  type="text"
                  value={formData.diagnostico}
                  onChange={(e) => setFormData({...formData, diagnostico: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Lumbalgia crónica"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Práctica Solicitada *</label>
                <input
                  type="text"
                  value={formData.practica}
                  onChange={(e) => setFormData({...formData, practica: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Resonancia magnética de columna lumbar"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Indicaciones Médicas *</label>
                <textarea
                  value={formData.indicaciones}
                  onChange={(e) => setFormData({...formData, indicaciones: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background h-32 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Detalle clínico que justifica la práctica solicitada. Incluir tratamiento previo, duración de síntomas, etc."
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Incluir información sobre tratamiento conservador previo (mínimo 4-6 semanas)
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-semibold transition-colors"
                >
                  {loading ? 'Evaluando...' : 'Evaluar Orden'}
                </button>
                {resultado && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    Nuevo
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Resultados */}
        <div className="w-1/2 overflow-y-auto">
          {resultado && (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                {resultado.aprobado ? (
                  <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                )}
                <h3 className={`text-xl font-semibold ${resultado.aprobado ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {resultado.aprobado ? 'Orden Aprobada' : 'Orden Rechazada'}
                </h3>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2 text-sm uppercase tracking-wide text-muted-foreground">Evaluación Clínica</h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {resultado.evaluacion}
                  </p>
                </div>

                {resultado.criterios && resultado.criterios.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">Criterios Verificados</h4>
                    <ul className="space-y-2">
                      {resultado.criterios.map((criterio, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          {criterio.cumple ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          )}
                          <span className={criterio.cumple ? '' : 'text-muted-foreground'}>
                            {criterio.criterio}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {resultado.notas && !resultado.aprobado && (
                  <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <h4 className="font-medium mb-2 text-destructive flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Notas para el médico solicitante
                    </h4>
                    <p className="text-sm">{resultado.notas}</p>
                  </div>
                )}

                {resultado.fuente && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground italic">
                      <strong>Fuente:</strong> {resultado.fuente}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!resultado && (
            <div className="bg-card border border-border rounded-lg p-6 h-full flex items-center justify-center text-center">
              <div>
                <FileCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground font-medium mb-2">
                  Complete el formulario
                </p>
                <p className="text-sm text-muted-foreground">
                  Ingrese los datos de la orden médica y haga clic en "Evaluar Orden"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
