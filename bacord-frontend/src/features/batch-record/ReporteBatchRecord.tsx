import { useState } from 'react'
import type { PreLlenadoBR, BatchRecord } from '@/types'
import type { Desviacion } from '@/api/desviaciones'
import type { BatchRecordFirmaRegistrada } from '@/api/batchRecord'

interface ProcesoRow { id: number; codigo: string; descripcion: string; orden: number }

interface Props {
  br: BatchRecord | null
  preLlenado: PreLlenadoBR | null
  estructura: ProcesoRow[]
  detalleDatos: Record<number, Record<string, unknown>>
  firmas: BatchRecordFirmaRegistrada[]
  procesosCerrados: Set<number>
  desviaciones: Desviacion[]
  liberacion: { nombre: string; grupo: string; fecha: string; hora: string } | null
  onClose: () => void
}

// ── helpers ────────────────────────────────────────────────────────────────
const n = (v: unknown, dec = 2) =>
  typeof v === 'number' ? v.toFixed(dec) : typeof v === 'string' ? parseFloat(v).toFixed(dec) : '—'

const pct = (v: unknown) => {
  const val = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN
  if (isNaN(val)) return { text: '—', color: '#64748b' }
  if (val >= 1.0)  return { text: `${val.toFixed(2)}%`, color: '#dc2626' }
  if (val >= 0.5)  return { text: `${val.toFixed(2)}%`, color: '#d97706' }
  return { text: `${val.toFixed(2)}%`, color: '#16a34a' }
}

const estadoBadge = (estado: string) => {
  const s = (estado ?? '').toUpperCase()
  if (s === 'CONFORME' || s === 'APROBADO') return { bg: '#dcfce7', color: '#166534', label: s }
  if (s === 'ADVERTENCIA') return { bg: '#fef9c3', color: '#854d0e', label: s }
  return { bg: '#fee2e2', color: '#991b1b', label: s }
}

function Badge({ estado }: { estado: string }) {
  const b = estadoBadge(estado)
  return (
    <span style={{
      background: b.bg, color: b.color, fontWeight: 700, fontSize: 10,
      padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap',
    }}>{b.label}</span>
  )
}

const COL_HEAD: React.CSSProperties = {
  background: '#0A2D63', color: '#fff', fontWeight: 700, fontSize: 11,
  padding: '6px 10px', textAlign: 'left',
}
const COL: React.CSSProperties = { padding: '6px 10px', fontSize: 11, borderBottom: '1px solid #e2e8f0' }

