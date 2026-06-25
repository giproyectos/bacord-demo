import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { mockEstrategiasFirma, mockUsuarios, mockBatchRecords } from '@/api/mock'
import { formulaControlApi } from '@/api/formulaControl'
import { batchRecordApi } from '@/api/batchRecord'
import type { PreLlenadoBR } from '@/types'
import { getDetalleById } from '@/stores/detallesStore'
import type { EstrategiaFirmaItem } from '@/types'
import { useAudit } from '@/hooks/useAudit'
import { useAuditStore } from '@/stores/auditStore'
import { diffValores } from '@/utils/auditDiff'

// ── Schema component types ───────────────────────────────────────────────
type SchemaComp =
  | { type: 'heading';      text: string }
  | { type: 'divider' }
  | { type: 'textfield';    key: string; label: string; placeholder?: string }
  | { type: 'number';       key: string; label: string; unit?: string }
  | { type: 'select';       key: string; label: string; options: string[] }
  | { type: 'textarea';     key: string; label: string; rows?: number }
  | { type: 'datetime';     key: string; label: string }
  | { type: 'firma-seccion'; key: string; label: string; idEstrategiaFirma: number }

function buildSchema(...comps: SchemaComp[]) { return JSON.stringify({ components: comps }) }

const mkH   = (text: string): SchemaComp                                     => ({ type: 'heading', text })
const mkDiv = (): SchemaComp                                                  => ({ type: 'divider' })
const mkTF  = (key: string, label: string, ph?: string): SchemaComp          => ({ type: 'textfield', key, label, placeholder: ph })
const mkNum = (key: string, label: string, unit?: string): SchemaComp        => ({ type: 'number', key, label, unit })
const mkSel = (key: string, label: string, options: string[]): SchemaComp    => ({ type: 'select', key, label, options })
const mkTA  = (key: string, label: string, rows = 2): SchemaComp             => ({ type: 'textarea', key, label, rows })
const mkDT  = (key: string, label: string): SchemaComp                       => ({ type: 'datetime', key, label })
const mkFS  = (key: string, label: string, idEF: number): SchemaComp         => ({ type: 'firma-seccion', key, label, idEstrategiaFirma: idEF })

// ── Datos de firma ───────────────────────────────────────────────────────
interface FirmaInfo { nombre: string; cargo: string; fecha: string; hora: string; loginUsuario: string; idUsuario: number }

// Mapa grupo → cargo oficial en el sistema
const GRUPO_CARGO: Record<string, string> = {
  'Producción':     'Operario de Producción',
  'Calidad':        'Analista de Control de Calidad',
  'Supervisión':    'Supervisor de Producción',
  'Administradores':'Administrador del Sistema',
  'Dirección':      'Director Técnico de Planta',
}

// firmados: clave → FirmaInfo (undefined = aún no firmado)
type FirmaMap = { [key: string]: FirmaInfo | undefined }

// ── Cabecera dinámica ──────────────────────────────────────────────────────
function buildCabeceraItems(pl: PreLlenadoBR | null) {
  return [
    { label: 'Producto',          value: pl?.descripcionMaterial ?? '—' },
    { label: 'Código',            value: pl?.codigoMaterial      ?? '—' },
    { label: 'Lote No.',          value: pl?.loteLogistico       ?? '—' },
    { label: 'Receta Maestra',    value: 'RM-SYN-001 v1.0' },
    { label: 'Orden de Proceso',  value: pl?.numeroOrdenProceso  ?? '—' },
    { label: 'Fecha Fabricación', value: pl?.fechaFabricacion    ?? '—' },
    { label: 'Fecha Caducidad',   value: pl?.fechaCaducidad      ?? '—' },
    { label: 'Tamaño de Lote',    value: pl ? `${pl.cantidadOrden.toLocaleString('es-CO')} ${pl.unidadMedida}` : '—' },
    { label: 'Centro',            value: pl?.centro              ?? '—' },
  ]
}

interface ProcesoRow { id: number; descripcion: string; cerrado: boolean }
const mockProcesos: ProcesoRow[] = [
  { id: 1, descripcion: 'Etapa 1 — Dispensación de Materias Primas', cerrado: false },
  { id: 2, descripcion: 'Etapa 2 — Encapsulación',                   cerrado: false },
  { id: 3, descripcion: 'Etapa 3 — Inspección Visual y Empaque',     cerrado: false },
]

interface DetalleRow {
  id: number; idProceso: number; orden: number
  descripcion: string; firmado: boolean; tieneFirma: boolean
  idEstrategiaFirma: number; jsonSchema?: string
}

// Structural BR data — schema and idEstrategiaFirma are resolved at render time from the shared store
const DETALLE_STRUCT: Omit<DetalleRow, 'jsonSchema'>[] = [
  // ── Etapa 1: Dispensación de Materias Primas ──────────────────────────
  { id: 101, idProceso: 1, orden: 1, descripcion: 'Encabezado e Identificación del Lote',      firmado: false, tieneFirma: true, idEstrategiaFirma: 1 },
  { id: 102, idProceso: 1, orden: 2, descripcion: 'Pesaje de Materias Primas',                 firmado: false, tieneFirma: true, idEstrategiaFirma: 1 },
  { id: 103, idProceso: 1, orden: 3, descripcion: 'Verificación y Cierre de Dispensación',     firmado: false, tieneFirma: true, idEstrategiaFirma: 1 },
  // ── Etapa 2: Encapsulación ────────────────────────────────────────────
  { id: 201, idProceso: 2, orden: 1, descripcion: 'Configuración y Arranque de Encapsuladora', firmado: false, tieneFirma: true, idEstrategiaFirma: 1 },
  { id: 202, idProceso: 2, orden: 2, descripcion: 'Control en Proceso de Encapsulación (CIP)', firmado: false, tieneFirma: true, idEstrategiaFirma: 1 },
  { id: 203, idProceso: 2, orden: 3, descripcion: 'Rendimiento de Encapsulación y Cierre',     firmado: false, tieneFirma: true, idEstrategiaFirma: 1 },
  // ── Etapa 3: Inspección Visual y Empaque ─────────────────────────────
  { id: 301, idProceso: 3, orden: 1, descripcion: 'Inspección Visual AQL',                     firmado: false, tieneFirma: true, idEstrategiaFirma: 1 },
  { id: 302, idProceso: 3, orden: 2, descripcion: 'Empaque Primario y Secundario',             firmado: false, tieneFirma: true, idEstrategiaFirma: 1 },
  { id: 303, idProceso: 3, orden: 3, descripcion: 'Cierre de Lote y Aprobación Final',         firmado: false, tieneFirma: true, idEstrategiaFirma: 2 },
]

const PREFILLED: Record<number, Record<string, string>> = {}

// Traverses form.io schema JSON and returns { fieldKey → value } for every component
// that has an `opMapping` property, resolved against the given preLlenado object.
function extractOpMappings(schemaJson: string, preLlenado: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    const schema = JSON.parse(schemaJson) as Record<string, unknown>
    function walk(comps: unknown[]): void {
      for (const raw of comps) {
        const c = raw as Record<string, unknown>
        if (c.opMapping && c.key) {
          const val = preLlenado[c.opMapping as string]
          if (val !== undefined && val !== null && val !== '') out[c.key as string] = String(val)
        }
        if (Array.isArray(c.components)) walk(c.components)
        if (Array.isArray(c.columns)) {
          for (const col of c.columns as Record<string, unknown>[]) {
            if (Array.isArray(col.components)) walk(col.components)
          }
        }
      }
    }
    if (Array.isArray(schema?.components)) walk(schema.components)
  } catch {}
  return out
}

// Builds per-detalle initial values for form.io iframe pre-population from OP data
function buildDetalleInitialValues(detalleId: number, pl: PreLlenadoBR | null | undefined): Record<string, unknown> {
  if (!pl) return {}
  const kgComps   = pl.componentes.filter(c => c.unidadMedida === 'kg')
  const totalKg   = kgComps.reduce((s, c) => s + c.cantidad, 0)
  const capsComp  = pl.componentes.find(c => /CAP|caps/i.test(c.codigoMaterialComponente))
  const batchUnits = capsComp ? capsComp.cantidad : pl.cantidadOrden * 1000
  const aqlSample = batchUnits > 150000 ? 800 : batchUnits > 35000 ? 500 : batchUnits > 10000 ? 315 : batchUnits > 3200 ? 200 : batchUnits > 1200 ? 125 : 80

  switch (detalleId) {
    case 101: return {
      txtProducto:    pl.descripcionMaterial,
      txtCodigo:      pl.codigoMaterial,
      txtLote:        pl.loteLogistico,
      txtOrden:       pl.numeroOrdenProceso,
      numTamanoLote:  pl.cantidadOrden,
    }
    case 102: return {
      dgPesaje: pl.componentes.map(c => ({
        txtMaterial:      c.descripcionMaterialComponente,
        txtCodigoMP:      c.codigoMaterialComponente,
        txtLoteProveedor: c.loteComponente,
        numCantTeorica:   c.cantidad,
      })),
    }
    case 103: return {
      numTotalTeorico: parseFloat(totalKg.toFixed(3)),
    }
    case 201: return {
      txtProductoSetup: pl.descripcionMaterial,
      txtLoteSetup:     pl.loteLogistico,
      numProdTeorica:   capsComp ? Math.round(capsComp.cantidad / 1000) : pl.cantidadOrden,
    }
    case 202: return {
      txtProductoCIP: pl.descripcionMaterial,
      txtLoteCIP:     pl.loteLogistico,
    }
    case 203: return {
      numProdTeorRef: capsComp ? Math.round(capsComp.cantidad / 1000) : pl.cantidadOrden,
    }
    case 301: return {
      numTamLoteInsp: Math.round(batchUnits),
      numMuestraAQL:  aqlSample,
    }
    case 302: return {
      numCapsIngreso: pl.unidadMedida === 'kg' ? pl.cantidadOrden : Math.round(batchUnits / 1000),
    }
    case 303: return {
      txtProductoCierre:  pl.descripcionMaterial,
      txtCodigoCierre:    pl.codigoMaterial,
      txtLoteCierre:      pl.loteLogistico,
      txtLoteInspCierre:  pl.loteInspeccion,
    }
    default: return {}
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function parseSchema(jsonSchema: string): SchemaComp[] {
  if (!jsonSchema) return []
  try {
    const obj = JSON.parse(jsonSchema)
    return Array.isArray(obj?.components) ? (obj.components as SchemaComp[]) : []
  } catch { return [] }
}

function getFirmasDeEstrategia(idEF: number | undefined): EstrategiaFirmaItem[] {
  if (!idEF) return []
  const ef = mockEstrategiasFirma.find(e => e.id === idEF)
  return ef ? ef.firmas.filter(f => f.activo).sort((a, b) => a.orden - b.orden) : []
}

function buildInitialFirmados(): FirmaMap { return {} }

// ── Extractor de etiquetas del schema form.io ────────────────────────────
function extractFieldLabels(schema: string): Record<string, string> {
  const labels: Record<string, string> = {}
  try {
    const traverse = (comps: unknown[]) => {
      if (!Array.isArray(comps)) return
      for (const c of comps) {
        const comp = c as Record<string, unknown>
        if (typeof comp.key === 'string' && typeof comp.label === 'string') {
          labels[comp.key] = comp.label
        }
        if (Array.isArray(comp.components)) traverse(comp.components as unknown[])
        if (Array.isArray(comp.columns)) {
          ;(comp.columns as Record<string, unknown>[]).forEach(col => {
            if (Array.isArray(col.components)) traverse(col.components as unknown[])
          })
        }
      }
    }
    const obj = JSON.parse(schema)
    if (Array.isArray(obj?.components)) traverse(obj.components)
  } catch { /* schema inválido — ignorar */ }
  return labels
}

// Diff plano entre dos snapshots de data form.io → cambios auditables
function diffFormData(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  labels: Record<string, string>
): { campo: string; etiqueta: string; valorAnterior: string; valorNuevo: string }[] {
  const cambios: { campo: string; etiqueta: string; valorAnterior: string; valorNuevo: string }[] = []
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)])
  for (const key of allKeys) {
    // Ignorar campos internos de form.io y objetos complejos sin cambio legible
    if (key === 'submit') continue
    const ant = prev[key]
    const nv  = next[key]
    const antStr = typeof ant === 'object' ? JSON.stringify(ant) : String(ant ?? '')
    const nvStr  = typeof nv  === 'object' ? JSON.stringify(nv)  : String(nv  ?? '')
    if (antStr !== nvStr) {
      cambios.push({ campo: key, etiqueta: labels[key] ?? key, valorAnterior: antStr, valorNuevo: nvStr })
    }
  }
  return cambios
}

// ── FirmaStamp ─────────────────────────────────────────────────────────────
function FirmaStamp({ info }: { info: FirmaInfo }) {
  return (
    <div style={{ textAlign: 'right', lineHeight: 1.4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end',
        fontSize: 11, fontWeight: 700, color: 'var(--forest)' }}>
        <i className="fa fa-check-circle" /> Firmado
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)', marginTop: 3 }}>
        {info.nombre}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', marginTop: 1 }}>
        {info.cargo}
      </div>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', marginTop: 1,
        display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
        <i className="fa fa-calendar" style={{ fontSize: 8 }} />{info.fecha}
        <i className="fa fa-clock" style={{ fontSize: 8, marginLeft: 4 }} />{info.hora}
      </div>
    </div>
  )
}

