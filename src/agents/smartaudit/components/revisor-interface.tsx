import { useState } from 'react'
import { CheckSquare, XSquare, ClipboardCheck } from 'lucide-react'
import { smartAuditService, type RevisionResponse } from '@/lib/smartaudit-service'

export function RevisorInterface() {
  const [formData, setFormData] = useState({
    paciente: '',
    fecha: '',
    matricula: '',
    diagnostico: '',
    practica: '',
    indicaciones: '',
    planAfiliado: ''
  })
  const [resultado, setResultado] = useState<RevisionResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await smartAuditService.revisarDocumento({ documento: formData })
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
      fecha: '',
      matricula: '',
      diagnostico: '',
      practica: '',
      indicaciones: '',
      planAfiliado: ''
    })
    setResultado(null)
  }

  return (
    <div className="flex flex-col h-full bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ClipboardCheck className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold">Revisor Administrativo</h2>
        </div>
        <p className="text-muted-foreground">
          Verificación de completitud documental y cumplimiento administrativo
        </p>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Formulario */}
        <div className="w-1/2 overflow-y-auto">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold mb-4 text-lg">Datos del Documento</h3>
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
                <label className="block text-sm font-medium mb-1">Fecha de Emisión *</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Matrícula Médica *</label>
                <input
                  type="text"
                  value={formData.matricula}
                  onChange={(e) => setFormData({...formData, matricula: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: MN 12345"
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
                  placeholder="Diagnóstico principal"
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
                  placeholder="Nombre de la práctica médica"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Indicaciones Médicas *</label>
                <textarea
                  value={formData.indicaciones}
                  onChange={(e) => setFormData({...formData, indicaciones: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background h-24 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Indicaciones del médico tratante"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Plan de Afiliado *</label>
                <input
                  type="text"
                  value={formData.planAfiliado}
                  onChange={(e) => setFormData({...formData, planAfiliado: e.target.value})}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej: Plan Básico, Plan Premium"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-semibold transition-colors"
                >
                  {loading ? 'Revisando...' : 'Revisar Documento'}
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
                  <CheckSquare className="w-8 h-8 text-green-500 flex-shrink-0" />
                ) : (
                  <XSquare className="w-8 h-8 text-red-500 flex-shrink-0" />
                )}
                <h3 className={`text-xl font-semibold ${resultado.aprobado ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {resultado.aprobado ? 'Documentación Completa' : 'Documentación Incompleta'}
                </h3>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2 text-sm uppercase tracking-wide text-muted-foreground">Resumen</h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {resultado.resumen}
                  </p>
                </div>

                {resultado.items && resultado.items.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">Lista de Verificación</h4>
                    <div className="space-y-2">
                      {resultado.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border">
                          {item.completo ? (
                            <CheckSquare className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XSquare className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${item.completo ? '' : 'text-muted-foreground'}`}>
                              {item.campo}
                            </p>
                            {item.observacion && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.observacion}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resultado.faltantes && resultado.faltantes.length > 0 && (
                  <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <h4 className="font-medium mb-2 text-destructive flex items-center gap-2">
                      <XSquare className="w-4 h-4" />
                      Campos Faltantes
                    </h4>
                    <ul className="space-y-1">
                      {resultado.faltantes.map((faltante, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                          {faltante}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {resultado.notas && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="font-medium mb-2 text-sm">Notas Adicionales</h4>
                    <p className="text-sm text-muted-foreground">{resultado.notas}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!resultado && (
            <div className="bg-card border border-border rounded-lg p-6 h-full flex items-center justify-center text-center">
              <div>
                <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground font-medium mb-2">
                  Complete el formulario
                </p>
                <p className="text-sm text-muted-foreground">
                  Ingrese los datos del documento y haga clic en "Revisar Documento"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