// ── secciones ──────────────────────────────────────────────────────────────
function SeccionPesaje({ d }: { d: Record<string, unknown> }) {
  const filas = (d.dgPesaje as Record<string, unknown>[] | undefined) ?? []
  if (!filas.length) return null
  return (
    <section style={{ marginBottom: 24 }}>
      <h3 style={tituloSeccion}>Pesaje de Materias Primas</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            {['Material', 'Cód. MP', 'Lote Proveedor', 'Teórico (kg)', 'Pesado (kg)', 'Dif. (kg)', '% Desv.', 'Estado', 'Hora'].map(h => (
              <th key={h} style={COL_HEAD}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => {
            const dev = pct(f.numPctDesv)
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={COL}>{String(f.txtMaterial ?? '—')}</td>
                <td style={COL}>{String(f.txtCodigoMP ?? '—')}</td>
                <td style={COL}>{String(f.txtLoteProveedor ?? '—')}</td>
                <td style={{ ...COL, textAlign: 'right' }}>{n(f.numCantTeorica)}</td>
                <td style={{ ...COL, textAlign: 'right' }}>{n(f.numCantPesada)}</td>
                <td style={{ ...COL, textAlign: 'right' }}>{n(f.numDiferencia)}</td>
                <td style={{ ...COL, textAlign: 'right', color: dev.color, fontWeight: 700 }}>{dev.text}</td>
                <td style={COL}><Badge estado={String(f.txtEstadoPeso ?? '')} /></td>
                <td style={COL}>{String(f.txtHoraPesaje ?? '—')}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
            <td style={{ ...COL, fontWeight: 700 }} colSpan={3}>TOTAL</td>
            <td style={{ ...COL, textAlign: 'right', fontWeight: 700 }}>{n(d.numTotalTeorico)} kg</td>
            <td style={{ ...COL, textAlign: 'right', fontWeight: 700 }}>{n(d.numTotalPesado)} kg</td>
            <td colSpan={3} style={COL} />
            <td style={{ ...COL, fontWeight: 700 }}>
              Rend. Disp.: <span style={{ color: '#166534' }}>{n(d.numRendDispensacion, 2)}%</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  )
}

function SeccionCIP({ d }: { d: Record<string, unknown> }) {
  const rondas = (d.dgCIP as Record<string, unknown>[] | undefined) ?? []
  if (!rondas.length) return null
  return (
    <section style={{ marginBottom: 24 }}>
      <h3 style={tituloSeccion}>Control en Proceso — Pesaje de Cápsulas (CIP)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        {[
          { label: 'Objetivo', value: `${n(d.numPesoObjCIP, 0)} mg` },
          { label: 'Límite inf.', value: `${n(d.numLimInfCIP, 0)} mg` },
          { label: 'Límite sup.', value: `${n(d.numLimSupCIP, 0)} mg` },
          { label: 'RSD máx.', value: `${n(d.numRSDMax)}%` },
        ].map(kv => (
          <div key={kv.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 10, color: '#64748b' }}>{kv.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A2D63' }}>{kv.value}</div>
          </div>
        ))}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={COL_HEAD}>Ronda</th>
            {Array.from({ length: 10 }, (_, i) => <th key={i} style={{ ...COL_HEAD, textAlign: 'right' }}>M{i + 1}</th>)}
            <th style={{ ...COL_HEAD, textAlign: 'right' }}>Prom.</th>
            <th style={{ ...COL_HEAD, textAlign: 'right' }}>Min</th>
            <th style={{ ...COL_HEAD, textAlign: 'right' }}>Max</th>
            <th style={{ ...COL_HEAD, textAlign: 'right' }}>RSD%</th>
            <th style={COL_HEAD}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {rondas.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ ...COL, fontWeight: 700 }}>R{i + 1}</td>
              {Array.from({ length: 10 }, (_, j) => (
                <td key={j} style={{ ...COL, textAlign: 'right' }}>{n(r[`numC${j + 1}`], 0)}</td>
              ))}
              <td style={{ ...COL, textAlign: 'right', fontWeight: 700 }}>{n(r.numPromedioCIP, 1)}</td>
              <td style={{ ...COL, textAlign: 'right' }}>{n(r.numMinCIP, 0)}</td>
              <td style={{ ...COL, textAlign: 'right' }}>{n(r.numMaxCIP, 0)}</td>
              <td style={{ ...COL, textAlign: 'right' }}>{n(r.numRSDCIP)}</td>
              <td style={COL}><Badge estado={String(r.txtEstadoCIP ?? '')} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#f1f5f9', fontWeight: 700 }}>
            <td style={{ ...COL, fontWeight: 700 }} colSpan={11}>GLOBAL ({d.numTotalMuestras as number} muestras)</td>
            <td style={{ ...COL, textAlign: 'right', fontWeight: 700 }}>{n(d.numPromedioGlobal, 1)}</td>
            <td style={{ ...COL, textAlign: 'right' }}>{n(d.numMinGlobal, 0)}</td>
            <td style={{ ...COL, textAlign: 'right' }}>{n(d.numMaxGlobal, 0)}</td>
            <td style={COL} />
            <td style={COL}><Badge estado={String(d.txtEstadoGlobalCIP ?? '')} /></td>
          </tr>
        </tfoot>
      </table>
    </section>
  )
}

function SeccionRendimientos({ et2f3, et3f1, et3f2 }: {
  et2f3: Record<string, unknown>
  et3f1: Record<string, unknown>
  et3f2: Record<string, unknown>
}) {
  const kpis = [
    { label: 'Rend. Encapsulado', value: `${n(et2f3.numRendEncap)}%`, sub: `${(et2f3.numCapsulasProd as number | undefined)?.toLocaleString('es-CO')} cáps aptas / ${(et2f3.numProdTeorRef as number | undefined)?.toLocaleString('es-CO')} teóricas`, ok: true },
    { label: 'Rend. Empaque', value: `${n(et3f2.numRendEmpaque)}%`, sub: `${et3f2.numBlistAprobados} blisters aprobados`, ok: true },
    { label: 'Rend. Global', value: `${n(et3f2.numRendGlobal)}%`, sub: `${et3f2.numCajasFinales} cajas finales`, ok: true },
    { label: 'Cajas producidas', value: String(et3f2.numCajasAprobadas ?? '—'), sub: `${et3f2.numCajasRech ?? 0} rechazadas`, ok: true },
  ]
  return (
    <section style={{ marginBottom: 24 }}>
      <h3 style={tituloSeccion}>Rendimientos de Proceso</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#166534' }}>{k.value}</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>
      {/* AQL */}
      {et3f1.txtDecisionAQL && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0A2D63' }}>Inspección AQL: </span>
          <span style={{ fontSize: 11 }}>{String(et3f1.txtDecisionAQL)}</span>
          <span style={{ marginLeft: 12 }}>
            <Badge estado={String((et3f1.txtDecisionAQL as string ?? '').includes('APROBADO') ? 'APROBADO' : 'NO CONFORME')} />
          </span>
          <span style={{ fontSize: 10, color: '#64748b', marginLeft: 12 }}>
            {String(et3f1.numTotalInsp ?? '—')} uds inspeccionadas · {n(et3f1.numPctDefGlobal)}% defectos globales
          </span>
        </div>
      )}
    </section>
  )
}

function SeccionDesviaciones({ desviaciones }: { desviaciones: Desviacion[] }) {
  if (!desviaciones.length) return null
  return (
    <section style={{ marginBottom: 24 }}>
      <h3 style={tituloSeccion}>Desviaciones Registradas</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            {['ID', 'Etapa', 'Campo', 'Valor', 'Límite', 'Descripción', 'Estado', 'Fecha', 'Cierre'].map(h => (
              <th key={h} style={COL_HEAD}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {desviaciones.map((d, i) => (
            <tr key={d.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ ...COL, fontWeight: 700 }}>#{d.id}</td>
              <td style={COL}>#{d.idDetalle}</td>
              <td style={COL}>{d.labelCampo}</td>
              <td style={{ ...COL, fontWeight: 700, color: '#dc2626' }}>{d.valorIngresado}</td>
              <td style={{ ...COL, color: '#64748b' }}>{d.limiteInfo}</td>
              <td style={{ ...COL, maxWidth: 200 }}>{d.descripcion}</td>
              <td style={COL}><Badge estado={d.estado === 'cerrada' ? 'CONFORME' : 'ADVERTENCIA'} /></td>
              <td style={COL}>{new Date(d.fechaHora).toLocaleDateString('es-CO')}</td>
              <td style={{ ...COL, fontSize: 10, color: '#64748b' }}>{d.observacionCierre ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function SeccionFirmas({ firmas }: { firmas: BatchRecordFirmaRegistrada[] }) {
  if (!firmas.length) return null
  const sorted = [...firmas].sort((a, b) => new Date(a.firmadoEn).getTime() - new Date(b.firmadoEn).getTime())
  return (
    <section style={{ marginBottom: 24 }}>
      <h3 style={tituloSeccion}>Historial de Firmas Electrónicas</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            {['Etapa/Detalle', 'Rol / Grupo', 'Usuario', 'Login', 'Fecha', 'Hora'].map(h => (
              <th key={h} style={COL_HEAD}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((f, i) => (
            <tr key={f.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ ...COL, fontWeight: 700 }}>Detalle #{f.idDetalle}</td>
              <td style={COL}>{f.firma.grupo.nombre}</td>
              <td style={COL}>{f.usuario.nombres} {f.usuario.apellidos}</td>
              <td style={{ ...COL, fontFamily: 'monospace' }}>{f.usuario.login}</td>
              <td style={COL}>{new Date(f.firmadoEn).toLocaleDateString('es-CO')}</td>
              <td style={COL}>{new Date(f.firmadoEn).toTimeString().slice(0, 5)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

const tituloSeccion: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: '#0A2D63',
  borderBottom: '2px solid #0A2D63', paddingBottom: 4, marginBottom: 12,
  marginTop: 0, textTransform: 'uppercase', letterSpacing: '0.04em',
}

// ── markdown renderer (para respuesta del LLM) ────────────────────────────
function mdToHtml(text: string): string {
  let s = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>')
  s = s.replace(/^#{1,3} (.+)$/gm, '<div style="font-weight:700;margin:8px 0 2px">$1</div>')
  s = s.replace(/((?:^[\-\*] .+$\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^[\-\*] /, '')}</li>`).join('')
    return `<ul style="margin:4px 0;padding-left:18px">${items}</ul>`
  })
  s = s.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>')
  return s
}

// ── componente principal ───────────────────────────────────────────────────
export function ReporteBatchRecord({ br, preLlenado, estructura, detalleDatos, firmas, procesosCerrados, desviaciones, liberacion, onClose }: Props) {
  const d = (id: number) => detalleDatos[id] ?? {}

  const [aiText,      setAiText]      = useState('')
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiError,     setAiError]     = useState(false)
  const [aiGenerated, setAiGenerated] = useState(false)

  const producto = preLlenado?.descripcionMaterial ?? '—'
  const lote     = preLlenado?.loteLogistico ?? '—'
  const op       = preLlenado?.numeroOrdenProceso ?? '—'
  const tamLote  = preLlenado ? `${preLlenado.cantidadOrden.toLocaleString('es-CO')} ${preLlenado.unidadMedida}` : '—'
  const fechaFab = preLlenado?.fechaFabricacion ?? '—'
  const fechaCad = preLlenado?.fechaCaducidad ?? '—'

  const etapasTotal    = estructura.length
  const etapasCerradas = estructura.filter(e => procesosCerrados.has(e.id)).length

  const printReport = () => window.print()

  const generateAnalysis = async () => {
    setAiLoading(true); setAiError(false); setAiText(''); setAiGenerated(false)

    const etapasStr = estructura.map(e =>
      `  - ${e.codigo} ${e.descripcion}: ${procesosCerrados.has(e.id) ? 'CERRADA' : 'EN PROCESO'}`
    ).join('\n')

    const desvStr = desviaciones.length
      ? desviaciones.map(d2 => `  - ${d2.descripcion} [${d2.estado}] — valor: ${d2.valorIngresado}, límite: ${d2.limiteInfo}`).join('\n')
      : '  Ninguna'

    const rendStr = (() => {
      const e = d(203); const e2 = d(302)
      const parts: string[] = []
      if (e.numRendEncap) parts.push(`Rend. encapsulado: ${n(e.numRendEncap)}%`)
      if (e2.numRendEmpaque) parts.push(`Rend. empaque: ${n(e2.numRendEmpaque)}%`)
      if (e2.numRendGlobal) parts.push(`Rend. global: ${n(e2.numRendGlobal)}%`)
      return parts.length ? parts.join(' | ') : 'No disponible'
    })()

    const prompt = `Eres un experto en Buenas Prácticas de Manufactura (BPM/GMP) farmacéutica. Analiza el siguiente resumen de un Batch Record y genera un análisis técnico GMP conciso.

LOTE: ${lote}
PRODUCTO: ${producto}
ORDEN DE PROCESO: ${op}
TAMAÑO DE LOTE: ${tamLote}
ESTADO: ${liberacion ? 'LIBERADO' : 'EN PROCESO'}
${liberacion ? `LIBERADO POR: ${liberacion.nombre} el ${liberacion.fecha}` : ''}

ETAPAS (${etapasCerradas}/${etapasTotal} cerradas):
${etapasStr}

RENDIMIENTOS: ${rendStr}

DESVIACIONES:
${desvStr}

FIRMAS REGISTRADAS: ${firmas.length} firmas electrónicas

Proporciona:
1. **Resumen de conformidad GMP** — ¿el lote cumple los requisitos generales?
2. **Puntos críticos identificados** — desviaciones, etapas pendientes, riesgos
3. **Conclusión y recomendación** — ¿se recomienda liberar, retener o investigar?

Responde en español, de forma técnica y concisa (máx 300 palabras). Indica que es un análisis orientativo generado por IA.`

    try {
      const res = await fetch('http://localhost:11434/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3.2', stream: true, messages: [{ role: 'user', content: prompt }] }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          const t = line.replace(/^data:\s*/, '').trim()
          if (!t || t === '[DONE]') continue
          try { const token = JSON.parse(t).choices?.[0]?.delta?.content ?? ''; if (token) { acc += token; setAiText(acc) } } catch { /* skip */ }
        }
      }
      setAiGenerated(true)
    } catch {
      setAiError(true)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#reporte-br-overlay) { display: none !important; }
          #reporte-br-overlay {
            position: static !important;
            background: white !important;
            padding: 0 !important;
          }
          #reporte-br-actions { display: none !important; }
          #reporte-br-paper {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }
        }
      `}</style>

      {/* Overlay */}
      <div id="reporte-br-overlay" style={{
        position: 'fixed', inset: 0, zIndex: 1300,
        background: 'rgba(10,21,48,0.55)',
        overflowY: 'auto',
        padding: '32px 16px',
      }}>
        {/* Acciones */}
        <div id="reporte-br-actions" style={{
          maxWidth: 1100, margin: '0 auto 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', borderRadius: 8, padding: '7px 18px', fontSize: 13,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>← Volver al Batch Record</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={generateAnalysis} disabled={aiLoading} style={{
              background: aiGenerated ? '#0A2D63' : 'rgba(255,255,255,0.15)',
              border: `1px solid ${aiGenerated ? '#F7C92E' : 'rgba(255,255,255,0.3)'}`,
              color: aiGenerated ? '#F7C92E' : '#fff',
              borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 700,
              cursor: aiLoading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, opacity: aiLoading ? 0.75 : 1,
            }}>
              {aiLoading ? '⏳ Generando…' : aiGenerated ? '🤖 Regenerar análisis' : '🤖 Generar análisis IA'}
            </button>
            <button onClick={printReport} style={{
              background: '#F7C92E', border: 'none', color: '#0A2D63',
              borderRadius: 8, padding: '8px 22px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>🖨 Imprimir / Exportar PDF</button>
          </div>
        </div>

        {/* Papel */}
        <div id="reporte-br-paper" style={{
          maxWidth: 1100, margin: '0 auto',
          background: '#fff', borderRadius: 12,
          boxShadow: '0 8px 40px rgba(10,45,99,0.25)',
          padding: '36px 48px',
          fontFamily: 'var(--f-sans, system-ui, sans-serif)',
        }}>
          {/* ── Encabezado del reporte ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Reporte de Lote — Batch Record
              </div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0A2D63', lineHeight: 1.2 }}>
                {producto}
              </h1>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Lote: <strong>{lote}</strong></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                background: '#0A2D63', color: '#F7C92E',
                fontWeight: 800, fontSize: 18, padding: '8px 20px', borderRadius: 10,
                letterSpacing: '0.03em',
              }}>BACORD</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                Generado: {new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* ── Identificación del lote ── */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px 20px' }}>
              {[
                { label: 'Código', value: preLlenado?.codigoMaterial ?? '—' },
                { label: 'Orden de Proceso', value: op },
                { label: 'Tamaño de Lote', value: tamLote },
                { label: 'Centro', value: preLlenado?.centro ?? '—' },
                { label: 'Fecha Fabricación', value: fechaFab },
                { label: 'Fecha Caducidad', value: fechaCad },
                { label: 'Etapas cerradas', value: `${etapasCerradas} / ${etapasTotal}` },
                { label: 'Estado', value: br?.idEstado === 2 ? 'LIBERADO' : br?.idEstado === 3 ? 'CANCELADO' : 'EN PROCESO' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{item.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{item.value}</div>
                </div>
              ))}
            </div>
            {liberacion && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e2e8f0', fontSize: 11 }}>
                <span style={{ color: '#64748b' }}>Liberado por: </span>
                <strong>{liberacion.nombre}</strong>
                <span style={{ color: '#64748b', marginLeft: 8 }}>({liberacion.grupo}) · {liberacion.fecha} {liberacion.hora}</span>
                {(d(303).txtProducto || d(303).txtLote) && (
                  <span style={{ marginLeft: 16, color: '#64748b' }}>
                    Lote de inspección cierre: <strong>{String(d(303).txtLoteInspCierre ?? '—')}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Etapas timeline ── */}
          <section style={{ marginBottom: 24 }}>
            <h3 style={tituloSeccion}>Estado de Etapas</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              {estructura.map(e => {
                const cerrada = procesosCerrados.has(e.id)
                return (
                  <div key={e.id} style={{
                    flex: 1, background: cerrada ? '#f0fdf4' : '#fff8ed',
                    border: `1px solid ${cerrada ? '#bbf7d0' : '#fde68a'}`,
                    borderRadius: 10, padding: '10px 14px',
                  }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>{e.codigo}</div>
                    <div style={{ fontSize: 11, color: '#1e293b', fontWeight: 600, marginTop: 2 }}>{e.descripcion}</div>
                    <div style={{ marginTop: 6 }}>
                      <Badge estado={cerrada ? 'CONFORME' : 'ADVERTENCIA'} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── Materias primas de la OP ── */}
          {preLlenado?.componentes?.length ? (
            <section style={{ marginBottom: 24 }}>
              <h3 style={tituloSeccion}>Materias Primas — Orden de Proceso</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    {['Material', 'Código', 'Lote', 'Cantidad Teórica'].map(h => (
                      <th key={h} style={COL_HEAD}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preLlenado.componentes.map((c, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={COL}>{c.descripcionMaterialComponente}</td>
                      <td style={COL}>{c.codigoMaterialComponente}</td>
                      <td style={COL}>{c.loteComponente}</td>
                      <td style={{ ...COL, textAlign: 'right' }}>{c.cantidad} {c.unidadMedida}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {/* ── ET1: Pesaje ── */}
          {Object.keys(d(102)).length > 0 && <SeccionPesaje d={d(102)} />}

          {/* ── ET2: CIP ── */}
          {Object.keys(d(202)).length > 0 && <SeccionCIP d={d(202)} />}

          {/* ── Rendimientos ── */}
          {(Object.keys(d(203)).length > 0 || Object.keys(d(301)).length > 0 || Object.keys(d(302)).length > 0) && (
            <SeccionRendimientos et2f3={d(203)} et3f1={d(301)} et3f2={d(302)} />
          )}

          {/* ── Desviaciones ── */}
          <SeccionDesviaciones desviaciones={desviaciones} />

          {/* ── Análisis IA ── */}
          {(aiText || aiLoading || aiError) && (
            <section style={{ marginBottom: 24, pageBreakInside: 'avoid' }}>
              <h3 style={tituloSeccion}>Análisis GMP — Asistente IA</h3>
              <div style={{
                background: '#f8fafc', border: '1.5px solid #e2e8f0',
                borderRadius: 10, padding: '16px 20px',
                fontSize: 12.5, lineHeight: 1.8, color: '#1e293b',
                minHeight: 60,
              }}>
                {aiLoading && !aiText && (
                  <span style={{ color: '#64748b', fontStyle: 'italic' }}>Analizando el lote…</span>
                )}
                {aiError && (
                  <span style={{ color: '#dc2626' }}>⚠️ No se pudo conectar con Ollama. Verifica que esté corriendo en localhost:11434.</span>
                )}
                {aiText && (
                  <div dangerouslySetInnerHTML={{ __html: mdToHtml(aiText) }} />
                )}
              </div>
              {aiGenerated && (
                <div style={{ marginTop: 6, fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
                  🤖 Generado por IA (llama3.2 — Ollama local) · Análisis orientativo — no reemplaza la revisión GMP oficial
                </div>
              )}
            </section>
          )}

          {/* ── Firmas ── */}
          <SeccionFirmas firmas={firmas} />

          {/* ── Pie de página ── */}
          <div style={{
            marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between',
            fontSize: 10, color: '#94a3b8',
          }}>
            <span>BACORD — Sistema Electrónico de Registro de Lotes</span>
            <span>Lote: {lote} · OP: {op}</span>
            <span>Documento generado electrónicamente — No requiere firma física</span>
          </div>
        </div>
      </div>
    </>
  )
}
