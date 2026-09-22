import { useState, useRef, useEffect } from 'react'
import type { PreLlenadoBR, BatchRecord } from '@/types'
import type { Desviacion } from '@/api/desviaciones'

interface ProcesoRow { id: number; codigo: string; descripcion: string; orden: number }
interface Message { role: 'user' | 'assistant'; content: string }

interface Props {
  br: BatchRecord | null
  preLlenado: PreLlenadoBR | null
  estructura: ProcesoRow[]
  procesoActivo: number | null
  firmasPendientes: number
  desviaciones: Desviacion[]
  procesosCerrados: Set<number>
}

const OLLAMA_URL = 'http://localhost:11434/v1/chat/completions'
const MODEL = 'llama3.2'

function buildSystemPrompt(props: Props): string {
  const { br, preLlenado, estructura, procesoActivo, firmasPendientes, desviaciones, procesosCerrados } = props

  const producto = preLlenado?.descripcionMaterial ?? 'Desconocido'
  const lote = preLlenado?.loteLogistico ?? '—'
  const op = preLlenado?.numeroOrdenProceso ?? '—'
  const tamLote = preLlenado ? `${preLlenado.cantidadOrden} ${preLlenado.unidadMedida}` : '—'

  const etapas = estructura.map(p => {
    const cerrada = procesosCerrados.has(p.id)
    const activa = p.id === procesoActivo
    return `  - ${p.codigo}: ${p.descripcion} [${cerrada ? 'CERRADA' : activa ? 'EN PROGRESO' : 'PENDIENTE'}]`
  }).join('\n')

  const materiales = preLlenado?.componentes?.map(c =>
    `  - ${c.descripcionMaterialComponente} (${c.codigoMaterialComponente}): ${c.cantidad} kg, Lote: ${c.loteComponente}`
  ).join('\n') ?? '  (sin materiales)'

  const desvText = desviaciones.length > 0
    ? desviaciones.map(d => `  - ${d.descripcion ?? 'Desviación'} [${d.estado}]`).join('\n')
    : '  Ninguna'

  return `Eres un asistente experto en Buenas Prácticas de Manufactura (BPM/GMP) farmacéutica integrado en el sistema BACORD de registro electrónico de lotes (eBR).

CONTEXTO DEL LOTE ACTIVO:
- Producto: ${producto}
- Lote: ${lote}
- Orden de Proceso: ${op}
- Tamaño de lote: ${tamLote}
- Firmas pendientes: ${firmasPendientes}

ETAPAS DEL PROCESO:
${etapas}

MATERIAS PRIMAS:
${materiales}

DESVIACIONES ACTIVAS:
${desvText}

INSTRUCCIONES:
- Responde siempre en español, de forma clara y concisa.
- Eres el asistente GMP del operador de planta — ayúdalo a cumplir correctamente el proceso.
- Si hay desviaciones activas, menciónalas cuando sea relevante.
- Si el operador pregunta qué falta, revisa las firmas pendientes y etapas abiertas.
- Cuando detectes riesgos de incumplimiento GMP, indícalo claramente.
- Sé práctico: da pasos concretos, no explicaciones teóricas largas.`
}

export function GmpChatPanel(props: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Verificar que Ollama esté disponible al abrir
  useEffect(() => {
    if (!open || ollamaOk !== null) return
    fetch(`${OLLAMA_URL.replace('/v1/chat/completions', '/api/tags')}`)
      .then(r => setOllamaOk(r.ok))
      .catch(() => setOllamaOk(false))
  }, [open, ollamaOk])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          stream: false,
          messages: [
            { role: 'system', content: buildSystemPrompt(props) },
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content ?? 'Sin respuesta.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ No se pudo conectar con Ollama. Verifica que esté corriendo en `localhost:11434`.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Asistente GMP"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 1200,
          width: 52, height: 52, borderRadius: '50%',
          background: open ? '#0A2D63' : 'linear-gradient(135deg,#0A2D63,#1a4d8a)',
          border: '2px solid rgba(247,201,46,0.5)',
          color: '#F7C92E', fontSize: 22, cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(10,45,99,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 150ms',
        }}
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Panel del chat */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 28, zIndex: 1200,
          width: 380, height: 520,
          background: '#fff', borderRadius: 16,
          border: '1px solid rgba(10,21,48,0.12)',
          boxShadow: '0 8px 40px rgba(10,45,99,0.18)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg,#0A2D63,#0D3575)',
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Asistente GMP</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                {ollamaOk === false ? '🔴 Ollama no disponible' :
                 ollamaOk === true  ? `🟢 ${MODEL}` : '⏳ Conectando...'}
              </div>
            </div>
            {props.desviaciones.length > 0 && (
              <div style={{
                marginLeft: 'auto', background: 'rgba(239,68,68,0.2)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: 20, padding: '2px 10px',
                color: '#fca5a5', fontSize: 11, fontWeight: 700,
              }}>
                ⚠️ {props.desviaciones.length} desviación{props.desviaciones.length > 1 ? 'es' : ''}
              </div>
            )}
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 16px', color: '#94a3b8', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💊</div>
                <div style={{ fontWeight: 600, color: '#64748b', marginBottom: 6 }}>¿En qué te ayudo?</div>
                <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                  Puedo ayudarte con el proceso actual,<br />
                  interpretar desviaciones o guiar pasos GMP.
                </div>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {['¿Qué me falta para cerrar esta etapa?', '¿Cómo manejo una desviación de pesaje?', 'Explícame el siguiente paso'].map(q => (
                    <button key={q} onClick={() => { setInput(q); inputRef.current?.focus() }}
                      style={{
                        background: '#f1f5f9', border: '1px solid #e2e8f0',
                        borderRadius: 8, padding: '6px 12px', fontSize: 11,
                        color: '#475569', cursor: 'pointer', textAlign: 'left',
                      }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '85%', padding: '8px 12px', borderRadius: 12,
                  fontSize: 12.5, lineHeight: 1.55,
                  background: m.role === 'user' ? '#0A2D63' : '#f1f5f9',
                  color: m.role === 'user' ? '#fff' : '#1e293b',
                  borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                  borderBottomLeftRadius: m.role === 'assistant' ? 4 : 12,
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 4, padding: '8px 12px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#94a3b8',
                    animation: `chatdot 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px', borderTop: '1px solid #e2e8f0',
            display: 'flex', gap: 8, alignItems: 'flex-end',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escribe tu pregunta... (Enter para enviar)"
              rows={1}
              style={{
                flex: 1, resize: 'none', border: '1px solid #e2e8f0',
                borderRadius: 10, padding: '8px 12px', fontSize: 12.5,
                fontFamily: 'var(--f-sans)', outline: 'none',
                maxHeight: 80, overflowY: 'auto',
              }}
              disabled={loading || ollamaOk === false}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || ollamaOk === false}
              style={{
                background: '#0A2D63', color: '#F7C92E',
                border: 'none', borderRadius: 10,
                width: 36, height: 36, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, opacity: (!input.trim() || loading || ollamaOk === false) ? 0.4 : 1,
                transition: 'opacity 150ms',
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatdot {
          0%,80%,100% { transform: scale(0.6); opacity: 0.4 }
          40% { transform: scale(1); opacity: 1 }
        }
      `}</style>
    </>
  )
}
