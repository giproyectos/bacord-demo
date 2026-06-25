import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Panel } from '@/components/shared/Panel'
import { ordenProcesoApi } from '@/api/ordenProceso'
import { formulaControlApi } from '@/api/formulaControl'
import { mockFormulasControl, mockRecetas, mockBatchRecords } from '@/api/mock'
import type { OrdenProceso, ComponenteOrden, FormulaControl, RecetaMaestra } from '@/types'

const ESTADO_FC: Record<number, { label: string; bg: string; color: string }> = {
  1: { label: 'En Tratamiento', bg: '#FEF3C7', color: '#92400E' },
  2: { label: 'Enviada',        bg: '#D1FAE5', color: '#065F46' },
  3: { label: 'Cancelada',      bg: '#FEE2E2', color: '#991B1B' },
}

const ESTADO_OP: Record<number, { label: string; bg: string; color: string }> = {
  1: { label: 'Liberada',   bg: 'rgba(209,250,229,0.15)', color: '#6EE7B7' },
  2: { label: 'En Proceso', bg: 'rgba(254,243,199,0.15)', color: '#FCD34D' },
  3: { label: 'Cerrada',    bg: 'rgba(241,245,249,0.15)', color: '#94A3B8' },
}

function MetaItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ padding: '10px 18px', borderRight: '1px solid rgba(10,21,48,0.06)', flexShrink: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase',
        letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1530',
        fontFamily: mono ? 'var(--f-mono)' : 'var(--f-sans)' }}>{value || '—'}</div>
    </div>
  )
}

