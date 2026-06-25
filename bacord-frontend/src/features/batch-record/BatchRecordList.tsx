import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { batchRecordApi } from '@/api/batchRecord'
import { Panel } from '@/components/shared/Panel'
import { DataTable, type Column } from '@/components/shared/DataTable'
import type { BatchRecord } from '@/types'
import { mockOrdenes, mockBatchRecords } from '@/api/mock'
import { useAudit } from '@/hooks/useAudit'

const estadoCfg: Record<number, { label: string; bg: string; color: string; dot: string }> = {
  1: { label: 'En Tratamiento', bg: '#DBEAFE', color: '#1D4ED8', dot: '#3B82F6' },
  2: { label: 'Finalizado',     bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
  3: { label: 'Cancelado',      bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
  4: { label: 'Liberado',       bg: '#EDE9FE', color: '#5B21B6', dot: '#7C3AED' },
}

export function BatchRecordList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { registrar } = useAudit()
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [confirmCancel, setConfirmCancel] = useState<BatchRecord | null>(null)
  const [cancelMotivo, setCancelMotivo] = useState('')

  // Carga automática al montar
  const { data = [], isLoading } = useQuery({
    queryKey: ['batch-records'],
    queryFn: () => batchRecordApi.buscar(),
  })

  const filtered = data.filter(r => {
    const orden = mockOrdenes.find(o => o.idOrdenProceso === r.idOrdenProceso)
    const text = `${r.idBatchRecord} ${r.idFormulaControl} ${orden?.codigoMaterial ?? ''} ${orden?.descripcionMaterial ?? ''} ${r.fechaCreacion}`.toLowerCase()
    const matchText = !search || text.includes(search.toLowerCase())
    const matchEstado = !estadoFilter || r.idEstado === Number(estadoFilter)
    return matchText && matchEstado
  })

  const columns: Column<BatchRecord>[] = [
    {
      key: 'idBatchRecord', header: 'Batch Record', width: '9%', sortable: true,
      render: r => <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, color: 'var(--navy)' }}>BR-{r.idBatchRecord}</span>,
    },
    {
      key: 'idOrdenProceso', header: 'Orden de Proceso', width: '10%',
      render: r => {
        const o = mockOrdenes.find(x => x.idOrdenProceso === r.idOrdenProceso)
        return <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12 }}>{o?.numeroOrdenProceso ?? `OP-${r.idOrdenProceso}`}</span>
      },
    },
    {
      key: 'material', header: 'Material',
      render: r => {
        const o = mockOrdenes.find(x => x.idOrdenProceso === r.idOrdenProceso)
        return o ? (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{o.descripcionMaterial}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', marginTop: 1 }}>{o.codigoMaterial} · {o.loteLogistico}</div>
          </div>
        ) : '—'
      },
    },
    {
      key: 'idEstado', header: 'Estado', width: '11%',
      render: r => {
        const cfg = estadoCfg[r.idEstado] ?? estadoCfg[1]
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700,
            padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
            {cfg.label}
          </span>
        )
      },
    },
    {
      key: 'porcentajeAvance', header: 'Avance', width: '130px',
      render: r => {
        const pct = r.porcentajeAvance ?? 0
        const color = pct === 100 ? '#10B981' : pct > 50 ? '#3B82F6' : '#F59E0B'
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 400ms' }} />
            </div>
            <span style={{ fontSize: 11.5, fontFamily: 'var(--f-mono)', color: 'var(--ink-3)', minWidth: 30, textAlign: 'right' }}>{pct}%</span>
          </div>
        )
      },
    },
    { key: 'fechaCreacion', header: 'Creación', width: '9%', sortable: true,
      render: r => <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{r.fechaCreacion}</span> },
    {
      key: 'acciones', header: '', width: '96px', align: 'center',
      render: r => (
        <div className="dt-act">
          {r.idEstado === 1 && (
            <button className="dt-ab" title="Diligenciar batch record"
              style={{ color: '#0284C7' }}
              onClick={() => navigate(`/batch-records/${r.idBatchRecord}/editar`)}>
              <i className="fa fa-pencil-alt" />
            </button>
          )}
          <button className="dt-ab dt-ab-edit" title="Consultar"
            onClick={() => navigate(`/batch-records/${r.idBatchRecord}/consultar`)}>
            <i className="fa fa-eye" />
          </button>
          {r.idEstado === 1 && (
            <button className="dt-ab dt-ab-del" title="Cancelar batch record"
              onClick={() => setConfirmCancel(r)}>
              <i className="fa fa-ban" />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      {/* Barra de filtros inline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <i className="fa fa-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', fontSize: 12 }} />
          <input
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 36, border: '1.5px solid var(--hair-2)', borderRadius: 'var(--r-sm)', fontSize: 13, fontFamily: 'var(--f-sans)', outline: 'none', background: '#fff', color: 'var(--ink)' }}
            placeholder="Buscar por BR, orden, material…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          style={{ height: 36, padding: '0 12px', border: '1.5px solid var(--hair-2)', borderRadius: 'var(--r-sm)', fontSize: 13, fontFamily: 'var(--f-sans)', outline: 'none', background: '#fff', color: 'var(--ink)', minWidth: 160 }}
          value={estadoFilter}
          onChange={e => setEstadoFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="1">En Tratamiento</option>
          <option value="2">Finalizado</option>
          <option value="3">Cancelado</option>
          <option value="4">Liberado</option>
        </select>
        {(search || estadoFilter) && (
          <button className="btn btn-gray" style={{ height: 36, padding: '0 12px' }}
            onClick={() => { setSearch(''); setEstadoFilter('') }}>
            <i className="fa fa-times" /> Limpiar
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--ink-4)' }}>
          {filtered.length} de {data.length} registros
        </span>
      </div>

      <Panel title="Batch Records">
        <div className="table-responsive">
          <DataTable<BatchRecord> columns={columns} data={filtered} loading={isLoading} />
        </div>
      </Panel>

      {/* Modal confirmación cancelar */}
      {confirmCancel && (
        <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(10,21,48,.45)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}
          onClick={() => { setConfirmCancel(null); setCancelMotivo('') }}>
          <div style={{ background:'var(--paper)',borderRadius:'var(--r-xl)',boxShadow:'var(--sh-3)',width:'100%',maxWidth:440 }} onClick={e => e.stopPropagation()}>
            <div style={{ background:'#7C2D12',borderRadius:'var(--r-xl) var(--r-xl) 0 0',padding:'14px 22px',display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.12)',display:'grid',placeItems:'center' }}>
                <i className="fa fa-ban" style={{ color:'#FCA5A5',fontSize:14 }} />
              </div>
              <div style={{ flex:1,color:'#fff',fontWeight:700,fontSize:14 }}>Cancelar Batch Record</div>
              <button style={{ background:'rgba(255,255,255,.1)',border:'none',cursor:'pointer',color:'#fff',width:28,height:28,borderRadius:7,fontSize:16,display:'grid',placeItems:'center' }}
                onClick={() => { setConfirmCancel(null); setCancelMotivo('') }}>×</button>
            </div>
            <div style={{ padding:'18px 22px',fontSize:14,color:'var(--ink-2)',lineHeight:1.6 }}>
              ¿Está seguro que desea cancelar <strong>BR-{confirmCancel.idBatchRecord}</strong>? Esta acción no se puede deshacer y el registro quedará bloqueado.
            </div>
            <div style={{ padding:'0 22px 18px' }}>
              <label style={{ display:'block',fontSize:12.5,fontWeight:600,color:'var(--ink-2)',marginBottom:6 }}>
                Motivo de cancelación <span style={{ color:'#DC2626',fontWeight:400 }}>(requerido)</span>
              </label>
              <textarea
                className="form-control"
                rows={3}
                value={cancelMotivo}
                onChange={e => setCancelMotivo(e.target.value)}
                placeholder="Describa el motivo para cancelar este batch record…"
                style={{ resize:'vertical' }}
              />
            </div>
            <div style={{ padding:'14px 22px',borderTop:'1px solid var(--hair)',display:'flex',justifyContent:'flex-end',gap:8 }}>
              <button className="btn btn-gray" onClick={() => { setConfirmCancel(null); setCancelMotivo('') }}>
                <i className="fa fa-undo" /> Volver
              </button>
              <button className="btn btn-danger" disabled={!cancelMotivo.trim()}
                onClick={() => {
                  if (!cancelMotivo.trim()) return
                  const idx = mockBatchRecords.findIndex(b => b.idBatchRecord === confirmCancel.idBatchRecord)
                  if (idx >= 0) {
                    mockBatchRecords[idx].idEstado = 3
                    mockBatchRecords[idx].motivoEstado = cancelMotivo.trim()
                  }
                  registrar({
                    entidad: 'BatchRecord',
                    idEntidad: confirmCancel.idBatchRecord,
                    descripcionEntidad: `BR-${confirmCancel.idBatchRecord}`,
                    accion: 'CANCELAR',
                    modulo: 'batch-records',
                    motivo: cancelMotivo.trim(),
                  })
                  queryClient.invalidateQueries({ queryKey: ['batch-records'] })
                  setConfirmCancel(null)
                  setCancelMotivo('')
                }}>
                <i className="fa fa-ban" /> Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