// ── FormField ─────────────────────────────────────────────────────────────
function FormField({ comp, value, onChange, onCommit, locked }: {
  comp: SchemaComp
  value?: string
  onChange?: (v: string) => void
  onCommit?: (v: string) => void
  locked: boolean
}) {
  const [focused, setFocused] = useState(false)
  // onCommit fires on blur for text inputs; called directly on change for selects/radios
  const fp = {
    onFocus: () => setFocused(true),
    onBlur:  () => { setFocused(false); onCommit?.(value ?? '') },
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', boxSizing: 'border-box',
    border: `1.5px solid ${locked ? '#E9EAED' : focused ? 'var(--navy)' : '#CBD5E1'}`,
    borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--f-sans)', outline: 'none',
    color: locked ? '#9CA3AF' : 'var(--ink)',
    background: locked ? '#F8FAFC' : '#fff',
    cursor: locked ? 'not-allowed' : 'text',
    transition: 'border-color 120ms, box-shadow 120ms',
    boxShadow: focused && !locked ? '0 0 0 3px rgba(10,45,99,0.09)' : 'none',
  }

  // ── Layout / structural types ──────────────────────────────────────────
  if (comp.type === 'heading') return (
    <div style={{ display:'flex', alignItems:'center', gap:10,
      marginTop:16, marginBottom:12, paddingBottom:10, borderBottom:'2px solid #EEF2F9' }}>
      <div style={{ width:3, height:18, borderRadius:2, background:'var(--navy)', flexShrink:0 }} />
      <span style={{ fontSize:12.5, fontWeight:700, color:'var(--navy)',
        textTransform:'uppercase', letterSpacing:'0.08em' }}>
        {comp.text}
      </span>
    </div>
  )

  if (comp.type === 'divider') return (
    <div style={{ margin:'6px 0 16px' }}>
      <hr style={{ border:'none', borderTop:'1.5px solid #EEF2F9', margin:0 }} />
    </div>
  )

  // form.io `content` type — headings, HTML blocks, images emitted by DetallesList builder
  const rawType = (comp as { type: string }).type
  if (rawType === 'content') {
    const html = (comp as { html?: string }).html ?? ''
    return (
      <div style={{ marginBottom:12, lineHeight:1.65, fontSize:13.5,
        color:'var(--ink)', fontFamily:'var(--f-sans)' }}
        dangerouslySetInnerHTML={{ __html: html }} />
    )
  }

  // ── Shared field meta ──────────────────────────────────────────────────
  const c    = comp as Record<string, unknown>
  const lbl  = c.label as string | undefined
  const key  = (c.key  as string | undefined) ?? ''
  const desc = c.description as string | undefined
  const req  = !!(c.required)

  const LBL = (
    <label style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5,
      fontSize:12, fontWeight:600, letterSpacing:'0.01em',
      color: locked ? '#9CA3AF' : '#374151' }}>
      {lbl}
      {req  && <span style={{ color:'#EF4444', fontWeight:700, lineHeight:1 }}>*</span>}
      {locked && <i className="fa fa-lock" style={{ fontSize:8, color:'#D1D5DB', marginLeft:1 }} />}
    </label>
  )
  const DESC = desc
    ? <div style={{ fontSize:11.5, color:'#64748B', marginBottom:7, lineHeight:1.5 }}>{desc}</div>
    : null

  // ── Radio ──────────────────────────────────────────────────────────────
  if (rawType === 'radio') {
    const opts = (c.values as { label: string; value: string }[] | undefined) ?? []
    const inln = !!(c.inline)
    return (
      <div style={{ marginBottom:14 }}>
        {LBL}{DESC}
        <div style={{ display:'flex', flexDirection: inln ? 'row' : 'column',
          gap: inln ? 10 : 6, flexWrap:'wrap' }}>
          {opts.map(opt => (
            <label key={opt.value}
              style={{ display:'flex', alignItems:'center', gap:9,
                padding:'8px 13px', borderRadius:8, cursor: locked ? 'not-allowed' : 'pointer',
                border:`1.5px solid ${value===opt.value ? 'var(--navy)' : '#E2E8F0'}`,
                background: value===opt.value ? 'rgba(10,45,99,0.05)' : '#fff',
                transition:'border-color 100ms, background 100ms' }}>
              <input type="radio" name={key} value={opt.value}
                checked={value === opt.value} disabled={locked}
                onChange={() => { if (!locked) { onChange?.(opt.value); onCommit?.(opt.value) } }}
                style={{ accentColor:'var(--navy)', width:14, height:14,
                  cursor: locked ? 'not-allowed' : 'pointer', flexShrink:0 }} />
              <span style={{ fontSize:13.5, color: locked ? '#9CA3AF' : 'var(--ink)',
                fontWeight: value===opt.value ? 600 : 400 }}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  // ── Checkbox ───────────────────────────────────────────────────────────
  if (rawType === 'checkbox') {
    return (
      <div style={{ marginBottom:14 }}>
        <label style={{ display:'flex', alignItems:'center', gap:10,
          padding:'10px 13px', borderRadius:8, cursor: locked ? 'not-allowed' : 'pointer',
          border:`1.5px solid ${value==='true' ? 'var(--navy)' : '#E2E8F0'}`,
          background: value==='true' ? 'rgba(10,45,99,0.05)' : '#fff',
          transition:'border-color 100ms, background 100ms' }}>
          <input type="checkbox" checked={value === 'true'} disabled={locked}
            onChange={e => { if (!locked) { const v = e.target.checked ? 'true' : 'false'; onChange?.(v); onCommit?.(v) } }}
            style={{ accentColor:'var(--navy)', width:15, height:15,
              cursor: locked ? 'not-allowed' : 'pointer', flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13.5, fontWeight:500, color: locked ? '#9CA3AF' : 'var(--ink)' }}>
              {lbl}{req && <span style={{ color:'#EF4444', marginLeft:3 }}>*</span>}
            </div>
            {desc && <div style={{ fontSize:11.5, color:'#64748B', marginTop:2 }}>{desc}</div>}
          </div>
          {locked && <i className="fa fa-lock" style={{ fontSize:9, color:'#D1D5DB', flexShrink:0 }} />}
        </label>
      </div>
    )
  }

  // ── Standard inputs ────────────────────────────────────────────────────
  const input = (() => {
    if (comp.type === 'textfield') return (
      <input type="text" style={inp} value={value ?? ''} readOnly={locked}
        placeholder={(c.placeholder as string | undefined)}
        onChange={e => !locked && onChange?.(e.target.value)} {...fp} />
    )
    if (comp.type === 'number') {
      const unit = (c.unit as string | undefined) ?? comp.unit
      return (
        <div style={{ display:'flex', alignItems:'stretch' }}>
          <input type="number" style={{ ...inp, flex:1, width:'auto',
            borderRadius: unit ? '8px 0 0 8px' : 8,
            borderRight: unit ? 'none' : undefined }}
            value={value ?? ''} readOnly={locked}
            onChange={e => !locked && onChange?.(e.target.value)} {...fp} />
          {unit && (
            <span style={{ display:'flex', alignItems:'center', padding:'0 14px',
              fontSize:12.5, color:'#64748B', fontFamily:'var(--f-mono)',
              background:'#F6F4EE', border:'1.5px solid #CBD5E1',
              borderRadius:'0 8px 8px 0', whiteSpace:'nowrap', flexShrink:0 }}>
              {unit}
            </span>
          )}
        </div>
      )
    }
    if (comp.type === 'select') return (
      <div style={{ position:'relative' }}>
        <select style={{ ...inp, appearance:'none', paddingRight:36,
          cursor: locked ? 'not-allowed' : 'pointer' }}
          value={value ?? ''} disabled={locked}
          onChange={e => { if (!locked) { onChange?.(e.target.value); onCommit?.(e.target.value) } }} {...fp}>
          <option value="">— seleccione —</option>
          {comp.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <i className="fa fa-chevron-down"
          style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
            fontSize:10, color:'#94A3B8', pointerEvents:'none' }} />
      </div>
    )
    if (comp.type === 'textarea') return (
      <textarea style={{ ...inp, resize:'vertical', minHeight: Math.max((comp.rows ?? 2) * 28, 72) }}
        value={value ?? ''} readOnly={locked}
        onChange={e => !locked && onChange?.(e.target.value)} {...fp} />
    )
    if (comp.type === 'datetime') return (
      <input type="datetime-local" style={{ ...inp, cursor: locked ? 'not-allowed' : 'default' }}
        value={value ?? ''} readOnly={locked}
        onChange={e => { if (!locked) { onChange?.(e.target.value); onCommit?.(e.target.value) } }} {...fp} />
    )
    return null
  })()

  if (!input) return null

  return (
    <div style={{ marginBottom:14 }}>
      {LBL}
      {DESC}
      {input}
    </div>
  )
}

// ── DerogacionModal ───────────────────────────────────────────────────────
function DerogacionModal({ firmaInfo, texto, grupo, onConfirm, onClose }: {
  firmaInfo: FirmaInfo
  texto: string
  grupo: string
  onConfirm: (motivo: string) => void
  onClose: () => void
}) {
  const [motivo, setMotivo] = useState('')
  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(10,21,48,.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}
      onClick={onClose}>
      <div style={{ background:'var(--paper)',borderRadius:'var(--r-xl)',boxShadow:'var(--sh-3)',width:'100%',maxWidth:440 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ background:'#7C2D12',borderRadius:'var(--r-xl) var(--r-xl) 0 0',padding:'14px 22px',display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:34,height:34,borderRadius:10,background:'rgba(255,255,255,.12)',display:'grid',placeItems:'center',flexShrink:0 }}>
            <i className="fa fa-undo" style={{ color:'#FCA5A5',fontSize:15 }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ color:'#fff',fontWeight:700,fontSize:14 }}>Derogar Firma</div>
            <div style={{ color:'rgba(255,200,180,.7)',fontSize:11 }}>Esta acción revocará la firma y desbloqueará los campos</div>
          </div>
          <button style={{ background:'rgba(255,255,255,.1)',border:'none',cursor:'pointer',color:'#fff',width:28,height:28,borderRadius:7,fontSize:16,display:'grid',placeItems:'center' }} onClick={onClose}>×</button>
        </div>
        <div style={{ padding:'12px 22px',background:'var(--paper-2)',borderBottom:'1px solid var(--hair)' }}>
          <div style={{ fontSize:12.5,fontWeight:600,color:'var(--ink-2)',marginBottom:6 }}>{texto}</div>
          <div style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
            <span style={{ fontSize:11.5,color:'var(--ink-4)' }}><i className="fa fa-user" style={{ marginRight:4 }}/>{firmaInfo.nombre}</span>
            <span style={{ fontSize:11.5,color:'var(--ink-4)',fontFamily:'var(--f-mono)' }}>{firmaInfo.fecha} · {firmaInfo.hora}</span>
            <span style={{ fontSize:11.5,padding:'1px 9px',borderRadius:20,background:'var(--navy)',color:'#fff' }}>{grupo}</span>
          </div>
        </div>
        <div style={{ padding:'18px 22px' }}>
          <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'var(--ink-2)',marginBottom:6 }}>
            Motivo de derogación <span style={{ color:'#DC2626',fontWeight:400 }}>(requerido)</span>
          </label>
          <textarea className="form-control" rows={3} value={motivo} autoFocus
            onChange={e => setMotivo(e.target.value)}
            placeholder="Describa el motivo para revocar esta firma…"
            style={{ resize:'vertical' }} />
          <div style={{ marginTop:8,fontSize:11.5,color:'#92400E',background:'#FEF3C7',borderRadius:6,padding:'6px 10px',display:'flex',gap:6,alignItems:'flex-start' }}>
            <i className="fa fa-exclamation-triangle" style={{ color:'#D97706',flexShrink:0,marginTop:1 }}/>
            <span>Se revocarán todas las firmas de esta sección y el cierre del detalle. Los campos quedarán editables para corrección.</span>
          </div>
        </div>
        <div style={{ padding:'14px 22px',borderTop:'1px solid var(--hair)',display:'flex',justifyContent:'flex-end',gap:8 }}>
          <button className="btn btn-gray" onClick={onClose}><i className="fa fa-undo" /> Cancelar</button>
          <button className="btn btn-danger" disabled={!motivo.trim()}
            onClick={() => { if (motivo.trim()) onConfirm(motivo.trim()) }}>
            <i className="fa fa-undo" /> Derogar firma
          </button>
        </div>
      </div>
    </div>
  )
}

// ── FirmaModal ────────────────────────────────────────────────────────────
function FirmaModal({ firma, onConfirm, onClose }: {
  firma: { texto: string; grupo: string }
  onConfirm: (info: FirmaInfo) => void
  onClose: () => void
}) {
  const sessionUser = useAuthStore(s => s.user)
  const [login,   setLogin]   = useState(sessionUser?.login ?? '')
  const [pwd,     setPwd]     = useState('')
  const [show,    setShow]    = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const u = mockUsuarios.find(x => x.login === login.trim() || x.email === login.trim())
    if (!u)          { setError('Usuario no encontrado'); return }
    if (!u.activo)   { setError('Usuario inactivo'); return }
    if (u.bloqueado) { setError('Usuario bloqueado'); return }
    setLoading(true)
    try {
      const result = await batchRecordApi.validarFirma(u.login, pwd)
      if (!result.estado) { setError(result.mensaje); setLoading(false); return }
    } catch {
      setError('Error al validar credenciales'); setLoading(false); return
    }
    setLoading(false)
    if (u.esAdministrador !== 1) {
      const grupos = u.grupos.split(',').map(g => g.trim()).filter(Boolean)
      if (!grupos.includes(firma.grupo)) {
        setError(`"${u.nombres} ${u.apellidos}" no pertenece al grupo "${firma.grupo}"`)
        return
      }
    }
    const now = new Date()
    onConfirm({
      nombre: `${u.nombres} ${u.apellidos}`,
      cargo:  GRUPO_CARGO[firma.grupo] ?? firma.grupo,
      fecha:  now.toISOString().slice(0, 10),
      hora:   now.toTimeString().slice(0, 5),
      loginUsuario: u.login,
      idUsuario: u.idUsuario,
    })
  }

  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(10,21,48,0.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}
      onClick={onClose}>
      <div style={{ background:'var(--paper)',borderRadius:'var(--r-xl)',boxShadow:'var(--sh-3)',width:'100%',maxWidth:420 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ background:'var(--navy)',borderRadius:'var(--r-xl) var(--r-xl) 0 0',padding:'14px 22px',display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:34,height:34,borderRadius:10,background:'rgba(255,255,255,.12)',display:'grid',placeItems:'center',flexShrink:0 }}>
            <i className="fa fa-pen" style={{ color:'var(--yellow)',fontSize:15 }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ color:'#fff',fontWeight:700,fontSize:14 }}>Firma Electrónica</div>
            <div style={{ color:'#8FA5C9',fontSize:11 }}>Ingrese sus credenciales para firmar</div>
          </div>
          <button style={{ background:'rgba(255,255,255,.1)',border:'none',cursor:'pointer',color:'#fff',width:28,height:28,borderRadius:7,fontSize:16,display:'grid',placeItems:'center' }} onClick={onClose}>×</button>
        </div>
        <div style={{ padding:'12px 22px',background:'var(--paper-2)',borderBottom:'1px solid var(--hair)' }}>
          <div style={{ fontSize:13,fontWeight:600,color:'var(--ink-2)',marginBottom:4 }}>{firma.texto}</div>
          <div style={{ display:'flex',alignItems:'center',gap:6 }}>
            <i className="fa fa-users" style={{ color:'var(--navy)',fontSize:11 }} />
            <span style={{ fontSize:11.5,color:'var(--ink-3)' }}>Grupo requerido:</span>
            <span style={{ fontSize:11.5,fontWeight:700,padding:'1px 9px',borderRadius:20,background:'var(--navy)',color:'#fff' }}>{firma.grupo}</span>
            <span style={{ fontSize:11,color:'var(--ink-4)',marginLeft:4 }}>({GRUPO_CARGO[firma.grupo] ?? firma.grupo})</span>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding:'18px 22px',display:'flex',flexDirection:'column',gap:14 }}>
            <div>
              <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'var(--ink-2)',marginBottom:5 }}>
                Usuario <span style={{ color:'var(--orange)',fontWeight:400 }}>(requerido)</span>
              </label>
              <input className="form-control" value={login} autoFocus
                onChange={e => { setLogin(e.target.value); setError('') }}
                placeholder="login o correo electrónico" />
            </div>
            <div>
              <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'var(--ink-2)',marginBottom:5 }}>
                Contraseña <span style={{ color:'var(--orange)',fontWeight:400 }}>(requerida)</span>
              </label>
              <div style={{ position:'relative' }}>
                <input type={show ? 'text' : 'password'} className="form-control" value={pwd}
                  onChange={e => { setPwd(e.target.value); setError('') }}
                  placeholder="••••••••" style={{ paddingRight:36 }} />
                <button type="button"
                  style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--ink-4)' }}
                  onClick={() => setShow(s => !s)}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {error && (
              <div style={{ padding:'8px 12px',background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:'var(--r-sm)',fontSize:12.5,color:'#b91c1c',display:'flex',alignItems:'center',gap:7 }}>
                <i className="fa fa-exclamation-circle" />{error}
              </div>
            )}
          </div>
          <div style={{ padding:'14px 22px',borderTop:'1px solid var(--hair)',display:'flex',justifyContent:'flex-end',gap:8 }}>
            <button type="button" className="btn btn-gray" onClick={onClose}><i className="fa fa-undo" /> Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={!login || !pwd || loading}>
              {loading ? <><i className="fa fa-spinner fa-spin" /> Validando...</> : <><i className="fa fa-pen" /> Firmar</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── FirmaSeccionBlockPanel ────────────────────────────────────────────────
function FirmaSeccionBlockPanel({ block, blockIdx, detalleId, firmados, readonly, onFirmar, onRequestDerogar }: {
  block: SchemaComp & { type: 'firma-seccion' }
  blockIdx: number
  detalleId: number
  firmados: FirmaMap
  readonly: boolean
  onFirmar: (tipo: 'seccion' | 'cierre', firmaKey: string, texto: string, grupo: string) => void
  onRequestDerogar?: (firmaKey: string, blockKey: string, firmaInfo: FirmaInfo, texto: string, grupo: string) => void
}) {
  const user = useAuthStore(s => s.user)
  const ef = mockEstrategiasFirma.find(e => e.id === block.idEstrategiaFirma)
  const userGrupos = (user?.grupos ?? '').split(',').map(g => g.trim())
  const puedeDerog = !readonly && !!(
    user?.esAdministrador ||
    (ef?.gruposDerogacion ?? []).some(g => userGrupos.includes(g))
  )

  const firmas = getFirmasDeEstrategia(block.idEstrategiaFirma)
  const firmadas = firmas.filter(f => !!firmados[`sec:${detalleId}:${block.key}:${f.idFirma}`]).length
  const todasFirmadas = firmas.length > 0 && firmadas === firmas.length

  return (
    <div style={{ border:'1.5px solid #DDD6FE',borderRadius:8,overflow:'hidden',marginBottom:12 }}>
      <div style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 12px',
        background: todasFirmadas ? 'rgba(52,211,153,.08)' : '#F5F3FF',
        borderBottom:'1px solid #EDE9FE' }}>
        <div style={{ width:22,height:22,borderRadius:'50%',flexShrink:0,
          background: todasFirmadas ? 'var(--forest)' : '#7C3AED',
          color:'#fff',display:'grid',placeItems:'center',fontSize:10,fontWeight:700,fontFamily:'var(--f-mono)' }}>
          {todasFirmadas ? <i className="fa fa-check" style={{ fontSize:9 }} /> : blockIdx + 1}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12.5,fontWeight:700,color: todasFirmadas ? 'var(--forest)' : '#5B21B6' }}>{block.label}</div>
          <div style={{ fontSize:10.5,color:'#9CA3AF',fontFamily:'var(--f-mono)' }}>{firmadas}/{firmas.length} firma{firmas.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
      {firmas.map((firma, i) => {
        const firmaKey  = `sec:${detalleId}:${block.key}:${firma.idFirma}`
        const firmaInfo = firmados[firmaKey]
        const prevOk    = i === 0 || !!firmados[`sec:${detalleId}:${block.key}:${firmas[i - 1].idFirma}`]
        const bloqueado = !prevOk && !firmaInfo
        return (
          <div key={firma.idFirma} style={{ display:'flex',alignItems:'flex-start',gap:12,padding:'10px 12px',
            flexWrap:'wrap',
            borderTop: i > 0 ? '1px solid #EDE9FE' : 'none',
            background: firmaInfo ? 'rgba(52,211,153,.04)' : bloqueado ? 'rgba(0,0,0,.02)' : '#fff',
            opacity: bloqueado ? 0.5 : 1,transition:'opacity 200ms' }}>
            <div style={{ width:20,height:20,borderRadius:'50%',flexShrink:0,marginTop:1,
              background: firmaInfo ? 'var(--forest)' : '#7C3AED',
              color:'#fff',display:'grid',placeItems:'center',fontSize:10,fontWeight:700,fontFamily:'var(--f-mono)' }}>
              {firmaInfo ? <i className="fa fa-check" style={{ fontSize:8 }} /> : firma.orden}
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:12.5,fontWeight:600,color: firmaInfo ? 'var(--forest)' : 'var(--ink-2)' }}>{firma.texto}</div>
              <div style={{ fontSize:10.5,color:'var(--ink-4)',fontFamily:'var(--f-mono)' }}>
                Grupo: {firma.grupo} · {GRUPO_CARGO[firma.grupo] ?? firma.grupo}
              </div>
            </div>
            {firmaInfo
              ? (
                <div style={{ display:'flex',alignItems:'flex-start',gap:6,flexShrink:0 }}>
                  <FirmaStamp info={firmaInfo} />
                  {puedeDerog && onRequestDerogar && (
                    <button title="Derogar firma"
                      style={{ marginTop:2,background:'#FEE2E2',border:'1px solid #FECACA',borderRadius:6,padding:'4px 7px',cursor:'pointer',color:'#DC2626',fontSize:11,flexShrink:0 }}
                      onClick={() => onRequestDerogar(firmaKey, block.key, firmaInfo, firma.texto, firma.grupo)}>
                      <i className="fa fa-undo" />
                    </button>
                  )}
                </div>
              )
              : (!readonly && !bloqueado && (
                  <button className="btn btn-warning" style={{ fontSize:12,flexShrink:0 }}
                    onClick={() => onFirmar('seccion', firmaKey, firma.texto, firma.grupo)}>
                    <i className="fa fa-pen" /> Firmar
                  </button>
                ))
            }
          </div>
        )
      })}
    </div>
  )
}