export function OrdenProcesoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [op, setOp] = useState<OrdenProceso | null>(null)
  const [componentes, setComponetes] = useState<ComponenteOrden[]>([])
  const [receta, setReceta] = useState<RecetaMaestra | null>(null)
  const [fcExistente, setFcExistente] = useState<FormulaControl | null>(null)
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [errorFC, setErrorFC] = useState('')

  useEffect(() => {
    if (!id) return
    const idNum = Number(id)
    Promise.all([
      ordenProcesoApi.find(idNum),
      ordenProcesoApi.getComponentes(idNum),
    ]).then(([op, comps]) => {
      setOp(op)
      setComponetes(comps)
      const rm = mockRecetas.find(r => r.idRecetaMaestra === op.idRecetaMaestra) ?? null
      setReceta(rm)
      const fc = mockFormulasControl.find(f => f.idOrdenProceso === idNum && f.idEstado !== 3) ?? null
      setFcExistente(fc)
    }).finally(() => setLoading(false))
  }, [id])

  const crearFC = async () => {
    if (!op) return
    setCreando(true)
    setErrorFC('')
    try {
      const fc = await formulaControlApi.crear(op.idOrdenProceso)
      navigate(`/formulas-control/${fc.idFormulaControl}`)
    } catch (e) {
      setErrorFC(e instanceof Error ? e.message : 'Error al crear la Fórmula de Control')
    } finally {
      setCreando(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #E2E8F0', borderTopColor: '#0A2D63',
        borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!op) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
      Orden de proceso no encontrada.
    </div>
  )

  const fcCfg = fcExistente ? (ESTADO_FC[fcExistente.idEstado] ?? ESTADO_FC[1]) : null

  return (
    <>
      <style>{`
        .op-det-card { background:#fff; border-radius:14px; border:1px solid rgba(10,21,48,0.08);
          box-shadow:0 2px 12px rgba(10,21,48,0.06); margin-bottom:16px; overflow:hidden; }
        .op-comp-table { width:100%; border-collapse:collapse; font-size:12.5px; }
        .op-comp-table th { background:#F4F3EE; padding:7px 12px; text-align:left;
          font-size:10px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:.07em; }
        .op-comp-table td { padding:8px 12px; border-top:1px solid rgba(10,21,48,0.05); color:#334155; }
        .op-comp-table tr:hover td { background:#FAFAF8; }
      `}</style>

      {/* Header strip */}
      <div className="op-det-card" style={{ background: 'linear-gradient(135deg,#0A2D63 0%,#0D3575 100%)', borderRadius: 14 }}>
        <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/ordenes-proceso')}
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8, padding: '6px 14px', color: '#fff', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <i className="fa fa-arrow-left" style={{ fontSize: 10 }} /> Volver
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 800, fontSize: 15,
                color: '#FCD34D', letterSpacing: '0.04em' }}>{op.numeroOrdenProceso}</span>
              <span style={{ padding: '2px 10px', background: 'rgba(255,255,255,0.15)',
                borderRadius: 20, fontSize: 11, color: '#BAE6FD', fontWeight: 600 }}>
                {op.formaFarmaceutica}
              </span>
              {(() => { const cfg = ESTADO_OP[op.idEstado] ?? ESTADO_OP[1]; return (
                <span style={{ padding: '2px 10px', background: cfg.bg,
                  borderRadius: 20, fontSize: 11, color: cfg.color, fontWeight: 700,
                  border: `1px solid ${cfg.color}33` }}>
                  {cfg.label}
                </span>
              ) })()}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              {op.descripcionMaterial}
            </div>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>Cantidad</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'var(--f-mono)' }}>
              {op.cantidadOrden.toLocaleString('es-CO')} <span style={{ fontSize: 13, fontWeight: 400 }}>{op.unidadMedida}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata grid */}
      <div className="op-det-card">
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          <MetaItem label="Código Material"    value={op.codigoMaterial}       mono />
          <MetaItem label="Lote Logístico"     value={op.loteLogistico}        mono />
          <MetaItem label="Lote Inspección"    value={op.loteInspeccion}       mono />
          <MetaItem label="Fecha Fabricación"  value={op.fechaFabricacion}     mono />
          <MetaItem label="Fecha Caducidad"    value={op.fechaCaducidad}       mono />
          <MetaItem label="Registro Sanitario" value={op.registroSanitario}    mono />
          <MetaItem label="Centro"             value={op.centro} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Receta Maestra */}
        <div className="op-det-card" style={{ flex: 1 }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(10,21,48,0.07)',
            fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.07em' }}>
            Receta Maestra
          </div>
          {receta ? (
            <div style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 800, color: '#0A2D63', fontSize: 14 }}>
                  {receta.codigo}
                </span>
                <span style={{ padding: '2px 8px', background: '#D1FAE5', color: '#065F46',
                  borderRadius: 20, fontSize: 10.5, fontWeight: 700 }}>
                  v{receta.version}
                </span>
                <span style={{ padding: '2px 8px', background: '#D1FAE5', color: '#065F46',
                  borderRadius: 20, fontSize: 10.5, fontWeight: 700 }}>
                  {receta.estado}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#334155', marginBottom: 6 }}>{receta.descripcion}</div>
              <div style={{ fontSize: 11.5, color: '#64748B' }}>
                <i className="fa fa-layer-group" style={{ marginRight: 5 }} />{receta.procesos}
              </div>
              <Link to={`/recetas-maestras/${receta.idRecetaMaestra}/configurar`}
                style={{ fontSize: 11.5, color: '#0A2D63', marginTop: 8, display: 'inline-block' }}>
                Ver receta <i className="fa fa-external-link-alt" style={{ fontSize: 9 }} />
              </Link>
            </div>
          ) : (
            <div style={{ padding: '16px 18px', color: '#F59E0B', fontSize: 13 }}>
              <i className="fa fa-exclamation-triangle" style={{ marginRight: 6 }} />
              Sin Receta Maestra vinculada para <strong>{op.codigoMaterial}</strong>
            </div>
          )}
        </div>

        {/* Fórmula de Control */}
        <div className="op-det-card" style={{ flex: 1 }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(10,21,48,0.07)',
            fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.07em' }}>
            Fórmula de Control
          </div>
          <div style={{ padding: '14px 18px' }}>
            {fcExistente ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 800, color: '#0A2D63', fontSize: 14 }}>
                    FC-{fcExistente.idFormulaControl}
                  </span>
                  {fcCfg && (
                    <span style={{ padding: '2px 8px', background: fcCfg.bg, color: fcCfg.color,
                      borderRadius: 20, fontSize: 10.5, fontWeight: 700 }}>{fcCfg.label}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
                  Creada: {new Date(fcExistente.fechaCreacion).toLocaleDateString('es-CO')}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link to={`/formulas-control/${fcExistente.idFormulaControl}`}
                    className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa fa-eye" /> Ver fórmula de control
                  </Link>
                  {(() => {
                    const br = mockBatchRecords.find(b => b.idOrdenProceso === fcExistente.idOrdenProceso)
                    return br ? (
                      <Link to={`/batch-records/${br.idBatchRecord}/editar`}
                        className="btn btn-gray" style={{ fontSize: 12, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <i className="fa fa-file-alt" /> BR-{br.idBatchRecord}
                      </Link>
                    ) : null
                  })()}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: '#64748B', marginBottom: 14 }}>
                  No hay fórmula de control activa para esta orden.
                </div>
                <button className="btn btn-primary" onClick={crearFC} disabled={!receta || creando}
                  title={!receta ? 'Se requiere una Receta Maestra vinculada' : ''}>
                  {creando
                    ? <><i className="fa fa-spinner fa-spin" /> Creando...</>
                    : <><i className="fa fa-plus" /> Crear Fórmula de Control</>}
                </button>
                {!receta && (
                  <div style={{ fontSize: 11.5, color: '#92400E', marginTop: 8 }}>
                    <i className="fa fa-info-circle" style={{ marginRight: 4 }} />
                    Requiere Receta Maestra vinculada
                  </div>
                )}
                {errorFC && (
                  <div style={{ fontSize: 12, color: '#991B1B', background: '#FEF2F2',
                    border: '1px solid #FECACA', borderRadius: 6, padding: '7px 10px', marginTop: 8,
                    display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa fa-exclamation-circle" />{errorFC}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Componentes */}
      <Panel title={
        <><i className="fa fa-cubes" /> Componentes ({componentes.length})</>
      }>
        {componentes.length === 0 ? (
          <div style={{ color: '#94A3B8', fontSize: 13, fontStyle: 'italic' }}>
            Sin componentes registrados para esta orden.
          </div>
        ) : (
          <table className="op-comp-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th style={{ textAlign: 'right' }}>Cant. Teórica</th>
                <th>UM</th>
                <th>Lote</th>
                <th>Lista Materiales</th>
              </tr>
            </thead>
            <tbody>
              {componentes.map(c => (
                <tr key={c.idComponente}>
                  <td style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, color: '#0A2D63' }}>
                    {c.codigoMaterialComponente}
                  </td>
                  <td>{c.descripcionMaterialComponente}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--f-mono)', fontWeight: 600 }}>
                    {c.cantidad.toLocaleString('es-CO', { maximumFractionDigits: 4 })}
                  </td>
                  <td>{c.unidadMedida}</td>
                  <td style={{ fontFamily: 'var(--f-mono)', color: '#64748B' }}>{c.loteComponente}</td>
                  <td style={{ fontFamily: 'var(--f-mono)', color: '#64748B' }}>{c.codigoListaMateriales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  )
}
