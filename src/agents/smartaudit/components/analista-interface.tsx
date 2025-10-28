import { useState } from 'react'
import { Send, BarChart3 } from 'lucide-react'
import { smartAuditService, type AnalisisResponse } from '@/lib/smartaudit-service'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  sqlQuery?: string
  results?: any[]
}

export function AnalistaInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response: AnalisisResponse = await smartAuditService.consultarAnalista({
        pregunta: input
      })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.respuesta,
        timestamp: new Date(),
        sqlQuery: response.sql_generado,
        results: response.resultados
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Lo siento, ocurrió un error al procesar tu consulta. Por favor intenta nuevamente.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Analista de Datos</h2>
            <p className="text-sm text-muted-foreground">
              Pregunta sobre datos médicos en lenguaje natural
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2 font-semibold">Analista de Datos Médicos</p>
            <p className="text-sm mb-4">
              Pregunta sobre estadísticas, profesionales, prácticas y estados
            </p>
            <div className="max-w-md mx-auto text-left space-y-2 text-xs">
              <p className="font-medium">Ejemplos de preguntas:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>¿Cuántas prácticas se aprobaron este mes?</li>
                <li>¿Qué profesionales han atendido más pacientes?</li>
                <li>¿Cuáles son las prácticas más solicitadas?</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.type === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>

              {/* Mostrar SQL generado */}
              {message.sqlQuery && (
                <div className="mt-3 p-3 bg-background/50 rounded border border-border">
                  <p className="text-xs text-muted-foreground mb-1 font-semibold">SQL Generado:</p>
                  <code className="text-xs font-mono block overflow-x-auto">{message.sqlQuery}</code>
                </div>
              )}

              {/* Mostrar resultados en tabla */}
              {message.results && message.results.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm border border-border rounded">
                    <thead>
                      <tr className="bg-background/50">
                        {Object.keys(message.results[0]).map(key => (
                          <th key={key} className="px-3 py-2 text-left border-b border-border font-semibold">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {message.results.map((row, i) => (
                        <tr key={i} className="hover:bg-background/30">
                          {Object.values(row).map((value: any, j) => (
                            <td key={j} className="px-3 py-2 border-b border-border">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs mt-2 opacity-70">
                {message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ej: ¿Cuántas prácticas se aprobaron este mes?"
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
