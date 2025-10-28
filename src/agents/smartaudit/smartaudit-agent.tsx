import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ThemeProvider } from '@/components/theme-provider'
import { SmartAuditSidebar } from './components/smartaudit-sidebar'
import { AnalistaInterface } from './components/analista-interface'
import { AuditorInterface } from './components/auditor-interface'
import { RevisorInterface } from './components/revisor-interface'

type AgentSection = 'analista' | 'auditor' | 'revisor' | 'settings' | 'help'

export default function SmartAuditAgent() {
  const [activeSection, setActiveSection] = useState<AgentSection>('analista')
  const navigate = useNavigate()

  const renderContent = () => {
    switch (activeSection) {
      case 'analista':
        return <AnalistaInterface />
      case 'auditor':
        return <AuditorInterface />
      case 'revisor':
        return <RevisorInterface />
      case 'settings':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-semibold mb-2">Configuración</p>
              <p className="text-sm">Próximamente: Ajustes de umbrales y parámetros de auditoría</p>
            </div>
          </div>
        )
      case 'help':
        return (
          <div className="flex items-center justify-center h-full p-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold mb-4">Ayuda - SmartAudit</h2>
              <div className="space-y-4 text-sm">
                <section>
                  <h3 className="font-semibold text-lg mb-2">Analista de Datos</h3>
                  <p className="text-muted-foreground">
                    Realiza consultas en lenguaje natural sobre datos médicos. El agente traduce tu pregunta
                    a SQL y ejecuta la consulta en BigQuery, retornando los resultados en formato tabular.
                  </p>
                  <p className="text-muted-foreground mt-2">
                    <strong>Ejemplos:</strong> "¿Cuántas prácticas se aprobaron este mes?",
                    "¿Qué profesionales han atendido más pacientes?"
                  </p>
                </section>

                <section className="pt-4 border-t border-border">
                  <h3 className="font-semibold text-lg mb-2">Auditor Clínico</h3>
                  <p className="text-muted-foreground">
                    Valida la pertinencia clínica de órdenes médicas según guías oficiales (Ministerio de Salud).
                    Verifica que el diagnóstico, práctica solicitada e indicaciones cumplan con los criterios establecidos.
                  </p>
                  <p className="text-muted-foreground mt-2">
                    <strong>Requisitos clave:</strong> Tratamiento previo documentado (4-6 semanas),
                    indicaciones detalladas, coherencia diagnóstico-práctica.
                  </p>
                </section>

                <section className="pt-4 border-t border-border">
                  <h3 className="font-semibold text-lg mb-2">Revisor Administrativo</h3>
                  <p className="text-muted-foreground">
                    Verifica la completitud documental de órdenes médicas. Revisa que todos los campos requeridos
                    estén presentes: datos del paciente, fecha válida (últimos 60 días), matrícula médica,
                    diagnóstico, práctica, indicaciones y plan de afiliado.
                  </p>
                </section>

                <section className="pt-4 border-t border-border">
                  <h3 className="font-semibold text-lg mb-2">Tecnología</h3>
                  <p className="text-muted-foreground">
                    SmartAudit utiliza Google Gemini API con Agent Development Kit (ADK) para procesamiento
                    inteligente de datos médicos y cumplimiento normativo.
                  </p>
                </section>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen bg-background relative">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-400 to-purple-500 text-white hover:from-fuchsia-500 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la fábrica
        </button>

        {/* Sidebar */}
        <SmartAuditSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </ThemeProvider>
  )
}
