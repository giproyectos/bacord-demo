import { useState, useRef, useEffect } from 'react'
import type { PreLlenadoBR, BatchRecord } from '@/types'
import type { Desviacion } from '@/api/desviaciones'

interface ProcesoRow { id: number; codigo: string; descripcion: string; orden: number }
interface Message { role: 'user' | 'assistant'; content: string }

function mdToHtml(text: string): string {
  // Escape HTML entities first
  let s = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Fenced code blocks
  s = s.replace(/```(?:\w*\n)?([\s\S]*?)```/g,
    '<pre style="background:#1e293b;color:#e2e8f0;padding:8px 10px;border-radius:6px;font-size:11px;overflow-x:auto;margin:4px 0">$1</pre>')

  // Inline code
  s = s.replace(/`([^`\n]+)`/g,
    '<code style="background:#e2e8f0;color:#0f172a;padding:1px 4px;border-radius:3px;font-size:11px">$1</code>')

  // Bold
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Headers (## and ###)
  s = s.replace(/^#{3} (.+)$/gm,
    '<div style="font-weight:700;font-size:12px;color:#0f172a;margin:8px 0 2px">$1</div>')
  s = s.replace(/^#{1,2} (.+)$/gm,
    '<div style="font-weight:700;font-size:12.5px;color:#0f172a;margin:10px 0 3px">$1</div>')

  // Horizontal rule
  s = s.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:6px 0">')

  // Unordered list items — collect consecutive ones
  s = s.replace(/((?:^[\-\*•] .+$\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^[\-\*•] /, '')}</li>`).join('')
    return `<ul style="margin:4px 0;padding-left:16px;list-style:disc">${items}</ul>`
  })

  // Ordered list items
  s = s.replace(/((?:^\d+\. .+$\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('')
    return `<ol style="margin:4px 0;padding-left:16px">${items}</ol>`
  })

  // Paragraph breaks (double newline)
  s = s.replace(/\n{2,}/g, '<br><br>')
  // Single newlines
  s = s.replace(/\n/g, '<br>')

  return s
}

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

    // Add empty assistant message that we'll fill token by token
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          stream: true,
          messages: [
            { role: 'system', content: buildSystemPrompt(props) },
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          const trimmed = line.replace(/^data:\s*/, '').trim()
          if (!trimmed || trimmed === '[DONE]') continue
          try {
            const json = JSON.parse(trimmed)
            const token = json.choices?.[0]?.delta?.content ?? ''
            if (token) {
              accumulated += token
              setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { role: 'assistant', content: accumulated }
                return next
              })
            }
          } catch { /* skip malformed chunk */ }
        }
      }

      if (!accumulated) {
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: 'Sin respuesta.' }
          return next
        })
      }
    } catch (e) {
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: '⚠️ No se pudo conectar con Ollama. Verifica que esté corriendo en `localhost:11434`.' }
        return next
      })
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
                  fontSize: 12.5, lineHeight: 1.6,
                  background: m.role === 'user' ? '#0A2D63' : '#f1f5f9',
                  color: m.role === 'user' ? '#fff' : '#1e293b',
                  borderBottomRightRadius: m.role === 'user' ? 4 : 12,
                  borderBottomLeftRadius: m.role === 'assistant' ? 4 : 12,
                  whiteSpace: m.role === 'user' ? 'pre-wrap' : undefined,
                }}
                  {...(m.role === 'assistant'
                    ? { dangerouslySetInnerHTML: { __html: mdToHtml(m.content) } }
                    : { children: m.content }
                  )}
                />
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