// ── FormioFrame ───────────────────────────────────────────────────────────
function FormioFrame({ schema, locked = false, onDataChange, getInitialData }: {
  schema: string
  locked?: boolean
  onDataChange?: (data: Record<string, unknown>) => void
  getInitialData?: () => Record<string, unknown>
}) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(500)
  const onDataChangeRef = useRef(onDataChange)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lockedRef = useRef(false)
  // Siempre apunta a la versión más reciente del callback — se actualiza con re-renders
  const getInitialDataRef = useRef(getInitialData)

  useEffect(() => { onDataChangeRef.current = onDataChange }, [onDataChange])
  useEffect(() => { getInitialDataRef.current = getInitialData }, [getInitialData])

  // Enviar LOCK_FORM cuando locked cambia a true (solo una vez)
  useEffect(() => {
    if (locked && !lockedRef.current) {
      lockedRef.current = true
      ref.current?.contentWindow?.postMessage({ type: 'LOCK_FORM' }, '*')
    }
    if (!locked) {
      lockedRef.current = false
    }
  }, [locked])

  useEffect(() => {
    const frame = ref.current
    if (!frame) return

    const send = () => {
      // Leer en el momento en que el iframe termina de cargar — siempre tiene los datos más recientes
      const data = getInitialDataRef.current?.() ?? {}
      const hasData = Object.keys(data).length > 0
      if (hasData) {
        frame.contentWindow?.postMessage({
          type: 'RENDER_JSON_WITH_DATA',
          value: schema,
          data: JSON.stringify({ data }),
        }, '*')
      } else {
        frame.contentWindow?.postMessage({ type: 'RENDER_JSON', value: schema }, '*')
      }
    }

    frame.addEventListener('load', send)
    if (frame.contentDocument?.readyState === 'complete') send()

    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.contentWindow) return
      if (e.data?.type === 'HEIGTH') {
        setHeight(Math.max(200, parseInt(e.data.value, 10) || 500))
      }
      if (e.data?.type === 'GET_JSONDATA') {
        try {
          const submission = typeof e.data.value === 'string'
            ? JSON.parse(e.data.value)
            : e.data.value
          const data = (submission?.data ?? submission ?? {}) as Record<string, unknown>
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            onDataChangeRef.current?.(data)
          }, 700)
        } catch { /* JSON inválido — ignorar */ }
      }
    }
    window.addEventListener('message', onMsg)
    return () => {
      frame.removeEventListener('load', send)
      window.removeEventListener('message', onMsg)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [schema])

  return (
    <iframe ref={ref} src="/formio/render.html" title="Formulario"
      style={{ width:'100%', height, border:'none', display:'block' }} />
  )
}

// ── Required-field validation ─────────────────────────────────────────────
type ReqField = { key: string; label: string; datagridKey?: string }
type ValidationError = { label: string; rows?: number[] }

const shortLabel = (raw: unknown) => {
  const s = typeof raw === 'string' ? raw : String(raw ?? '')
  return (s.split('/')[0]).trim()
}

const isEmpty = (v: unknown) =>
  v === undefined || v === null || v === '' || v === false || v === 'false'

function collectRequired(comps: unknown[]): ReqField[] {
  const out: ReqField[] = []
  for (const raw of comps) {
    const c = raw as Record<string, unknown>
    const validate = c.validate as Record<string, unknown> | undefined
    const type = c.type as string | undefined

    if (type === 'datagrid' && typeof c.key === 'string') {
      // Required fields inside a datagrid must be validated per-row, not flat
      if (Array.isArray(c.components)) {
        for (const child of c.components as unknown[]) {
          const ch = child as Record<string, unknown>
          const chVal = ch.validate as Record<string, unknown> | undefined
          if ((ch.required || chVal?.required) && typeof ch.key === 'string' && ch.input !== false) {
            out.push({ key: ch.key, label: shortLabel(ch.label ?? ch.key), datagridKey: c.key })
          }
        }
      }
      continue
    }

    if ((c.required || validate?.required) && typeof c.key === 'string' && c.input !== false) {
      out.push({ key: c.key, label: shortLabel(c.label ?? c.key) })
    }
    if (Array.isArray(c.components)) out.push(...collectRequired(c.components as unknown[]))
    if (Array.isArray(c.columns)) {
      for (const col of c.columns as Record<string, unknown>[]) {
        if (Array.isArray(col.components)) out.push(...collectRequired(col.components as unknown[]))
      }
    }
  }
  return out
}

function missingRequired(jsonSchema: string, data: Record<string, unknown>): ValidationError[] {
  try {
    const schema = JSON.parse(jsonSchema)
    const comps = Array.isArray(schema?.components) ? schema.components : []
    const fields = collectRequired(comps)
    const errors: ValidationError[] = []

    for (const f of fields) {
      if (f.datagridKey) {
        const rows = data[f.datagridKey]
        if (!Array.isArray(rows) || rows.length === 0) continue
        const badRows = rows
          .map((r, i) => ({ r: r as Record<string, unknown>, i }))
          .filter(({ r }) => isEmpty(r[f.key]))
          .map(({ i }) => i + 1)
        if (badRows.length > 0) errors.push({ label: f.label, rows: badRows })
      } else {
        if (isEmpty(data[f.key])) errors.push({ label: f.label })
      }
    }

    return errors
  } catch { return [] }
}

