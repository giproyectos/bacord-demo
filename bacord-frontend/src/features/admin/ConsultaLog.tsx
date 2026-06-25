import { useState, useMemo } from 'react'
import { Panel } from '@/components/shared/Panel'
import { useAuditStore } from '@/stores/auditStore'
import type { AuditEntry, AuditAccion } from '@/types/audit'

// ── Helpers ───────────────────────────────────────────────────────────────
const ACCION_CFG: Record<AuditAccion, { label: string; bg: string; color: string }> = {
  CREAR:          { label: 'Creación',      bg: '#D1FAE5', color: '#065F46' },
  MODIFICAR:      { label: 'Modificación',  bg: '#DBEAFE', color: '#1D4ED8' },
  CANCELAR:       { label: 'Cancelación',   bg: '#FEE2E2', color: '#991B1B' },
  FIRMAR_SECCION: { label: 'Firma Sección', bg: '#EDE9FE', color: '#5B21B6' },
  FIRMAR_CIERRE:  { label: 'Firma Cierre',  bg: '#EDE9FE', color: '#5B21B6' },
  DEROGAR_FIRMA:  { label: 'Derogación',    bg: '#FEF3C7', color: '#92400E' },
  LIBERAR_LOTE:   { label: 'Liberación',    bg: '#EDE9FE', color: '#5B21B6' },
  LOGIN:          { label: 'Acceso',        bg: '#F1F5F9', color: '#475569' },
  LOGIN_FALLIDO:  { label: 'Acceso fallido',bg: '#FEE2E2', color: '#991B1B' },
  LOGOUT:         { label: 'Cierre sesión', bg: '#F1F5F9', color: '#475569' },
}

function formatTs(ts: string) {
  const d = new Date(ts)
  const fecha = d.toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' })
  const hora  = d.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
  return { fecha, hora, dateStr: d.toISOString().split('T')[0] }
}