// ── DetalleCard ───────────────────────────────────────────────────────────
function DetalleCard({ detalle, readonly, firmados, onFirmar, initialValues, onSave, onRequestDerogar, onFormData, preLlenado, brId }: {
  detalle: DetalleRow
  readonly: boolean
  firmados: FirmaMap
  onFirmar: (tipo: 'seccion' | 'cierre', firmaKey: string, texto: string, grupo: string) => void
  initialValues?: Record<string, unknown>
  onSave?: (detalleId: number, prev: Record<string,string>, next: Record<string,string>, labels: Record<string,string>) => void
  onRequestDerogar?: (firmaKey: string, blockKey: string, detalleId: number, firmaInfo: FirmaInfo, texto: string, grupo: string) => void
  onFormData?: (detalleId: number, prev: Record<string,unknown>, next: Record<string,unknown>, labels: Record<string,string>) => void
  preLlenado?: PreLlenadoBR | null
  brId?: string | number
}) {
  const user = useAuthStore(s => s.user)
  const [open, setOpen] = useState(false)
  const scalarInitial = Object.fromEntries(
    Object.entries(initialValues ?? {}).filter(([, v]) => typeof v === 'string' || typeof v === 'number')
      .map(([k, v]) => [k, String(v)])
  ) as Record<string, string>
  const [values,    setValues]    = useState<Record<string, string>>(scalarInitial)
  const [committed, setCommitted] = useState<Record<string, string>>(scalarInitial)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])

  // Persistencia de datos del iframe entre aperturas/cierres del card y entre sesiones
  const lsKey = brId ? `br_data_${brId}_${detalle.id}` : null
  const savedDataRef = useRef<Record<string, unknown>>((() => {
    if (lsKey) {
      try {
        const raw = localStorage.getItem(lsKey)
        if (raw) return JSON.parse(raw) as Record<string, unknown>
      } catch {}
    }
    return {}
  })())

  // Callback que FormioFrame llama al cargar: prioriza datos guardados, cae a initialValues
  const getInitialData = useCallback((): Record<string, unknown> => {
    if (Object.keys(savedDataRef.current).length > 0) return savedDataRef.current
    return initialValues
      ? Object.fromEntries(Object.entries(initialValues)) as Record<string, unknown>
      : {}
  }, [initialValues])

  // ── Control de Pesos (detalle 302 only) ─────────────────────────────────
  const PESO_N = 10
  const [pesoSpec, setPesoSpec] = useState<{ min: string; opt: string; max: string }>({
    min: String(savedDataRef.current.peso_min_spec ?? ''),
    opt: String(savedDataRef.current.peso_opt_spec ?? ''),
    max: String(savedDataRef.current.peso_max_spec ?? ''),
  })
  const [pesos, setPesos] = useState<string[]>(
    Array.from({ length: PESO_N }, (_, i) => String(savedDataRef.current[`peso_ctrl_${i + 1}`] ?? ''))
  )

  const savePesoData = (spec: typeof pesoSpec, vals: string[]) => {
    Object.assign(savedDataRef.current, {
      peso_min_spec: spec.min,
      peso_opt_spec: spec.opt,
      peso_max_spec: spec.max,
      ...Object.fromEntries(vals.map((v, i) => [`peso_ctrl_${i + 1}`, v])),
    })
    if (lsKey) try { localStorage.setItem(lsKey, JSON.stringify(savedDataRef.current)) } catch {}
  }

  // Tracking de datos del iframe para audit trail
  const prevDataRef    = useRef<Record<string, unknown> | null>(null)
  const labelsRef      = useRef<Record<string, string>>({})
  const onFormDataRef  = useRef(onFormData)
  useEffect(() => { onFormDataRef.current = onFormData }, [onFormData])

  const handleIframeData = useCallback((data: Record<string, unknown>) => {
    if (readonly) return
    savedDataRef.current = data
    if (lsKey) { try { localStorage.setItem(lsKey, JSON.stringify(data)) } catch {} }
    setValidationErrors([])
    if (prevDataRef.current === null) {
      // Primera carga: guardar como baseline sin registrar evento
      prevDataRef.current = data
      labelsRef.current = extractFieldLabels(detalle.jsonSchema ?? '')
      return
    }
    const prev = prevDataRef.current
    const cambios = diffFormData(prev, data, labelsRef.current)
    if (cambios.length > 0) {
      onFormDataRef.current?.(detalle.id, prev, data, labelsRef.current)
      prevDataRef.current = { ...data }
    }
  }, [readonly, detalle.id, detalle.jsonSchema])

  const efCierre = mockEstrategiasFirma.find(e => e.id === detalle.idEstrategiaFirma)
  const userGruposCierre = (user?.grupos ?? '').split(',').map(g => g.trim())
  const puedeDerogCierre = !readonly && !!(
    user?.esAdministrador ||
    (efCierre?.gruposDerogacion ?? []).some(g => userGruposCierre.includes(g))
  )

  const firmasCierre = getFirmasDeEstrategia(detalle.idEstrategiaFirma)
  const comps = parseSchema(detalle.jsonSchema ?? '')

  // Segmentos separados por firma-seccion
  type Seg = { fields: SchemaComp[]; fs: (SchemaComp & { type: 'firma-seccion' }) | null }
  const segments: Seg[] = []
  let cur: SchemaComp[] = []
  for (const c of comps) {
    if (c.type === 'firma-seccion') { segments.push({ fields: cur, fs: c }); cur = [] }
    else cur.push(c)
  }
  if (cur.length > 0 || segments.length === 0) segments.push({ fields: cur, fs: null })

  const isFSDone = (fs: SchemaComp & { type: 'firma-seccion' }) => {
    const f = getFirmasDeEstrategia(fs.idEstrategiaFirma)
    return f.length > 0 && f.every(x => !!firmados[`sec:${detalle.id}:${fs.key}:${x.idFirma}`])
  }
  const isSegLocked = (segIdx: number) => {
    if (readonly) return true
    const thisFS = segments[segIdx].fs
    return thisFS ? isFSDone(thisFS) : false
  }

  const allFS      = comps.filter((c): c is SchemaComp & { type: 'firma-seccion' } => c.type === 'firma-seccion')
  const totalSecF  = allFS.reduce((n, fs) => n + getFirmasDeEstrategia(fs.idEstrategiaFirma).length, 0)
  const doneSecF   = allFS.reduce((n, fs) =>
    n + getFirmasDeEstrategia(fs.idEstrategiaFirma).filter(f => !!firmados[`sec:${detalle.id}:${fs.key}:${f.idFirma}`]).length, 0)
  const allSecDone = totalSecF === 0 || doneSecF === totalSecF

  const cierFirmadas = firmasCierre.filter(f => !!firmados[`cie:${detalle.id}:${f.idFirma}`]).length
  const allCierDone  = firmasCierre.length > 0 && cierFirmadas === firmasCierre.length

  const handleFirmar = (tipo: 'seccion' | 'cierre', firmaKey: string, texto: string, grupo: string) => {
    // Block cierre if yield is out of spec on ET2-F3
    if (tipo === 'cierre' && detalle.id === 203) {
      const rawReal = savedDataRef.current['rendimiento_real'] as string | undefined
      const real    = rawReal ? parseFloat(rawReal) : NaN
      const teorico = (savedDataRef.current['_teorico'] as number | undefined) ?? 0
      if (!isNaN(real) && teorico > 0 && (real / teorico) * 100 < 95) {
        setValidationErrors([{ label: 'Rendimiento < 95% — registre nota de desviación antes de firmar' }])
        return
      }
    }
    const missing = missingRequired(detalle.jsonSchema ?? '', savedDataRef.current)
    if (missing.length > 0) {
      setValidationErrors(missing)
      return
    }
    setValidationErrors([])
    onFirmar(tipo, firmaKey, texto, grupo)
  }

  const handleFieldCommit = (key: string, val: string, label: string) => {
    if (readonly) return
    const prev = committed[key] ?? ''
    if (val === prev) return
    onSave?.(detalle.id, { [key]: prev }, { [key]: val }, { [key]: label })
    setCommitted(c => ({ ...c, [key]: val }))
  }

  return (
    <div className={`det-card${open ? ' det-open' : ''}`}
      style={{ borderLeftColor: allCierDone ? '#2D5D4A' : cierFirmadas > 0 ? '#F59E0B' : 'rgba(10,21,48,0.1)' }}>

      {/* ── Header ── */}
      <div className="det-header" onClick={() => setOpen(!open)}>
        {/* Status circle */}
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: allCierDone ? '#2D5D4A' : cierFirmadas > 0 ? '#F59E0B' : '#EEF2F9',
          color: allCierDone || cierFirmadas > 0 ? '#fff' : '#94A3B8',
          display: 'grid', placeItems: 'center', fontSize: 11,
        }}>
          {allCierDone
            ? <i className="fa fa-check" style={{ fontSize: 10 }} />
            : cierFirmadas > 0
              ? <i className="fa fa-pen" style={{ fontSize: 9 }} />
              : <i className="fa fa-minus" style={{ fontSize: 9 }} />}
        </div>

        {/* Title + signed sub */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0A1530' }}>{detalle.descripcion}</div>
          {allCierDone && (() => {
            const lastF    = firmasCierre[firmasCierre.length - 1]
            const lastInfo = lastF ? firmados[`cie:${detalle.id}:${lastF.idFirma}`] : undefined
            return lastInfo ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <i className="fa fa-user-check" style={{ fontSize: 9, color: '#2D5D4A' }} />
                <span style={{ fontSize: 11, color: '#2D5D4A', fontWeight: 600 }}>{lastInfo.nombre}</span>
                <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--f-mono)' }}>
                  · {lastInfo.fecha} {lastInfo.hora}
                </span>
              </div>
            ) : null
          })()}
        </div>

        {/* Pip dots — one per firma */}
        {firmasCierre.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {firmasCierre.map(f => (
              <div key={f.idFirma} title={f.texto} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: firmados[`cie:${detalle.id}:${f.idFirma}`] ? '#2D5D4A' : 'rgba(10,21,48,0.15)',
              }} />
            ))}
          </div>
        )}

        {/* Firmado badge */}
        {allCierDone && (
          <span style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.03em',
            background: '#D1FAE5', color: '#065F46',
            padding: '2px 9px', borderRadius: 20, flexShrink: 0, fontFamily: 'var(--f-mono)',
          }}>
            ✓ FIRMADO
          </span>
        )}

        {open
          ? <ChevronUp size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
          : <ChevronDown size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />}
      </div>

      {/* ── Content ── */}
      {open && (
        <div style={{ borderTop: '1px solid rgba(10,21,48,0.07)' }}>

          {/* Pre-llenado ET1-F1: Encabezado */}
          {preLlenado && detalle.id === 101 && (
            <div style={{ margin: '12px 14px', padding: '12px 16px', background: '#EFF6FF',
              borderRadius: 10, border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase',
                letterSpacing: '.07em', marginBottom: 10 }}>
                <i className="fa fa-database" style={{ marginRight: 6 }} />
                Datos pre-llenados desde la Orden de Proceso
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {([
                  ['Orden de Proceso',   preLlenado.numeroOrdenProceso],
                  ['Producto',           preLlenado.descripcionMaterial],
                  ['Código Material',    preLlenado.codigoMaterial],
                  ['Número de Lote',     preLlenado.loteLogistico],
                  ['Lote Inspección',    preLlenado.loteInspeccion],
                  ['Fecha Fabricación',  preLlenado.fechaFabricacion],
                  ['Fecha Caducidad',    preLlenado.fechaCaducidad],
                  ['Reg. Sanitario',     preLlenado.registroSanitario],
                  ['Forma Farmacéutica', preLlenado.formaFarmaceutica],
                  ['Tamaño de Lote',     `${preLlenado.cantidadOrden.toLocaleString('es-CO')} ${preLlenado.unidadMedida}`],
                  ['Centro',             preLlenado.centro],
                ] as [string, string][]).map(([lbl, val]) => (
                  <div key={lbl} style={{ padding: '6px 14px', borderRight: '1px solid #BFDBFE', flexShrink: 0 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: '#60A5FA',
                      textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{lbl}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1E3A8A',
                      fontFamily: 'var(--f-mono)' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pre-llenado ET1-F2: Pesaje */}
          {preLlenado && detalle.id === 102 && preLlenado.componentes.length > 0 && (
            <div style={{ margin: '12px 14px', padding: '12px 16px', background: '#EFF6FF',
              borderRadius: 10, border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase',
                letterSpacing: '.07em', marginBottom: 10 }}>
                <i className="fa fa-database" style={{ marginRight: 6 }} />
                Materias primas pre-llenadas desde la OP — {preLlenado.componentes.length} componentes
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Código', 'Descripción', 'Cant. Teórica', 'UM', 'Lote'].map(h => (
                      <th key={h} style={{ background: '#DBEAFE', padding: '5px 10px', textAlign: 'left',
                        fontSize: 9.5, fontWeight: 700, color: '#1E40AF',
                        textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preLlenado.componentes.map(c => (
                    <tr key={c.idComponente}>
                      <td style={{ padding: '5px 10px', borderTop: '1px solid #BFDBFE',
                        fontFamily: 'var(--f-mono)', fontWeight: 700, color: '#1E3A8A', fontSize: 11.5 }}>
                        {c.codigoMaterialComponente}
                      </td>
                      <td style={{ padding: '5px 10px', borderTop: '1px solid #BFDBFE', color: '#334155' }}>
                        {c.descripcionMaterialComponente}
                      </td>
                      <td style={{ padding: '5px 10px', borderTop: '1px solid #BFDBFE',
                        textAlign: 'right', fontFamily: 'var(--f-mono)', fontWeight: 600, color: '#1E3A8A' }}>
                        {c.cantidad.toLocaleString('es-CO', { maximumFractionDigits: 4 })}
                      </td>
                      <td style={{ padding: '5px 10px', borderTop: '1px solid #BFDBFE', color: '#64748B' }}>
                        {c.unidadMedida}
                      </td>
                      <td style={{ padding: '5px 10px', borderTop: '1px solid #BFDBFE',
                        fontFamily: 'var(--f-mono)', color: '#64748B', fontSize: 11 }}>
                        {c.loteComponente}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pre-llenado ET1-F3: resumen de dispensación */}
          {preLlenado && detalle.id === 103 && (() => {
            const kgComps   = preLlenado.componentes.filter(c => c.unidadMedida === 'kg')
            const unComps   = preLlenado.componentes.filter(c => c.unidadMedida === 'un')
            const otherComps = preLlenado.componentes.filter(c => c.unidadMedida !== 'kg' && c.unidadMedida !== 'un')
            const totalKg   = kgComps.reduce((s, c) => s + c.cantidad, 0)
            return (
              <div style={{ margin: '12px 14px', padding: '12px 16px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
                  <i className="fa fa-check-circle" style={{ marginRight: 6 }} />
                  Resumen de Dispensación — Verificar vs. cantidades pesadas
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {[
                    ['Total Comp. (kg)', `${kgComps.length} mat.`],
                    ['Masa Total Teórica', `${totalKg.toLocaleString('es-CO', { maximumFractionDigits: 3 })} kg`],
                    ...(unComps.length > 0 ? [['Comp. Unitarios', `${unComps.reduce((s, c) => s + c.cantidad, 0).toLocaleString('es-CO')} un`]] : []),
                    ...(otherComps.length > 0 ? [['Otros Comp.', `${otherComps.length} ítem(s)`]] : []),
                    ['Lote Logístico', preLlenado.loteLogistico],
                    ['Lote Inspección', preLlenado.loteInspeccion],
                    ['Centro', preLlenado.centro],
                  ].map(([lbl, val]) => (
                    <div key={lbl} style={{ padding: '6px 14px', borderRight: '1px solid #BBF7D0', flexShrink: 0 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{lbl}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#14532D', fontFamily: 'var(--f-mono)' }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Pre-llenado ET2-F1: datos de producto para configuración de encapsuladora */}
          {preLlenado && detalle.id === 201 && (() => {
            const capsComp = preLlenado.componentes.find(c => /CAP|caps/i.test(c.codigoMaterialComponente))
            const capsulas = capsComp ? capsComp.cantidad.toLocaleString('es-CO') + ' un' : `~${(preLlenado.cantidadOrden * 1000).toLocaleString('es-CO')} un`
            return (
              <div style={{ margin: '12px 14px', padding: '12px 16px', background: '#EFF6FF', borderRadius: 10, border: '1px solid #BFDBFE' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
                  <i className="fa fa-cog" style={{ marginRight: 6 }} />
                  Datos del Producto para Configuración de Encapsuladora
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {[
                    ['Producto',              preLlenado.descripcionMaterial],
                    ['Forma Farmacéutica',    preLlenado.formaFarmaceutica],
                    ['Tamaño de Lote',        `${preLlenado.cantidadOrden.toLocaleString('es-CO')} ${preLlenado.unidadMedida}`],
                    ['Cápsulas Teóricas',     capsulas],
                    ['Lote Logístico',        preLlenado.loteLogistico],
                    ['Lote Inspección',       preLlenado.loteInspeccion],
                    ['Registro Sanitario',    preLlenado.registroSanitario],
                  ].map(([lbl, val]) => (
                    <div key={lbl} style={{ padding: '6px 14px', borderRight: '1px solid #BFDBFE', flexShrink: 0 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{lbl}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1E3A8A', fontFamily: 'var(--f-mono)' }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Pre-llenado ET2-F2: Control en Proceso — referencia de parámetros */}
          {preLlenado && detalle.id === 202 && (() => {
            const capsComp = preLlenado.componentes.find(c => /CAP|caps/i.test(c.codigoMaterialComponente))
            const capsulas = capsComp ? capsComp.cantidad.toLocaleString('es-CO') : `~${(preLlenado.cantidadOrden * 1000).toLocaleString('es-CO')}`
            return (
              <div style={{ margin: '12px 14px', padding: '12px 16px', background: '#FFF7ED', borderRadius: 10, border: '1px solid #FED7AA' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
                  <i className="fa fa-tasks" style={{ marginRight: 6 }} />
                  Control en Proceso — Datos de Referencia
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {[
                    ['Producto',            preLlenado.descripcionMaterial],
                    ['Forma Farmacéutica',  preLlenado.formaFarmaceutica],
                    ['Lote',                preLlenado.loteLogistico],
                    ['Cápsulas a Producir', `${capsulas} un`],
                    ['Lote Inspección',     preLlenado.loteInspeccion],
                  ].map(([lbl, val]) => (
                    <div key={lbl} style={{ padding: '6px 14px', borderRight: '1px solid #FED7AA', flexShrink: 0 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: '#EA580C', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{lbl}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#7C2D12', fontFamily: 'var(--f-mono)' }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, padding: '7px 10px', background: '#FEF3C7', borderRadius: 7, fontSize: 11.5, color: '#92400E', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                  <i className="fa fa-info-circle" style={{ marginTop: 1 }} />
                  <span>Los parámetros de peso objetivo y límites (numPesoObjetivo, numLimInfCIP, numLimSupCIP) se toman automáticamente del formulario ET2-F1 mediante <code>calculateValue</code>. Registre muestras cada 30 min durante el proceso.</span>
                </div>
              </div>
            )
          })()}

          {/* Pre-llenado ET2-F3 lote inspección (antes del yield calculator) */}
          {preLlenado && detalle.id === 203 && (
            <div style={{ margin: '12px 14px 0', padding: '8px 16px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', display: 'flex', gap: 0, flexWrap: 'wrap' }}>
              {[
                ['Producto',       preLlenado.descripcionMaterial],
                ['Lote',           preLlenado.loteLogistico],
                ['Lote Insp.',     preLlenado.loteInspeccion],
                ['Cant. Teórica', `${preLlenado.cantidadOrden.toLocaleString('es-CO')} ${preLlenado.unidadMedida}`],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ padding: '5px 12px', borderRight: '1px solid #E2E8F0', flexShrink: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 1 }}>{lbl}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: 'var(--f-mono)' }}>{val}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Yield calculator ET2-F3 ── */}
          {preLlenado && detalle.id === 203 && !readonly && (() => {
            const teorico = preLlenado.cantidadOrden
            const um      = preLlenado.unidadMedida
            const rawReal = savedDataRef.current['rendimiento_real'] as string | undefined
            const real    = rawReal ? parseFloat(rawReal) : NaN
            const pct     = !isNaN(real) && teorico > 0 ? (real / teorico) * 100 : null
            const bgColor = pct === null ? '#F8FAFC' : pct >= 98 ? '#F0FDF4' : pct >= 95 ? '#FFFBEB' : '#FEF2F2'
            const bdColor = pct === null ? '#E2E8F0' : pct >= 98 ? '#BBF7D0' : pct >= 95 ? '#FDE68A' : '#FECACA'
            const txColor = pct === null ? '#64748B' : pct >= 98 ? '#15803D' : pct >= 95 ? '#92400E' : '#991B1B'
            const label   = pct === null ? '—' : pct >= 98 ? '✓ CONFORME' : pct >= 95 ? '⚠ REVISAR' : '✕ FUERA DE SPEC'
            const blocked = pct !== null && pct < 95
            return (
              <div style={{ margin: '12px 14px', padding: '14px 16px', background: bgColor, borderRadius: 10, border: `1.5px solid ${bdColor}` }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: txColor, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>
                  <i className="fa fa-chart-bar" style={{ marginRight: 6 }} />
                  Cálculo de Rendimiento de Encapsulación
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                      Cant. Teórica ({um})
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', fontFamily: 'var(--f-mono)' }}>
                      {teorico.toLocaleString('es-CO')}
                    </div>
                  </div>
                  <div style={{ fontSize: 20, color: '#CBD5E1', fontWeight: 300, paddingBottom: 4 }}>→</div>
                  <div>
                    <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                      Cant. Real ({um}) <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min={0}
                      max={teorico * 1.05}
                      style={{ width: 140, padding: '8px 12px', border: `1.5px solid ${bdColor}`, borderRadius: 8, fontSize: 14, fontFamily: 'var(--f-mono)', fontWeight: 700, outline: 'none', background: '#fff' }}
                      value={rawReal ?? ''}
                      onChange={e => {
                        savedDataRef.current = { ...savedDataRef.current, rendimiento_real: e.target.value, _teorico: teorico }
                        if (lsKey) { try { localStorage.setItem(lsKey, JSON.stringify(savedDataRef.current)) } catch {} }
                        setValidationErrors([]) // trigger re-render
                      }}
                      placeholder={`0 – ${teorico}`}
                    />
                  </div>
                  <div style={{ fontSize: 20, color: '#CBD5E1', fontWeight: 300, paddingBottom: 4 }}>=</div>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: txColor, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Rendimiento %</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: txColor, fontFamily: 'var(--f-mono)', lineHeight: 1 }}>
                      {pct !== null ? `${pct.toFixed(2)}%` : '—'}
                    </div>
                  </div>
                  {pct !== null && (
                    <div style={{ padding: '6px 14px', borderRadius: 20, background: bgColor, border: `1.5px solid ${bdColor}`, fontSize: 11.5, fontWeight: 800, color: txColor, letterSpacing: '.04em', alignSelf: 'flex-end', marginBottom: 4 }}>
                      {label}
                    </div>
                  )}
                </div>
                {blocked && (
                  <div style={{ marginTop: 12, padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#991B1B', display: 'flex', gap: 7, alignItems: 'center' }}>
                    <i className="fa fa-exclamation-triangle" />
                    Rendimiento &lt; 95% — Se requiere nota de desviación antes de firmar el cierre.
                  </div>
                )}
                {blocked && (
                  <input type="hidden" data-yield-blocked="true" />
                )}
              </div>
            )
          })()}

          {/* Pre-llenado ET3-F1: nivel AQL calculado dinámicamente */}
          {preLlenado && detalle.id === 301 && (() => {
            const capsComp  = preLlenado.componentes.find(c => /CAP|caps/i.test(c.codigoMaterialComponente))
            const batchUnits = capsComp ? capsComp.cantidad : preLlenado.cantidadOrden * 1000
            const sampleSize = batchUnits > 150000 ? 800 : batchUnits > 35000 ? 500 : batchUnits > 10000 ? 315 : batchUnits > 3200 ? 200 : batchUnits > 1200 ? 125 : 80
            const aqlLetter  = batchUnits > 150000 ? 'P' : batchUnits > 35000 ? 'N' : batchUnits > 10000 ? 'M' : batchUnits > 3200 ? 'L' : batchUnits > 1200 ? 'K' : 'J'
            return (
              <div style={{ margin: '12px 14px', padding: '12px 16px', background: '#EFF6FF', borderRadius: 10, border: '1px solid #BFDBFE' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
                  <i className="fa fa-search" style={{ marginRight: 6 }} />
                  Parámetros de Inspección AQL — ISO 2859-1 Nivel II Normal
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {[
                    ['Producto',          preLlenado.descripcionMaterial],
                    ['Código',            preLlenado.codigoMaterial],
                    ['Lote',              preLlenado.loteLogistico],
                    ['Lote Inspección',   preLlenado.loteInspeccion],
                    ['Tamaño Lote (un)', Math.round(batchUnits).toLocaleString('es-CO')],
                    ['Letra Código',      aqlLetter],
                    ['Tamaño Muestra',    `${sampleSize} un`],
                    ['Nivel AQL',         '0.65 %'],
                  ].map(([lbl, val]) => (
                    <div key={lbl} style={{ padding: '6px 14px', borderRight: '1px solid #BFDBFE', flexShrink: 0 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{lbl}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1E3A8A', fontFamily: 'var(--f-mono)' }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, padding: '6px 10px', background: '#DBEAFE', borderRadius: 7, fontSize: 11, color: '#1E40AF' }}>
                  <i className="fa fa-info-circle" style={{ marginRight: 5 }} />
                  Criterio de Aceptación 0.65% AQL: máx. <strong>0</strong> defectos críticos · máx. <strong>{Math.floor(sampleSize * 0.01)}</strong> defectos mayores · máx. <strong>{Math.floor(sampleSize * 0.04)}</strong> defectos menores.
                </div>
              </div>
            )
          })()}

          {/* Pre-llenado ET3-F2: identificación del lote para empaque */}
          {preLlenado && detalle.id === 302 && (
            <div style={{ margin: '12px 14px 0', padding: '10px 16px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0', display: 'flex', flexWrap: 'wrap' }}>
              <div style={{ width: '100%', fontSize: 10.5, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
                <i className="fa fa-box" style={{ marginRight: 6 }} />
                Identificación del Lote — Empaque Primario y Secundario
              </div>
              {[
                ['Producto',          preLlenado.descripcionMaterial],
                ['Código',            preLlenado.codigoMaterial],
                ['Forma Farmacéutica',preLlenado.formaFarmaceutica],
                ['Lote Logístico',    preLlenado.loteLogistico],
                ['Lote Inspección',   preLlenado.loteInspeccion],
                ['Fecha Fab.',        preLlenado.fechaFabricacion],
                ['Fecha Cad.',        preLlenado.fechaCaducidad],
                ['Reg. Sanitario',    preLlenado.registroSanitario],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ padding: '4px 14px', borderRight: '1px solid #BBF7D0', flexShrink: 0 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 1 }}>{lbl}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#14532D', fontFamily: 'var(--f-mono)' }}>{val}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Control de Pesos ET3-F2 ── */}
          {detalle.id === 302 && (() => {
            const minV = parseFloat(pesoSpec.min)
            const optV = parseFloat(pesoSpec.opt)
            const maxV = parseFloat(pesoSpec.max)
            const specsOk = !isNaN(minV) && !isNaN(optV) && !isNaN(maxV) && minV < optV && optV < maxV

            const parsed = pesos.map(p => parseFloat(p))
            const valid  = parsed.filter(v => !isNaN(v))
            const promedio = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : NaN

            // ── SVG chart geometry ────────────────────────────────────────────
            const W = 700, H = 220
            const PL = 62, PR = 24, PT = 18, PB = 36
            const innerW = W - PL - PR
            const innerH = H - PT - PB

            const chartYMin = specsOk ? minV - (maxV - minV) * 0.3 : 490
            const chartYMax = specsOk ? maxV + (maxV - minV) * 0.3 : 540

            const toSvgY = (v: number) => PT + (1 - (v - chartYMin) / (chartYMax - chartYMin)) * innerH
            const toSvgX = (i: number) => PL + (i / (PESO_N - 1)) * innerW

            const refLines = specsOk ? [
              { v: maxV, label: `MÁX ${maxV}g`, color: '#DC2626', dash: '5,4' },
              { v: optV, label: `ÓPT ${optV}g`, color: '#1D4ED8', dash: '' },
              { v: minV, label: `MÍN ${minV}g`, color: '#DC2626', dash: '5,4' },
            ] : []

            // Grid Y lines (5 evenly spaced)
            const gridYVals = Array.from({ length: 6 }, (_, i) =>
              chartYMin + (i / 5) * (chartYMax - chartYMin)
            )

            // Points that have valid values
            const pts = parsed.map((v, i) => (!isNaN(v) ? { x: toSvgX(i), y: toSvgY(v), v, i } : null))
            const validPts = pts.filter((p): p is NonNullable<typeof p> => p !== null)
            const polyline = validPts.map(p => `${p.x},${p.y}`).join(' ')

            const stateOf = (v: number) =>
              !specsOk ? null : v < minV || v > maxV ? 'NC' : v < optV - 1 || v > optV + 1 ? 'AC' : 'OK'

            return (
              <div style={{ margin: '12px 14px 0', padding: '14px 16px 16px', background: '#F8FAFC', borderRadius: 12, border: '1.5px solid #E2E8F0' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#0A2D63', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fa fa-chart-line" style={{ fontSize: 13 }} />
                  Control de Pesos — Envasado
                </div>

                {/* Spec limit inputs */}
                {!readonly && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                    {(['min', 'opt', 'max'] as const).map(k => (
                      <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: k === 'opt' ? '#1D4ED8' : '#DC2626', minWidth: 60 }}>
                          {k === 'min' ? 'Mínimo' : k === 'opt' ? 'Óptimo' : 'Máximo'} (g)
                        </span>
                        <input
                          type="number" step="0.1"
                          style={{ width: 80, padding: '4px 8px', border: '1.5px solid #CBD5E1', borderRadius: 6, fontSize: 12, fontFamily: 'var(--f-mono)', fontWeight: 700 }}
                          value={pesoSpec[k]}
                          onChange={e => {
                            const next = { ...pesoSpec, [k]: e.target.value }
                            setPesoSpec(next)
                            savePesoData(next, pesos)
                          }}
                          placeholder="0"
                        />
                      </label>
                    ))}
                    {specsOk && (
                      <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700, alignSelf: 'center' }}>
                        <i className="fa fa-check-circle" style={{ marginRight: 4 }} />
                        Especificaciones configuradas
                      </span>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {/* Weight entry table */}
                  <div style={{ minWidth: 220 }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
                      <thead>
                        <tr style={{ background: '#0A2D63' }}>
                          <th style={{ padding: '5px 10px', color: '#fff', fontWeight: 700, fontSize: 11, letterSpacing: '.04em', textAlign: 'center' }}>Muestra</th>
                          <th style={{ padding: '5px 10px', color: '#fff', fontWeight: 700, fontSize: 11, letterSpacing: '.04em', textAlign: 'center' }}>Peso (g)</th>
                          {specsOk && <th style={{ padding: '5px 10px', color: '#fff', fontWeight: 700, fontSize: 11, letterSpacing: '.04em', textAlign: 'center' }}>Estado</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {pesos.map((p, i) => {
                          const pv = parseFloat(p)
                          const st = isNaN(pv) ? null : stateOf(pv)
                          const stColor = st === 'NC' ? '#DC2626' : st === 'AC' ? '#D97706' : st === 'OK' ? '#10B981' : '#94A3B8'
                          return (
                            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                              <td style={{ padding: '4px 10px', textAlign: 'center', color: '#475569', fontWeight: 600, fontFamily: 'var(--f-mono)', borderBottom: '1px solid #F1F5F9' }}>
                                {i + 1}
                              </td>
                              <td style={{ padding: '3px 6px', borderBottom: '1px solid #F1F5F9' }}>
                                {readonly ? (
                                  <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, color: '#0A1530', padding: '2px 6px', display: 'block', textAlign: 'center' }}>{p || '—'}</span>
                                ) : (
                                  <input
                                    type="number" step="0.01"
                                    style={{ width: '100%', padding: '4px 8px', border: '1.5px solid #E2E8F0', borderRadius: 6, fontSize: 12.5, fontFamily: 'var(--f-mono)', fontWeight: 700, background: 'transparent', textAlign: 'center', outline: 'none' }}
                                    value={p}
                                    onChange={e => {
                                      const next = pesos.map((v, j) => j === i ? e.target.value : v)
                                      setPesos(next)
                                      savePesoData(pesoSpec, next)
                                    }}
                                    placeholder="0.00"
                                  />
                                )}
                              </td>
                              {specsOk && (
                                <td style={{ padding: '4px 10px', textAlign: 'center', borderBottom: '1px solid #F1F5F9' }}>
                                  {st && (
                                    <span style={{ fontSize: 10, fontWeight: 800, color: stColor, letterSpacing: '.05em' }}>{st}</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          )
                        })}
                        <tr style={{ background: '#EFF6FF', borderTop: '2px solid #BFDBFE' }}>
                          <td style={{ padding: '5px 10px', fontWeight: 800, fontSize: 11.5, color: '#1E40AF', textAlign: 'center', letterSpacing: '.04em' }}>PROM.</td>
                          <td style={{ padding: '5px 10px', fontFamily: 'var(--f-mono)', fontWeight: 800, fontSize: 13, color: '#1E40AF', textAlign: 'center' }}>
                            {!isNaN(promedio) ? promedio.toFixed(2) : '—'}
                          </td>
                          {specsOk && (
                            <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                              {!isNaN(promedio) && (() => {
                                const st = stateOf(promedio)
                                const c = st === 'NC' ? '#DC2626' : st === 'AC' ? '#D97706' : '#10B981'
                                return <span style={{ fontSize: 10, fontWeight: 800, color: c }}>{st}</span>
                              })()}
                            </td>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* SVG chart */}
                  <div style={{ flex: 1, minWidth: 340, overflowX: 'auto' }}>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                      {/* Grid lines Y */}
                      {gridYVals.map((v, i) => (
                        <line key={i} x1={PL} y1={toSvgY(v)} x2={W - PR} y2={toSvgY(v)}
                          stroke="#F1F5F9" strokeWidth={1} />
                      ))}
                      {/* Grid lines X */}
                      {Array.from({ length: PESO_N }, (_, i) => (
                        <line key={i} x1={toSvgX(i)} y1={PT} x2={toSvgX(i)} y2={H - PB}
                          stroke="#F1F5F9" strokeWidth={1} />
                      ))}

                      {/* Y-axis labels */}
                      {gridYVals.map((v, i) => (
                        <text key={i} x={PL - 6} y={toSvgY(v) + 4} textAnchor="end"
                          fontSize={9} fill="#94A3B8" fontFamily="monospace">
                          {v.toFixed(0)}
                        </text>
                      ))}

                      {/* X-axis labels */}
                      {Array.from({ length: PESO_N }, (_, i) => (
                        <text key={i} x={toSvgX(i)} y={H - PB + 14} textAnchor="middle"
                          fontSize={9} fill="#64748B" fontFamily="monospace">
                          {i + 1}
                        </text>
                      ))}
                      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={9} fill="#94A3B8" fontFamily="sans-serif">Muestra</text>

                      {/* Axes */}
                      <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke="#CBD5E1" strokeWidth={1.5} />
                      <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="#CBD5E1" strokeWidth={1.5} />

                      {/* Reference lines */}
                      {refLines.map(({ v, label, color, dash }) => {
                        const y = toSvgY(v)
                        return (
                          <g key={label}>
                            <line x1={PL} y1={y} x2={W - PR} y2={y}
                              stroke={color} strokeWidth={1.5} strokeDasharray={dash || undefined} />
                            <text x={W - PR + 3} y={y + 4} fontSize={8.5} fill={color} fontFamily="monospace" fontWeight="bold">
                              {label}
                            </text>
                          </g>
                        )
                      })}

                      {/* Data polyline */}
                      {validPts.length >= 2 && (
                        <polyline points={polyline} fill="none" stroke="#0A2D63" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                      )}

                      {/* Data points */}
                      {pts.map((p, i) => p && (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r={5} fill="#0A2D63" stroke="#fff" strokeWidth={2} />
                          {specsOk && (p.v < minV || p.v > maxV) && (
                            <circle cx={p.x} cy={p.y} r={7} fill="none" stroke="#DC2626" strokeWidth={1.5} />
                          )}
                          <title>{`Muestra ${i + 1}: ${p.v}g`}</title>
                        </g>
                      ))}

                      {/* "No data" label */}
                      {validPts.length === 0 && (
                        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={12} fill="#CBD5E1" fontFamily="sans-serif">
                          Ingrese pesos para ver la gráfica
                        </text>
                      )}

                      {/* Legend */}
                      {specsOk && (
                        <g>
                          <circle cx={PL + 10} cy={PT - 6} r={3} fill="#0A2D63" />
                          <text x={PL + 17} y={PT - 3} fontSize={8.5} fill="#0A2D63" fontFamily="sans-serif">Peso medido</text>
                          <line x1={PL + 90} y1={PT - 6} x2={PL + 100} y2={PT - 6} stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4,3" />
                          <text x={PL + 104} y={PT - 3} fontSize={8.5} fill="#DC2626" fontFamily="sans-serif">Límites</text>
                          <line x1={PL + 148} y1={PT - 6} x2={PL + 158} y2={PT - 6} stroke="#1D4ED8" strokeWidth={1.5} />
                          <text x={PL + 162} y={PT - 3} fontSize={8.5} fill="#1D4ED8" fontFamily="sans-serif">Óptimo</text>
                        </g>
                      )}
                    </svg>
                  </div>
                </div>

                {/* Out-of-spec warning */}
                {specsOk && valid.some(v => v < minV || v > maxV) && (
                  <div style={{ marginTop: 10, padding: '7px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#991B1B', display: 'flex', gap: 7, alignItems: 'center' }}>
                    <i className="fa fa-exclamation-triangle" />
                    {valid.filter(v => v < minV || v > maxV).length} muestra(s) fuera de especificación — requieren acción correctiva.
                  </div>
                )}
              </div>
            )
          })()}

          {/* Pre-llenado ET3-F3: resumen completo para cierre de lote */}
          {preLlenado && detalle.id === 303 && (() => {
            // Pull yield from ET2-F3 localStorage if available
            const d203key = brId ? `br_data_${brId}_203` : null
            let rendPct: number | null = null
            if (d203key) {
              try {
                const raw = localStorage.getItem(d203key)
                if (raw) {
                  const d203 = JSON.parse(raw) as Record<string, unknown>
                  const real = parseFloat(String(d203.rendimiento_real ?? ''))
                  const teo  = preLlenado.cantidadOrden
                  if (!isNaN(real) && teo > 0) rendPct = Math.round((real / teo) * 100 * 100) / 100
                }
              } catch {}
            }
            return (
              <div style={{ margin: '12px 14px', padding: '12px 16px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
                  <i className="fa fa-clipboard-check" style={{ marginRight: 6 }} />
                  Resumen de Lote — Cierre Final
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {([
                    ['Producto',         preLlenado.descripcionMaterial],
                    ['Código',           preLlenado.codigoMaterial],
                    ['Lote Logístico',   preLlenado.loteLogistico],
                    ['Lote Inspección',  preLlenado.loteInspeccion],
                    ['Fecha Fab.',       preLlenado.fechaFabricacion],
                    ['Fecha Cad.',       preLlenado.fechaCaducidad],
                    ['Reg. Sanitario',   preLlenado.registroSanitario],
                    ['Cantidad',        `${preLlenado.cantidadOrden.toLocaleString('es-CO')} ${preLlenado.unidadMedida}`],
                    ['Forma Farmac.',    preLlenado.formaFarmaceutica],
                    ['Centro',           preLlenado.centro],
                  ] as [string, string][]).map(([lbl, val]) => (
                    <div key={lbl} style={{ padding: '6px 14px', borderRight: '1px solid #BBF7D0', flexShrink: 0 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{lbl}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#14532D', fontFamily: 'var(--f-mono)' }}>{val}</div>
                    </div>
                  ))}
                </div>
                {rendPct !== null && (
                  <div style={{ marginTop: 10, padding: '7px 12px', background: rendPct >= 95 ? '#D1FAE5' : '#FEF2F2', border: `1px solid ${rendPct >= 95 ? '#6EE7B7' : '#FECACA'}`, borderRadius: 7, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className={`fa fa-${rendPct >= 95 ? 'check-circle' : 'exclamation-triangle'}`} style={{ color: rendPct >= 95 ? '#059669' : '#DC2626', fontSize: 14 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: rendPct >= 95 ? '#065F46' : '#991B1B' }}>
                      Rendimiento registrado en ET2-F3: <span style={{ fontFamily: 'var(--f-mono)', fontSize: 14 }}>{rendPct}%</span>
                      {rendPct < 95 && ' — Requiere nota de desviación'}
                    </span>
                  </div>
                )}
              </div>
            )
          })()}

          <FormioFrame schema={detalle.jsonSchema ?? ''} locked={cierFirmadas > 0} onDataChange={handleIframeData} getInitialData={getInitialData} />

          {/* ── Validation errors ── */}
          {validationErrors.length > 0 && (
            <div style={{
              margin: '0 16px 10px', padding: '12px 16px',
              background: '#FFF5F5', border: '1.5px solid #FCA5A5',
              borderRadius: 10,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 7, background: '#DC2626',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <i className="fa fa-exclamation" style={{ fontSize: 10, color: '#fff' }} />
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#991B1B', letterSpacing: '0.01em' }}>
                  Completa estos campos antes de firmar
                </span>
              </div>

              {/* Field list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {validationErrors.map((err, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    background: '#fff', borderRadius: 7, padding: '6px 10px',
                    border: '1px solid #FECACA',
                  }}>
                    {/* Field name */}
                    <span style={{
                      fontSize: 12.5, fontWeight: 600, color: '#7F1D1D',
                      flex: 1, minWidth: 120,
                    }}>
                      {err.label}
                    </span>

                    {/* Row chips for datagrid fields, or a simple "requerido" tag */}
                    {err.rows ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: '#B91C1C', fontWeight: 600, marginRight: 2 }}>
                          fila{err.rows.length > 1 ? 's' : ''}:
                        </span>
                        {err.rows.map(n => (
                          <span key={n} style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: '#DC2626', color: '#fff',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, fontFamily: 'var(--f-mono)', flexShrink: 0,
                          }}>{n}</span>
                        ))}
                      </div>
                    ) : (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: '#DC2626',
                        background: '#FEE2E2', borderRadius: 20,
                        padding: '2px 8px', letterSpacing: '0.04em', textTransform: 'uppercase',
                        flexShrink: 0,
                      }}>
                        requerido
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Firma block ── */}
          {firmasCierre.length > 0 && (
            <div className="firma-block" style={{ opacity: allSecDone ? 1 : 0.45, transition: 'opacity 200ms' }}>
              {/* Header */}
              <div className="firma-block-hdr">
                <div style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  background: '#EEF2F9', display: 'grid', placeItems: 'center',
                }}>
                  <i className="fa fa-pen" style={{ fontSize: 9, color: '#0A2D63' }} />
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 800, color: '#0A2D63',
                  textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1,
                }}>Firmas de aprobación</span>
                <span style={{
                  fontSize: 11, fontFamily: 'var(--f-mono)', fontWeight: 700,
                  background: allCierDone ? '#D1FAE5' : '#EEF2F9',
                  color: allCierDone ? '#065F46' : '#475569',
                  padding: '1px 9px', borderRadius: 12,
                }}>
                  {cierFirmadas}/{firmasCierre.length}
                </span>
              </div>

              {/* Warning if sections pending */}
              {!allSecDone && (
                <div style={{
                  padding: '7px 18px', background: '#FFFBEB', fontSize: 11.5, color: '#92400E',
                  display: 'flex', gap: 6, alignItems: 'center', borderBottom: '1px solid #FDE68A',
                }}>
                  <i className="fa fa-exclamation-triangle" style={{ fontSize: 10 }} />
                  Complete las secciones del formulario antes de firmar el cierre.
                </div>
              )}

              {/* Firma rows */}
              {firmasCierre.map((firma, i) => {
                const firmaKey  = `cie:${detalle.id}:${firma.idFirma}`
                const firmaInfo = firmados[firmaKey]
                const prevOk    = i === 0 || !!firmados[`cie:${detalle.id}:${firmasCierre[i - 1].idFirma}`]
                const bloq      = !prevOk && !firmaInfo
                return (
                  <div key={firma.idFirma} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 18px',
                    flexWrap: 'wrap',
                    borderTop: '1px solid rgba(10,21,48,0.05)',
                    background: firmaInfo ? 'rgba(45,93,74,0.03)' : 'transparent',
                    opacity: bloq ? 0.4 : 1, transition: 'opacity 200ms',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                      background: firmaInfo ? '#2D5D4A' : '#0A2D63',
                      color: '#fff', display: 'grid', placeItems: 'center',
                      fontSize: 10, fontWeight: 700, fontFamily: 'var(--f-mono)',
                    }}>
                      {firmaInfo ? <i className="fa fa-check" style={{ fontSize: 8 }} /> : firma.orden}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: firmaInfo ? '#2D5D4A' : '#0A1530' }}>
                        {firma.texto}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'var(--f-mono)', marginTop: 2 }}>
                        {firma.grupo} · {GRUPO_CARGO[firma.grupo] ?? firma.grupo}
                      </div>
                    </div>
                    {firmaInfo
                      ? (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' }}>
                          <FirmaStamp info={firmaInfo} />
                          {puedeDerogCierre && onRequestDerogar && (
                            <button title="Derogar firma"
                              style={{
                                marginTop: 2, background: '#FEF2F2', border: '1px solid #FECACA',
                                borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                                color: '#DC2626', fontSize: 11, flexShrink: 0,
                              }}
                              onClick={() => onRequestDerogar(firmaKey, '', detalle.id, firmaInfo, firma.texto, firma.grupo)}>
                              <i className="fa fa-undo" />
                            </button>
                          )}
                        </div>
                      )
                      : (!readonly && allSecDone && !bloq && (
                          <button className="btn btn-warning" style={{ fontSize: 12, flexShrink: 0 }}
                            onClick={() => handleFirmar('cierre', firmaKey, firma.texto, firma.grupo)}>
                            <i className="fa fa-pen" /> Firmar
                          </button>
                        ))
                    }
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── AuditPreviewPanel ─────────────────────────────────────────────────────
const AUDIT_GRUPOS = ['Calidad', 'Supervisión', 'Administradores', 'Dirección']

const AUDIT_ICON: Record<string, string> = {
  CREAR: 'fa-plus', MODIFICAR: 'fa-pencil-alt', CANCELAR: 'fa-ban',
  FIRMAR_SECCION: 'fa-pen', FIRMAR_CIERRE: 'fa-check-circle', DEROGAR_FIRMA: 'fa-undo',
}
const AUDIT_COLOR: Record<string, { bg: string; color: string; label: string }> = {
  CREAR:          { bg:'#D1FAE5', color:'#065F46', label:'Creación' },
  MODIFICAR:      { bg:'#DBEAFE', color:'#1D4ED8', label:'Modificación' },
  CANCELAR:       { bg:'#FEE2E2', color:'#991B1B', label:'Cancelación' },
  FIRMAR_SECCION: { bg:'#EDE9FE', color:'#5B21B6', label:'Firma Sección' },
  FIRMAR_CIERRE:  { bg:'#EDE9FE', color:'#5B21B6', label:'Firma Cierre' },
  DEROGAR_FIRMA:  { bg:'#FEF3C7', color:'#92400E', label:'Derogación' },
}

function AuditPreviewPanel({ detalleIds }: { detalleIds: number[] }) {
  const allEntries = useAuditStore(s => s.entries)
  const relevant = allEntries.filter(e =>
    Object.keys(AUDIT_COLOR).includes(e.accion) &&
    detalleIds.includes(Number(e.idEntidad))
  ).slice(0, 60)

  return (
    <div className="audit-panel">
      {/* Header */}
      <div style={{
        background: '#0A2D63', padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 9,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: 'rgba(247,201,46,0.15)', border: '1.5px solid rgba(247,201,46,0.25)',
          display: 'grid', placeItems: 'center',
        }}>
          <i className="fa fa-history" style={{ color: '#F7C92E', fontSize: 11 }} />
        </div>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, flex: 1 }}>Historial</span>
        <span style={{
          fontSize: 10.5, fontFamily: 'var(--f-mono)', fontWeight: 700,
          background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.65)',
          padding: '1px 9px', borderRadius: 10,
        }}>
          {relevant.length}
        </span>
      </div>

      {/* Entries */}
      <div style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
        {relevant.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <i className="fa fa-history" style={{
              fontSize: 26, color: '#E2E8F0', marginBottom: 10, display: 'block',
            }} />
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#94A3B8' }}>Sin eventos aún</div>
            <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 4, lineHeight: 1.5 }}>
              Los cambios y firmas aparecen aquí en tiempo real.
            </div>
          </div>
        ) : relevant.map(e => {
          const d    = new Date(e.timestamp)
          const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          const cfg  = AUDIT_COLOR[e.accion] ?? { bg: '#F1F5F9', color: '#475569', label: e.accion }
          return (
            <div key={e.id} style={{
              padding: '9px 12px', borderBottom: '1px solid rgba(10,21,48,0.06)',
              display: 'flex', alignItems: 'flex-start', gap: 9,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                marginTop: 6, background: cfg.color,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    background: cfg.bg, color: cfg.color, flexShrink: 0,
                  }}>{cfg.label}</span>
                  <span style={{
                    fontSize: 11, color: '#475569', fontWeight: 600, fontFamily: 'var(--f-mono)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {e.loginUsuario}
                  </span>
                </div>
                {e.cambios && e.cambios.length > 0 && (
                  <div style={{ fontSize: 10.5, color: '#64748B', marginBottom: 2, lineHeight: 1.4 }}>
                    {e.cambios.slice(0, 2).map(c =>
                      `${c.etiqueta}: "${c.valorAnterior || '—'}" → "${c.valorNuevo || '—'}"`
                    ).join(' · ')}
                    {e.cambios.length > 2 && (
                      <em style={{ color: '#94A3B8' }}> +{e.cambios.length - 2} más</em>
                    )}
                  </div>
                )}
                {e.motivo && (
                  <div style={{
                    fontSize: 10, color: '#92400E', background: '#FEF3C7',
                    borderRadius: 4, padding: '1px 6px', display: 'inline-block', maxWidth: '100%',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2,
                  }} title={e.motivo}>
                    <i className="fa fa-comment-alt" style={{ marginRight: 3, fontSize: 9 }} />{e.motivo}
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--f-mono)' }}>{hora}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{
        padding: '9px 14px', borderTop: '1px solid rgba(10,21,48,0.08)',
        display: 'flex', justifyContent: 'center',
      }}>
        <a href="/admin/logs"
          style={{ fontSize: 11.5, color: '#0A2D63', textDecoration: 'none', fontWeight: 600 }}>
          Ver auditoría completa →
        </a>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────
export function EditarBatchRecord({ readonly = false }: { readonly?: boolean }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { registrar } = useAudit()
  const authUser = useAuthStore(s => s.user)
  const [preLlenado, setPreLlenado] = useState<PreLlenadoBR | null>(null)
  const [procesoActivo, setProcesoActivo] = useState(mockProcesos[0]?.id ?? 0)

  useEffect(() => {
    if (id) formulaControlApi.getPreLlenado(Number(id)).then(setPreLlenado)
  }, [id])
  const [firmaModal, setFirmaModal] = useState<{ tipo: 'seccion'|'cierre'; firmaKey: string; texto: string; grupo: string } | null>(null)
  const [firmados, setFirmados] = useState<FirmaMap>(() => {
    try {
      const saved = localStorage.getItem(`br_firmados_${id}`)
      return saved ? (JSON.parse(saved) as FirmaMap) : buildInitialFirmados()
    } catch { return buildInitialFirmados() }
  })
  const [showAudit, setShowAudit] = useState(false)
  const [cerradosProcesos, setCerradosProcesos] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(`br_cerrados_${id}`)
      return saved ? new Set(JSON.parse(saved) as number[]) : new Set()
    } catch { return new Set() }
  })
  const [liberadoInfo, setLiberadoInfo] = useState<FirmaInfo | null>(() => {
    try {
      const saved = localStorage.getItem(`br_liberado_${id}`)
      return saved ? (JSON.parse(saved) as FirmaInfo) : null
    } catch { return null }
  })
  const [liberarModal, setLiberarModal] = useState(false)

  const brFinalizado = DETALLE_STRUCT.every(d => {
    const fc = getFirmasDeEstrategia(d.idEstrategiaFirma)
    return fc.length > 0 && fc.every(f => !!firmados[`cie:${d.id}:${f.idFirma}`])
  })

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=960,height=720')
    if (!win) { alert('Habilita ventanas emergentes en el navegador para imprimir'); return }

    const cab = buildCabeceraItems(preLlenado)
    const now = new Date()
    const printDate = now.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    const printTime = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

    // Collect all saved form data from localStorage for each detalle
    const allFormData: Record<number, Record<string, unknown>> = {}
    DETALLE_STRUCT.forEach(d => {
      try {
        const raw = localStorage.getItem(`br_data_${id}_${d.id}`)
        allFormData[d.id] = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      } catch { allFormData[d.id] = {} }
    })

    const procsSections = mockProcesos.map(proc => {
      const dets = DETALLE_STRUCT.filter(d => d.idProceso === proc.id)
      const detsHTML = dets.map(det => {
        const fc = getFirmasDeEstrategia(det.idEstrategiaFirma)
        const rows = fc.map(f => {
          const info = firmados[`cie:${det.id}:${f.idFirma}`]
          return info
            ? `<tr>
                <td class="role">${f.texto}</td>
                <td class="name">${info.nombre}</td>
                <td>${info.cargo}</td>
                <td class="mono">${info.fecha}</td>
                <td class="mono">${info.hora}</td>
               </tr>`
            : `<tr class="pend"><td class="role">${f.texto}</td><td colspan="4" class="pend-cell">—</td></tr>`
        }).join('')
        // Render captured form data (exclude internal underscore keys and empty values)
        const formEntries = Object.entries(allFormData[det.id] ?? {})
          .filter(([k, v]) => !k.startsWith('_') && v !== '' && v !== null && v !== undefined)
        const dataHTML = formEntries.length > 0
          ? `<table class="data-tbl"><thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>${
              formEntries.map(([k, v]) =>
                `<tr><td class="data-key">${k.replace(/_/g, ' ')}</td><td class="data-val">${String(v)}</td></tr>`
              ).join('')
            }</tbody></table>`
          : ''
        return `<div class="det">
          <div class="det-title"><span class="det-num">${det.orden}</span>${det.descripcion}</div>
          ${dataHTML}
          <table class="sig-tbl"><thead><tr>
            <th>Rol</th><th>Firmante</th><th>Cargo</th><th>Fecha</th><th>Hora</th>
          </tr></thead><tbody>${rows}</tbody></table>
        </div>`
      }).join('')
      return `<div class="proc">
        <div class="proc-hdr">${proc.descripcion}</div>
        ${detsHTML}
      </div>`
    }).join('')

    const cabHTML = cab.map(it =>
      `<div class="cab-item"><div class="cab-lbl">${it.label}</div><div class="cab-val">${it.value}</div></div>`
    ).join('')

    win.document.write(`<!DOCTYPE html><html lang="es"><head>
<meta charset="UTF-8">
<title>Batch Record BR-${id ?? '—'}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:9.5pt;color:#1a1a2e;background:#fff;padding:0}
  @page{size:A4;margin:18mm 16mm 18mm 16mm}
  @media print{.no-print{display:none!important}}

  /* ── Header ── */
  .br-header{background:#0A2D63;color:#fff;padding:14px 20px;display:flex;align-items:center;gap:16px;margin-bottom:0}
  .br-logo{font-size:18pt;font-weight:900;letter-spacing:-0.02em;color:#F7C92E}
  .br-logo span{color:#fff;font-weight:300}
  .br-title{flex:1}
  .br-title h1{font-size:12pt;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:2px}
  .br-title p{font-size:8.5pt;color:rgba(255,255,255,.7)}
  .br-num{font-size:14pt;font-weight:900;font-family:monospace;background:rgba(247,201,46,.18);
    border:1.5px solid rgba(247,201,46,.35);color:#F7C92E;padding:4px 14px;border-radius:6px}

  /* ── Cabecera ── */
  .cab-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1.5px solid #CBD5E1;border-radius:0}
  .cab-item{padding:7px 12px;border-right:1px solid #E2E8F0;border-bottom:1px solid #E2E8F0}
  .cab-item:nth-child(3n){border-right:none}
  .cab-item:nth-last-child(-n+3){border-bottom:none}
  .cab-lbl{font-size:7.5pt;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
  .cab-val{font-size:10pt;font-weight:700;color:#0A1530}
  .section-hdr{background:#F6F4EE;border-left:4px solid #0A2D63;padding:5px 12px;
    font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:.07em;
    color:#0A2D63;margin:14px 0 0}

  /* ── Procesos / Detalles ── */
  .proc{margin-bottom:10px;page-break-inside:avoid}
  .proc-hdr{background:#0A2D63;color:#fff;padding:8px 14px;font-size:9.5pt;font-weight:700;
    letter-spacing:.02em;margin-bottom:0}
  .det{border:1px solid #E2E8F0;border-top:none;padding:8px 12px;page-break-inside:avoid}
  .det-title{font-size:9pt;font-weight:700;color:#1E3A8A;margin-bottom:6px;
    display:flex;align-items:center;gap:8px}
  .det-num{background:#0A2D63;color:#fff;width:18px;height:18px;border-radius:50%;
    display:inline-flex;align-items:center;justify-content:center;
    font-size:8pt;font-weight:700;flex-shrink:0}

  /* ── Firma table ── */
  .sig-tbl{width:100%;border-collapse:collapse;font-size:8.5pt}
  .sig-tbl thead tr{background:#F1F5F9}
  .sig-tbl th{padding:4px 8px;text-align:left;font-size:7.5pt;font-weight:700;
    color:#475569;text-transform:uppercase;letter-spacing:.05em;border-bottom:1.5px solid #CBD5E1}
  .sig-tbl td{padding:5px 8px;border-bottom:1px solid #F1F5F9;vertical-align:middle}
  .sig-tbl tr:last-child td{border-bottom:none}
  .role{color:#374151;font-weight:600;max-width:180px}
  .name{font-weight:700;color:#0A1530}
  .mono{font-family:monospace;font-size:8pt;color:#475569}
  .pend td{color:#94A3B8;font-style:italic}
  .pend-cell{color:#CBD5E1}
  .data-tbl{width:100%;border-collapse:collapse;font-size:8pt;margin-bottom:6px;background:#FAFAFA;border-radius:4px}
  .data-tbl thead tr{background:#EFF6FF}
  .data-tbl th{padding:3px 8px;text-align:left;font-size:7pt;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:.05em}
  .data-tbl td{padding:4px 8px;border-bottom:1px solid #F1F5F9;vertical-align:middle;font-size:8pt}
  .data-key{color:#475569;font-weight:600;white-space:nowrap;width:40%}
  .data-val{color:#0F172A;font-family:monospace}

  /* ── Approval stamp ── */
  .stamp{margin:20px auto 0;max-width:420px;border:3px solid #2D5D4A;border-radius:12px;
    padding:18px 24px;text-align:center;page-break-inside:avoid}
  .stamp-icon{font-size:30pt;color:#2D5D4A;margin-bottom:6px}
  .stamp-title{font-size:16pt;font-weight:900;color:#2D5D4A;text-transform:uppercase;
    letter-spacing:.08em;margin-bottom:4px}
  .stamp-sub{font-size:8.5pt;color:#64748B}
  .stamp-date{font-size:10pt;font-weight:700;color:#1E3A8A;margin-top:8px;font-family:monospace}
  .stamp-pending{margin:20px auto 0;max-width:420px;border:3px dashed #CBD5E1;border-radius:12px;
    padding:18px 24px;text-align:center;page-break-inside:avoid}
  .stamp-pending-title{font-size:14pt;font-weight:800;color:#94A3B8;text-transform:uppercase;
    letter-spacing:.08em;margin-bottom:4px}
  .stamp-pending-sub{font-size:8.5pt;color:#CBD5E1}

  /* ── Footer ── */
  .pg-footer{margin-top:20px;padding-top:8px;border-top:1px solid #CBD5E1;
    display:flex;justify-content:space-between;align-items:center;font-size:7.5pt;color:#94A3B8}
  .controlled{font-weight:700;color:#DC2626;font-size:7pt;
    border:1px solid #FCA5A5;padding:2px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:.06em}
  a.print-btn{display:block;width:fit-content;margin:16px auto 0;
    background:#0A2D63;color:#fff;border:none;border-radius:8px;
    padding:10px 28px;font-size:11pt;font-weight:700;cursor:pointer;text-decoration:none;
    font-family:inherit;letter-spacing:.02em}
  a.print-btn:hover{background:#0d3a7d}
</style>
</head><body>

<div class="br-header">
  <div class="br-logo">BAC<span>ord</span></div>
  <div class="br-title">
    <h1>Registro de Fabricación — Batch Record</h1>
    <p>Sistema BACord · Módulo de Producción Farmacéutica</p>
  </div>
  <div class="br-num">BR-${id ?? '—'}</div>
</div>

<div style="padding:14px 0 0">
  <div class="section-hdr">Información del Lote</div>
  <div class="cab-grid">${cabHTML}</div>

  <div class="section-hdr" style="margin-top:14px">Etapas y Firmas de Aprobación</div>
  ${procsSections}

  ${brFinalizado
      ? `<div class="stamp">
    <div class="stamp-icon">✓</div>
    <div class="stamp-title">Batch Record Aprobado</div>
    <div class="stamp-sub">Todas las etapas completadas y firmadas conforme a BPM</div>
    <div class="stamp-date">Impreso: ${printDate} · ${printTime}</div>
  </div>`
      : `<div class="stamp-pending">
    <div class="stamp-pending-title">Pendiente de Aprobación</div>
    <div class="stamp-pending-sub">No todas las etapas han sido completadas y firmadas</div>
  </div>`
    }

  <div class="pg-footer">
    <span class="controlled">Documento Controlado</span>
    <span>BR-${id ?? '—'} · Impreso: ${printDate} ${printTime}</span>
    <span>BACord v1.0 — Sistema de Gestión de Batch Records</span>
  </div>
</div>

<a class="print-btn no-print" onclick="window.print()">🖨 Imprimir / Guardar PDF</a>

</body></html>`)
    win.document.close()
  }

  const userGruposMain = (authUser?.grupos ?? '').split(',').map(g => g.trim())
  const canViewAudit = true || authUser?.esAdministrador || AUDIT_GRUPOS.some(g => userGruposMain.includes(g))
  const [derogTarget, setDerogTarget] = useState<{
    firmaKey: string; blockKey: string; detalleId: number
    firmaInfo: FirmaInfo; texto: string; grupo: string
  } | null>(null)

  const handleDerogar = (motivo: string) => {
    if (!derogTarget) return
    const { firmaKey, blockKey, detalleId, texto } = derogTarget
    setFirmados(prev => {
      const next = { ...prev }
      delete next[firmaKey]
      if (firmaKey.startsWith('sec:')) {
        Object.keys(next).forEach(k => {
          if (k.startsWith(`sec:${detalleId}:${blockKey}:`) || k.startsWith(`cie:${detalleId}:`)) delete next[k]
        })
      } else {
        Object.keys(next).forEach(k => { if (k.startsWith(`cie:${detalleId}:`)) delete next[k] })
      }
      try { localStorage.setItem(`br_firmados_${id}`, JSON.stringify(next)) } catch {}
      return next
    })
    registrar({
      entidad: firmaKey.startsWith('cie:') ? 'FirmaCierre' : 'FirmaSeccion',
      idEntidad: detalleId,
      descripcionEntidad: texto,
      accion: 'DEROGAR_FIRMA',
      modulo: 'batch-record',
      motivo,
    })
    setDerogTarget(null)
  }

  const handleSaveDetalle = (
    detalleId: number,
    prev: Record<string, string>,
    next: Record<string, string>,
    labels: Record<string, string>
  ) => {
    const cambios = diffValores(prev, next, labels)
    if (!cambios.length) return
    const det = DETALLE_STRUCT.find(d => d.id === detalleId)
    registrar({
      entidad: 'DetalleValores',
      idEntidad: detalleId,
      descripcionEntidad: det?.descripcion ?? `Detalle ${detalleId}`,
      accion: 'MODIFICAR',
      modulo: 'batch-record',
      cambios,
    })
  }

  const handleFormData = (
    detalleId: number,
    prev: Record<string, unknown>,
    next: Record<string, unknown>,
    labels: Record<string, string>
  ) => {
    const cambios = diffFormData(prev, next, labels)
    if (!cambios.length) return
    const det = DETALLE_STRUCT.find(d => d.id === detalleId)
    registrar({
      entidad: 'DetalleValores',
      idEntidad: detalleId,
      descripcionEntidad: det?.descripcion ?? `Detalle ${detalleId}`,
      accion: 'MODIFICAR',
      modulo: 'batch-record',
      cambios,
    })
  }

  const detallesProceso = DETALLE_STRUCT
    .filter(d => d.idProceso === procesoActivo)
    .map(d => {
      const stored = getDetalleById(d.id)
      return { ...d, jsonSchema: stored?.jsonSchema ?? '', idEstrategiaFirma: stored?.idEstrategiaFirma ?? d.idEstrategiaFirma }
    })
  const procesoIdx  = mockProcesos.findIndex(p => p.id === procesoActivo)
  const procesoInfo = mockProcesos[procesoIdx]

  const handleCerrarProceso = () => {
    const allDone = detallesProceso.every(d => {
      const fc = getFirmasDeEstrategia(d.idEstrategiaFirma)
      return fc.length > 0 && fc.every(f => !!firmados[`cie:${d.id}:${f.idFirma}`])
    })
    if (!allDone) return
    setCerradosProcesos(prev => {
      const next = new Set([...prev, procesoActivo])
      try { localStorage.setItem(`br_cerrados_${id}`, JSON.stringify([...next])) } catch {}
      return next
    })
    const nextIdx = procesoIdx + 1
    if (nextIdx < mockProcesos.length) setProcesoActivo(mockProcesos[nextIdx].id)
  }

  const allDetallesCurrentDone = detallesProceso.every(d => {
    const fc = getFirmasDeEstrategia(d.idEstrategiaFirma)
    return fc.length > 0 && fc.every(f => !!firmados[`cie:${d.id}:${f.idFirma}`])
  })

  const handleCerrarBatch = () => {
    const allCerrados = mockProcesos.every(p => cerradosProcesos.has(p.id))
    if (!allCerrados) return
    const brIdx = mockBatchRecords.findIndex(b => b.idBatchRecord === Number(id))
    if (brIdx >= 0) {
      mockBatchRecords[brIdx].idEstado = 2
      mockBatchRecords[brIdx].porcentajeAvance = 100
      mockBatchRecords[brIdx].fechaModificacion = new Date().toISOString()
    }
    try {
      localStorage.removeItem(`br_firmados_${id}`)
      localStorage.removeItem(`br_cerrados_${id}`)
    } catch {}
    navigate('/batch-records')
  }

  return (
    <>
      <style>{`
        /* ── Batch Record page redesign ── */
        .br-card { background:#fff;border-radius:16px;border:1px solid rgba(10,21,48,0.08);
          overflow:hidden;margin-bottom:14px;box-shadow:0 2px 8px rgba(10,21,48,0.06); }
        /* Identity strip */
        .br-identity { background:linear-gradient(135deg,#0A2D63 0%,#0D3575 100%);
          padding:14px 20px;display:flex;align-items:center;gap:12px; }
        .br-doc-badge { width:38px;height:38px;border-radius:10px;flex-shrink:0;
          background:rgba(247,201,46,0.15);border:1.5px solid rgba(247,201,46,0.3);
          display:grid;place-items:center;font-size:11px;font-weight:800;color:#F7C92E;
          font-family:var(--f-mono);letter-spacing:0.05em; }
        .br-product-name { font-size:15px;font-weight:700;color:#fff;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .br-doc-ref { font-size:11px;color:rgba(255,255,255,0.45);
          font-family:var(--f-mono);margin-top:3px; }
        .br-identity-actions { display:flex;gap:8px;flex-shrink:0;margin-left:auto; }
        .br-btn-ghost { background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.18);
          color:#fff;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;
          cursor:pointer;transition:background 120ms;display:inline-flex;align-items:center;
          gap:6px;font-family:var(--f-sans); }
        .br-btn-ghost:hover { background:rgba(255,255,255,0.2); }
        .br-btn-ghost.br-btn-active { background:rgba(247,201,46,0.22);
          border-color:rgba(247,201,46,0.45);color:#F7C92E; }
        /* Metadata grid */
        .br-meta-grid { display:flex;flex-wrap:wrap;border-bottom:1px solid rgba(10,21,48,0.07); }
        .br-meta-item { padding:10px 20px;border-right:1px solid rgba(10,21,48,0.06);flex-shrink:0; }
        .br-meta-lbl { font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;
          letter-spacing:0.08em;margin-bottom:3px;font-family:var(--f-mono); }
        .br-meta-val { font-size:13px;font-weight:600;color:#0A1530; }
        /* Stage tabs */
        .br-stages { display:flex;align-items:stretch;background:#F8F7F2;
          border-bottom:1px solid rgba(10,21,48,0.08);overflow-x:auto; }
        .br-stage-nav { padding:0 12px;background:none;border:none;cursor:pointer;
          color:rgba(10,21,48,0.28);flex-shrink:0;transition:color 120ms;
          display:flex;align-items:center; }
        .br-stage-nav:hover { color:#0A2D63; }
        .br-stage { flex:1;min-width:170px;padding:11px 18px;background:none;border:none;cursor:pointer;
          display:flex;align-items:center;gap:10px;border-right:1px solid rgba(10,21,48,0.07);
          border-bottom:3px solid transparent;transition:all 100ms;text-align:left;
          font-family:var(--f-sans); }
        .br-stage:last-of-type { border-right:none; }
        .br-stage:hover { background:rgba(10,21,48,0.02); }
        .br-stage.active { background:#fff;border-bottom-color:#0A2D63; }
        .br-stage-num { width:26px;height:26px;border-radius:50%;background:rgba(10,21,48,0.09);
          color:#64748B;display:grid;place-items:center;font-size:11px;font-weight:800;
          font-family:var(--f-mono);flex-shrink:0;transition:all 100ms; }
        .br-stage.active .br-stage-num { background:#0A2D63;color:#fff; }
        .br-stage.done .br-stage-num { background:#2D5D4A;color:#fff; }
        .br-stage-lbl { font-size:12.5px;font-weight:500;color:#64748B;line-height:1.3; }
        .br-stage.active .br-stage-lbl { color:#0A1530;font-weight:700; }
        .br-stage.done .br-stage-lbl { color:#2D5D4A;font-weight:600; }
        /* Content layout */
        .br-layout { display:flex;gap:14px;align-items:flex-start;padding:16px;
          background:#F4F3EE; }
        .br-forms { flex:1;min-width:0; }
        /* Det cards */
        .det-card { background:#fff;border-radius:10px;margin-bottom:10px;overflow:hidden;
          border:1px solid rgba(10,21,48,0.09);border-left-width:4px;
          box-shadow:0 1px 3px rgba(10,21,48,0.05);transition:box-shadow 150ms; }
        .det-card.det-open { box-shadow:0 4px 16px rgba(10,21,48,0.09); }
        .det-header { display:flex;align-items:center;gap:12px;padding:13px 16px;
          cursor:pointer;transition:background 100ms;user-select:none; }
        .det-header:hover { background:rgba(10,21,48,0.015); }
        /* Firma block */
        .firma-block { background:#F8F7F2;border-top:1.5px solid rgba(10,21,48,0.08); }
        .firma-block-hdr { padding:10px 18px;display:flex;align-items:center;gap:8px;
          border-bottom:1px solid rgba(10,21,48,0.07); }
        /* Closed process banner */
        .proc-closed { display:flex;align-items:center;gap:8px;padding:10px 14px;
          background:rgba(45,93,74,0.06);border:1.5px solid rgba(45,93,74,0.2);
          border-radius:10px;margin-bottom:12px;font-size:12.5px;color:#2D5D4A; }
        /* Footer */
        .br-footer { display:flex;align-items:center;justify-content:flex-end;gap:10px;
          padding:12px 20px;background:#fff;border-top:1px solid rgba(10,21,48,0.07); }
        /* Audit panel */
        .audit-panel { width:280px;flex-shrink:0;background:#fff;border-radius:12px;
          border:1px solid rgba(10,21,48,0.09);overflow:hidden;position:sticky;top:16px;
          box-shadow:0 1px 4px rgba(10,21,48,0.06); }
      `}</style>

      <div className="br-card">
        {/* ── Identity strip ── */}
        <div className="br-identity">
          <div className="br-doc-badge">BR</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="br-product-name">SYNAPTOMAX 250 mg — Cápsulas de Liberación Modificada</div>
            <div className="br-doc-ref" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span>BR-{id}</span>
              {preLlenado && <>
                <span style={{ opacity: 0.4 }}>·</span>
                <a href={`/ordenes-proceso/${mockBatchRecords.find(b => b.idBatchRecord === Number(id))?.idOrdenProceso}`}
                  style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontWeight: 600 }}
                  onMouseOver={e => (e.currentTarget.style.color = '#F7C92E')}
                  onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
                  {preLlenado.numeroOrdenProceso}
                </a>
                <span style={{ opacity: 0.4 }}>·</span>
                <a href={`/formulas-control/${mockBatchRecords.find(b => b.idBatchRecord === Number(id))?.idFormulaControl}`}
                  style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontWeight: 600 }}
                  onMouseOver={e => (e.currentTarget.style.color = '#F7C92E')}
                  onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
                  FC-{mockBatchRecords.find(b => b.idBatchRecord === Number(id))?.idFormulaControl}
                </a>
              </>}
            </div>
          </div>
          <div className="br-identity-actions">
            {canViewAudit && (
              <button className={`br-btn-ghost${showAudit ? ' br-btn-active' : ''}`}
                onClick={() => setShowAudit(s => !s)}>
                <i className="fa fa-history" /> Historial
              </button>
            )}
            <button className="br-btn-ghost" onClick={() => navigate('/batch-records')}>
              <i className="fa fa-chevron-left" /> Volver
            </button>
          </div>
        </div>

        {/* ── Metadata grid ── */}
        <div className="br-meta-grid">
          {buildCabeceraItems(preLlenado).map((item, i) => (
            <div key={i} className="br-meta-item">
              <div className="br-meta-lbl">{item.label}</div>
              <div className="br-meta-val">{item.value}</div>
            </div>
          ))}
        </div>

        {/* ── Stage tabs ── */}
        <div className="br-stages">
          {mockProcesos.length > 1 && (
            <button className="br-stage-nav" title="Anterior"
              onClick={() => { if (procesoIdx > 0) setProcesoActivo(mockProcesos[procesoIdx - 1].id) }}>
              <ChevronLeft size={15} />
            </button>
          )}
          {mockProcesos.map((p, idx) => {
            const isDone     = cerradosProcesos.has(p.id)
            const isUnlocked = idx === 0 || cerradosProcesos.has(mockProcesos[idx - 1].id)
            return (
              <button key={p.id}
                className={`br-stage${procesoActivo === p.id ? ' active' : ''}${isDone ? ' done' : ''}`}
                title={!isUnlocked ? `Complete y cierre la Etapa ${idx} primero` : undefined}
                style={{ cursor: isUnlocked ? 'pointer' : 'not-allowed', opacity: isUnlocked ? 1 : 0.45 }}
                onClick={() => { if (isUnlocked) setProcesoActivo(p.id) }}>
                <div className="br-stage-num">
                  {isDone
                    ? <i className="fa fa-check" style={{ fontSize: 9 }} />
                    : !isUnlocked
                      ? <i className="fa fa-lock" style={{ fontSize: 8 }} />
                      : idx + 1}
                </div>
                <span className="br-stage-lbl">{p.descripcion}</span>
              </button>
            )
          })}
          {mockProcesos.length > 1 && (
            <button className="br-stage-nav" title="Siguiente"
              onClick={() => { if (procesoIdx < mockProcesos.length - 1) setProcesoActivo(mockProcesos[procesoIdx + 1].id) }}>
              <ChevronRight size={15} />
            </button>
          )}
        </div>

        {/* ── Content ── */}
        <div className="br-layout">
          <div className="br-forms">
            {cerradosProcesos.has(procesoActivo) && (
              <div className="proc-closed">
                <i className="fa fa-check-circle" style={{ fontSize: 15 }} />
                <strong>Proceso cerrado</strong> — todos los formularios y firmas completados. Solo lectura.
              </div>
            )}
            {detallesProceso.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: '32px 0' }}>
                Sin instrucciones para este proceso.
              </p>
            ) : (
              detallesProceso.map(det => (
                <DetalleCard
                  key={det.id}
                  detalle={det}
                  firmados={firmados}
                  readonly={cerradosProcesos.has(procesoActivo) || readonly}
                  onFirmar={(tipo, firmaKey, texto, grupo) => {
                    if (!readonly) setFirmaModal({ tipo, firmaKey, texto, grupo })
                  }}
                  initialValues={{
                    ...(preLlenado ? extractOpMappings(det.jsonSchema ?? '', preLlenado as unknown as Record<string, unknown>) : {}),
                    ...(PREFILLED[det.id] ?? {}),
                    ...buildDetalleInitialValues(det.id, preLlenado),
                  }}
                  preLlenado={preLlenado}
                  onSave={handleSaveDetalle}
                  onFormData={handleFormData}
                  onRequestDerogar={(fk, bk, detalleId, fi, tx, gr) =>
                    setDerogTarget({ firmaKey: fk, blockKey: bk, detalleId, firmaInfo: fi, texto: tx, grupo: gr })
                  }
                  brId={id}
                />
              ))
            )}
          </div>
          {showAudit && canViewAudit && (
            <AuditPreviewPanel detalleIds={detallesProceso.map(d => d.id)} />
          )}
        </div>

        {/* ── BR finalizado banner ── */}
        {brFinalizado && (
          <div style={{
            margin: '0 0 12px', padding: '14px 20px',
            background: 'linear-gradient(135deg,#D1FAE5 0%,#A7F3D0 100%)',
            border: '1.5px solid #6EE7B7', borderRadius: 12,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, background: '#2D5D4A',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <i className="fa fa-check" style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#065F46', letterSpacing: '.01em' }}>
                Batch Record Finalizado
              </div>
              <div style={{ fontSize: 11.5, color: '#047857', marginTop: 2 }}>
                Todas las etapas completadas y firmadas. El documento está listo para imprimir.
              </div>
            </div>
            <button onClick={handlePrint}
              style={{
                background: '#065F46', color: '#fff', border: 'none', borderRadius: 10,
                padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                fontFamily: 'var(--f-sans)', letterSpacing: '.01em',
              }}>
              <i className="fa fa-print" /> Imprimir BR
            </button>
          </div>
        )}

        {/* ── Liberar Lote panel ── */}
        {brFinalizado && !readonly && (
          <div style={{ margin: '0 0 0', padding: '18px 20px', borderTop: '2px solid #DDD6FE', background: liberadoInfo ? 'linear-gradient(135deg,#F5F3FF 0%,#EDE9FE 100%)' : '#FAFAF9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: liberadoInfo ? '#7C3AED' : '#EDE9FE', display: 'grid', placeItems: 'center' }}>
                <i className="fa fa-certificate" style={{ color: liberadoInfo ? '#fff' : '#7C3AED', fontSize: 16 }} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: liberadoInfo ? '#5B21B6' : '#374151', letterSpacing: '.01em' }}>
                  {liberadoInfo ? 'Lote Liberado por Control de Calidad' : 'Liberación de Lote — Aprobación Final QA'}
                </div>
                <div style={{ fontSize: 11.5, color: liberadoInfo ? '#7C3AED' : '#94A3B8', marginTop: 2 }}>
                  {liberadoInfo
                    ? `${liberadoInfo.nombre} · ${liberadoInfo.cargo} · ${liberadoInfo.fecha} ${liberadoInfo.hora}`
                    : 'Requiere firma del Director de Calidad para autorizar la distribución del lote.'}
                </div>
              </div>
              {liberadoInfo ? (
                <span style={{ padding: '5px 16px', background: '#7C3AED', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 800, letterSpacing: '.06em' }}>
                  ✓ LIBERADO
                </span>
              ) : (
                <button
                  className="btn"
                  style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, fontFamily: 'var(--f-sans)' }}
                  onClick={() => setLiberarModal(true)}>
                  <i className="fa fa-certificate" /> Liberar Lote
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Footer actions ── */}
        <div className="br-footer">
          <span style={{ fontSize: 12, color: '#94A3B8', marginRight: 'auto', fontFamily: 'var(--f-mono)' }}>
            BR-{id} · {procesoInfo?.descripcion}
          </span>
          {!readonly && !cerradosProcesos.has(procesoActivo) && (
            <button
              className="btn btn-warning"
              style={{ fontSize: 12, opacity: allDetallesCurrentDone ? 1 : 0.5, cursor: allDetallesCurrentDone ? 'pointer' : 'not-allowed' }}
              title={allDetallesCurrentDone ? 'Cerrar esta etapa' : 'Complete todas las firmas de cierre antes de cerrar la etapa'}
              onClick={handleCerrarProceso}
              disabled={!allDetallesCurrentDone}>
              <i className="fa fa-lock" /> Cerrar Proceso
            </button>
          )}
          {!readonly && brFinalizado && mockProcesos.every(p => cerradosProcesos.has(p.id)) && (
            <button className="btn btn-danger" style={{ fontSize: 12 }} onClick={handleCerrarBatch}>
              <i className="fa fa-times-circle" /> Cerrar Batch
            </button>
          )}
          {brFinalizado && (
            <button onClick={handlePrint} className="btn btn-gray" style={{ fontSize: 12 }}>
              <i className="fa fa-print" /> Imprimir
            </button>
          )}
        </div>
      </div>

      {firmaModal && (
        <FirmaModal
          firma={{ texto: firmaModal.texto, grupo: firmaModal.grupo }}
          onConfirm={(info) => {
            const nextFirmados = { ...firmados, [firmaModal.firmaKey]: info }
            setFirmados(nextFirmados)
            try { localStorage.setItem(`br_firmados_${id}`, JSON.stringify(nextFirmados)) } catch {}
            // Recalculate progress and update the mock BR entry
            const totalFirmas = DETALLE_STRUCT.reduce((n, d) => n + getFirmasDeEstrategia(d.idEstrategiaFirma).length, 0)
            const doneFirmas  = DETALLE_STRUCT.reduce((n, d) =>
              n + getFirmasDeEstrategia(d.idEstrategiaFirma).filter(f => !!nextFirmados[`cie:${d.id}:${f.idFirma}`]).length, 0)
            const pct = totalFirmas > 0 ? Math.round((doneFirmas / totalFirmas) * 100) : 0
            const brIdx = mockBatchRecords.findIndex(b => b.idBatchRecord === Number(id))
            if (brIdx >= 0) mockBatchRecords[brIdx].porcentajeAvance = pct
            const detalleId = Number(firmaModal.firmaKey.split(':')[1])
            const det = DETALLE_STRUCT.find(d => d.id === detalleId)
            registrar({
              entidad: firmaModal.tipo === 'cierre' ? 'FirmaCierre' : 'FirmaSeccion',
              idEntidad: detalleId,
              descripcionEntidad: det?.descripcion ?? `Detalle ${detalleId}`,
              accion: firmaModal.tipo === 'cierre' ? 'FIRMAR_CIERRE' : 'FIRMAR_SECCION',
              modulo: 'batch-record',
              firmante: {
                idUsuario: info.idUsuario,
                nombreUsuario: info.nombre,
                loginUsuario: info.loginUsuario,
                cargo: info.cargo,
              },
            })
            setFirmaModal(null)
          }}
          onClose={() => setFirmaModal(null)}
        />
      )}

      {liberarModal && !liberadoInfo && (
        <FirmaModal
          firma={{ texto: 'Liberación oficial del lote para distribución. Director de Control de Calidad', grupo: 'Director de Calidad' }}
          onConfirm={(info) => {
            setLiberadoInfo(info)
            try { localStorage.setItem(`br_liberado_${id}`, JSON.stringify(info)) } catch {}
            const brIdx = mockBatchRecords.findIndex(b => b.idBatchRecord === Number(id))
            if (brIdx >= 0) mockBatchRecords[brIdx].idEstado = 4
            registrar({
              entidad: 'BatchRecord',
              idEntidad: Number(id),
              descripcionEntidad: `BR-${id}`,
              accion: 'LIBERAR_LOTE',
              modulo: 'batch-record',
              firmante: { idUsuario: info.idUsuario, nombreUsuario: info.nombre, loginUsuario: info.loginUsuario, cargo: info.cargo },
            })
            setLiberarModal(false)
          }}
          onClose={() => setLiberarModal(false)}
        />
      )}

      {derogTarget && (
        <DerogacionModal
          firmaInfo={derogTarget.firmaInfo}
          texto={derogTarget.texto}
          grupo={derogTarget.grupo}
          onConfirm={handleDerogar}
          onClose={() => setDerogTarget(null)}
        />
      )}
    </>
  )
}