function AccionBadge({ accion }: { accion: AuditAccion }) {
  const cfg = ACCION_CFG[accion]
  return (
    <span style={{ display:'inline-block',padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:700,
      background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

// ── Detail modal ──────────────────────────────────────────────────────────
function DetalleModal({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const { fecha, hora } = formatTs(entry.timestamp)
  return (
    <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(10,21,48,.5)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}
      onClick={onClose}>
      <div style={{ background:'var(--paper)',borderRadius:12,boxShadow:'var(--sh-3)',
        width:'100%',maxWidth:660,maxHeight:'82vh',overflow:'hidden',display:'flex',flexDirection:'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:'var(--navy)',borderRadius:'12px 12px 0 0',padding:'14px 22px',
          display:'flex',alignItems:'center',gap:12,flexShrink:0 }}>
          <i className="fa fa-history" style={{ color:'var(--yellow)',fontSize:15 }} />
          <div style={{ flex:1,color:'#fff',fontWeight:700,fontSize:14 }}>Detalle de auditoría</div>
          <button style={{ background:'rgba(255,255,255,.1)',border:'none',cursor:'pointer',
            color:'#fff',width:28,height:28,borderRadius:7,fontSize:16,display:'grid',placeItems:'center' }}
            onClick={onClose}>×</button>
        </div>

        {/* Meta chips */}
        <div style={{ padding:'14px 22px',background:'var(--paper-2)',borderBottom:'1px solid var(--hair)',
          display:'flex',flexWrap:'wrap',gap:14,flexShrink:0 }}>
          {[
            { lbl:'Fecha/Hora',   val:`${fecha} ${hora}` },
            { lbl:'Usuario',      val:entry.loginUsuario },
            { lbl:'Nombre',       val:entry.nombreUsuario },
            { lbl:'Cargo',        val:entry.cargo },
            { lbl:'Módulo',       val:entry.modulo },
            { lbl:'Entidad',      val:`${entry.entidad} #${entry.idEntidad}` },
            { lbl:'Descripción',  val:entry.descripcionEntidad },
          ].map(({ lbl, val }) => (
            <div key={lbl}>
              <div style={{ fontSize:10,color:'var(--ink-4)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:2 }}>{lbl}</div>
              <div style={{ fontSize:12.5,fontWeight:600,color:'var(--ink-2)' }}>{val}</div>
            </div>
          ))}
          <div>
            <div style={{ fontSize:10,color:'var(--ink-4)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:2 }}>Acción</div>
            <AccionBadge accion={entry.accion} />
          </div>
        </div>

        {/* Motivo */}
        {entry.motivo && (
          <div style={{ padding:'10px 22px',background:'#FEF3C7',borderBottom:'1px solid var(--hair)',
            display:'flex',gap:8,alignItems:'flex-start',flexShrink:0 }}>
            <i className="fa fa-comment-alt" style={{ color:'#D97706',marginTop:2,flexShrink:0 }} />
            <div>
              <div style={{ fontSize:10.5,fontWeight:600,color:'#92400E',textTransform:'uppercase',letterSpacing:'.05em' }}>Motivo / Justificación</div>
              <div style={{ fontSize:13,color:'#78350F',marginTop:2 }}>{entry.motivo}</div>
            </div>
          </div>
        )}

        {/* Cambios */}
        <div style={{ flex:1,overflowY:'auto' }}>
          {entry.cambios && entry.cambios.length > 0 ? (
            <div style={{ padding:'16px 22px' }}>
              <div style={{ fontSize:11,fontWeight:700,color:'var(--ink-4)',textTransform:'uppercase',
                letterSpacing:'.08em',marginBottom:10 }}>
                Campos modificados ({entry.cambios.length})
              </div>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12.5 }}>
                <thead>
                  <tr style={{ background:'var(--paper-2)' }}>
                    {['Campo','Valor anterior','Valor nuevo'].map(h => (
                      <th key={h} style={{ padding:'7px 10px',textAlign:'left',fontSize:11,fontWeight:700,
                        color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.06em',
                        borderBottom:'2px solid var(--hair-2)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entry.cambios.map((c, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid var(--hair)',
                      background: i % 2 === 0 ? 'transparent' : 'var(--paper-2)' }}>
                      <td style={{ padding:'7px 10px',fontWeight:600,color:'var(--ink-2)' }}>{c.etiqueta}</td>
                      <td style={{ padding:'7px 10px',color:'#DC2626',fontFamily:'var(--f-mono)',fontSize:12 }}>
                        {c.valorAnterior || <span style={{ color:'var(--ink-4)',fontStyle:'italic' }}>vacío</span>}
                      </td>
                      <td style={{ padding:'7px 10px',color:'#059669',fontFamily:'var(--f-mono)',fontSize:12 }}>
                        {c.valorNuevo || <span style={{ color:'var(--ink-4)',fontStyle:'italic' }}>vacío</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding:'24px 22px',textAlign:'center',color:'var(--ink-4)',fontSize:13 }}>
              Sin cambios de campo para este evento.
            </div>
          )}
        </div>

        <div style={{ padding:'12px 22px',borderTop:'1px solid var(--hair)',display:'flex',
          justifyContent:'flex-end',flexShrink:0 }}>
          <button className="btn btn-gray" onClick={onClose}><i className="fa fa-times" /> Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ── ConsultaLog ───────────────────────────────────────────────────────────
const DATA_ACCIONES: AuditAccion[] = ['CREAR','MODIFICAR','CANCELAR','FIRMAR_SECCION','FIRMAR_CIERRE','DEROGAR_FIRMA','LIBERAR_LOTE']
const SESION_ACCIONES: AuditAccion[] = ['LOGIN','LOGIN_FALLIDO','LOGOUT']

function LogTable({ acciones, emptyMsg }: { acciones: AuditAccion[]; emptyMsg: string }) {
  const entries = useAuditStore(s => s.entries)
  const today   = new Date().toISOString().split('T')[0]

  const [filtros, setFiltros] = useState({
    accion: '', usuario: '', entidad: '', fechaInicial: today, fechaFinal: today, buscarTodo: false,
  })
  const [selected, setSelected] = useState<AuditEntry | null>(null)

  const base = entries.filter(e => acciones.includes(e.accion))

  const usuarios = useMemo(() => [...new Set(base.map(e => e.loginUsuario))].sort(), [base])
  const entidades = useMemo(() => [...new Set(base.map(e => e.entidad))].sort(), [base])

  const filtered = useMemo(() => {
    return base.filter(e => {
      const { dateStr } = formatTs(e.timestamp)
      if (filtros.accion  && e.accion        !== filtros.accion)  return false
      if (filtros.usuario && e.loginUsuario   !== filtros.usuario) return false
      if (filtros.entidad && e.entidad        !== filtros.entidad) return false
      if (!filtros.buscarTodo) {
        if (dateStr < filtros.fechaInicial || dateStr > filtros.fechaFinal) return false
      }
      return true
    })
  }, [base, filtros])

  const thStyle: React.CSSProperties = {
    padding:'8px 12px',textAlign:'left',fontSize:11,fontWeight:700,
    color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',
    borderBottom:'2px solid var(--hair-2)',background:'var(--paper-2)',whiteSpace:'nowrap',
  }
  const tdStyle: React.CSSProperties = { padding:'8px 12px',verticalAlign:'middle',borderBottom:'1px solid var(--hair)' }

  return (
    <>
      {/* Filtros */}
      <Panel title={<><i className="fa fa-filter" /> Filtros</>} collapsible>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:12 }}>
          <div>
            <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--ink-3)',marginBottom:4 }}>Acción</label>
            <select className="form-control input-sm" value={filtros.accion}
              onChange={e => setFiltros(f => ({ ...f, accion: e.target.value }))}>
              <option value="">Todas las acciones</option>
              {acciones.map(a => <option key={a} value={a}>{ACCION_CFG[a].label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--ink-3)',marginBottom:4 }}>Usuario</label>
            <select className="form-control input-sm" value={filtros.usuario}
              onChange={e => setFiltros(f => ({ ...f, usuario: e.target.value }))}>
              <option value="">Todos los usuarios</option>
              {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--ink-3)',marginBottom:4 }}>Entidad</label>
            <select className="form-control input-sm" value={filtros.entidad}
              onChange={e => setFiltros(f => ({ ...f, entidad: e.target.value }))}>
              <option value="">Todas las entidades</option>
              {entidades.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--ink-3)',marginBottom:4 }}>Fecha inicial</label>
            <input type="date" className="form-control input-sm" value={filtros.fechaInicial}
              disabled={filtros.buscarTodo}
              onChange={e => setFiltros(f => ({ ...f, fechaInicial: e.target.value }))} />
          </div>
          <div>
            <label style={{ display:'block',fontSize:12,fontWeight:600,color:'var(--ink-3)',marginBottom:4 }}>Fecha final</label>
            <input type="date" className="form-control input-sm" value={filtros.fechaFinal}
              disabled={filtros.buscarTodo}
              onChange={e => setFiltros(f => ({ ...f, fechaFinal: e.target.value }))} />
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <label style={{ display:'flex',alignItems:'center',gap:6,fontSize:13,cursor:'pointer',color:'var(--ink-2)' }}>
            <input type="checkbox" checked={filtros.buscarTodo}
              onChange={e => setFiltros(f => ({ ...f, buscarTodo: e.target.checked }))} />
            Mostrar todo el historial
          </label>
          <button className="btn btn-gray" style={{ marginLeft:'auto' }}
            onClick={() => setFiltros({ accion:'', usuario:'', entidad:'', fechaInicial:today, fechaFinal:today, buscarTodo:false })}>
            <i className="fa fa-undo" /> Limpiar
          </button>
        </div>
      </Panel>

      {/* Tabla */}
      <Panel title={`Resultados — ${filtered.length} evento${filtered.length !== 1 ? 's' : ''}`}>
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center',padding:'32px 16px',color:'var(--ink-4)',fontSize:13 }}>
            {base.length === 0 ? emptyMsg : 'Sin resultados para los filtros aplicados.'}
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12.5 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Fecha / Hora</th>
                  <th style={thStyle}>Usuario</th>
                  <th style={thStyle}>Cargo</th>
                  <th style={thStyle}>Acción</th>
                  <th style={thStyle}>Entidad</th>
                  <th style={thStyle}>Descripción</th>
                  <th style={thStyle}>Motivo / Cambios</th>
                  <th style={{ ...thStyle, width:48 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const { fecha, hora } = formatTs(e.timestamp)
                  return (
                    <tr key={e.id}
                      style={{ background: i % 2 === 0 ? 'transparent' : 'var(--paper-2)',
                        cursor:'pointer', transition:'background 80ms' }}
                      onClick={() => setSelected(e)}>
                      <td style={tdStyle}>
                        <div style={{ fontFamily:'var(--f-mono)',fontSize:12,color:'var(--ink-2)',fontWeight:600 }}>{fecha}</div>
                        <div style={{ fontFamily:'var(--f-mono)',fontSize:11,color:'var(--ink-4)' }}>{hora}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight:600,color:'var(--ink)' }}>{e.loginUsuario}</div>
                        <div style={{ fontSize:11,color:'var(--ink-4)' }}>{e.nombreUsuario}</div>
                      </td>
                      <td style={{ ...tdStyle, fontSize:11.5,color:'var(--ink-3)' }}>{e.cargo}</td>
                      <td style={tdStyle}><AccionBadge accion={e.accion} /></td>
                      <td style={{ ...tdStyle, fontFamily:'var(--f-mono)',fontSize:11.5,color:'var(--ink-3)' }}>
                        <div>{e.entidad}</div>
                        <div style={{ color:'var(--ink-4)' }}>#{e.idEntidad}</div>
                      </td>
                      <td style={{ ...tdStyle, maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}
                        title={e.descripcionEntidad}>
                        {e.descripcionEntidad}
                      </td>
                      <td style={tdStyle}>
                        {e.motivo && (
                          <span style={{ fontSize:11,color:'#92400E',background:'#FEF3C7',
                            borderRadius:4,padding:'1px 6px',display:'inline-block',maxWidth:140,
                            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}
                            title={e.motivo}>
                            <i className="fa fa-comment-alt" style={{ marginRight:4 }} />{e.motivo}
                          </span>
                        )}
                        {e.cambios && e.cambios.length > 0 && (
                          <span style={{ fontSize:11,color:'#1D4ED8',background:'#DBEAFE',
                            borderRadius:4,padding:'1px 6px',display:'inline-block',marginTop: e.motivo ? 4 : 0 }}>
                            {e.cambios.length} campo{e.cambios.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign:'center' }}>
                        <button
                          style={{ background:'none',border:'1px solid var(--hair-2)',borderRadius:6,
                            padding:'3px 8px',cursor:'pointer',color:'var(--ink-3)',fontSize:11 }}
                          onClick={ev => { ev.stopPropagation(); setSelected(e) }}>
                          <i className="fa fa-eye" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {selected && <DetalleModal entry={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

export function ConsultaLog() {
  return <LogTable acciones={DATA_ACCIONES} emptyMsg="No hay eventos de auditoría registrados. Los eventos se generan al guardar, firmar, derogar o cancelar registros." />
}

export function LogAcceso() {
  return <LogTable acciones={SESION_ACCIONES} emptyMsg="No hay eventos de sesión registrados. Los accesos al sistema se registrarán aquí." />
}
