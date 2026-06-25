import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  Filler, Title,
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { mockBatchRecords, mockFormulasControl, mockOrdenes, mockRecetas, mockUsuarios } from '@/api/mock'

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  Filler, Title,
)

const C = {
  navy:   '#0A2D63',
  orange: '#FF6B35',
  forest: '#2D5D4A',
  teal:   '#2196A6',
  red:    '#DC2626',
  hair:   'rgba(10,21,48,0.08)',
}
const fontFamily = "'Geist', 'Inter', sans-serif"
const tooltipDefaults = {
  backgroundColor: C.navy,
  titleFont: { family: fontFamily, weight: 'bold' as const, size: 12 },
  bodyFont:  { family: fontFamily, size: 12 },
  padding: 10, cornerRadius: 8, displayColors: true, boxPadding: 4,
}
const legendDefaults = {
  labels: {
    font: { family: fontFamily, size: 12 }, color: '#2A3349',
    padding: 16, usePointStyle: true, pointStyleWidth: 10,
  },
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} día${days > 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  return `hace ${months} mes${months > 1 ? 'es' : ''}`
}

function monthKey(iso: string) {
  return iso.slice(0, 7) // 'YYYY-MM'
}

function shortMes(iso: string) {
  const d = new Date(iso + '-01')
  return d.toLocaleString('es-CO', { month: 'short' })
    .replace('.', '')
    .replace(/^\w/, c => c.toUpperCase())
}

export function DashboardPage() {
  // ── últimos 8 meses ────────────────────────────────────────────────────────
  const now = new Date()
  const meses: string[] = []
  const mesKeys: string[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    mesKeys.push(key)
    meses.push(shortMes(key))
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const brActivos    = mockBatchRecords.filter(br => br.idEstado === 1).length
  const brEsteMes    = mockBatchRecords.filter(br => monthKey(br.fechaCreacion) === mesKeys[7]).length
  const fcPendientes = mockFormulasControl.filter(fc => fc.idEstado === 1).length
  const totalOrdenes = mockOrdenes.length
  const recetasActivas = mockRecetas.filter(r => r.idEstado === 2).length

  const kpis = [
    { label: 'Batch Records activos',     value: brActivos,      sub: `+${brEsteMes} creado${brEsteMes !== 1 ? 's' : ''} este mes`,  icon: 'fa-clipboard-list', color: C.navy,   light: '#e8edf6' },
    { label: 'Fórmulas en Tratamiento',   value: fcPendientes,   sub: `${fcPendientes} pendiente${fcPendientes !== 1 ? 's' : ''} de envío`,                      icon: 'fa-flask',          color: C.orange, light: '#fff3ee' },
    { label: 'Órdenes de Proceso',        value: totalOrdenes,   sub: `${new Set(mockOrdenes.map(o => o.codigoMaterial)).size} materiales distintos`,            icon: 'fa-list-alt',       color: C.teal,   light: '#e3f5f8' },
    { label: 'Recetas Maestras activas',  value: recetasActivas, sub: mockRecetas.find(r => r.idEstado === 2)?.version ? `versión ${mockRecetas.find(r => r.idEstado === 2)!.version} vigente` : 'sin versión activa', icon: 'fa-book', color: C.forest, light: '#e8f2ed' },
  ]

  // ── Evolución mensual (BRs y FCs por mes) ─────────────────────────────────
  const brPorMes = mesKeys.map(k => mockBatchRecords.filter(br => monthKey(br.fechaCreacion) === k).length)
  const fcPorMes = mesKeys.map(k => mockFormulasControl.filter(fc => monthKey(fc.fechaCreacion) === k).length)

  // ── Estado BR (donut) ─────────────────────────────────────────────────────
  const cntTrat = mockBatchRecords.filter(br => br.idEstado === 1).length
  const cntFin  = mockBatchRecords.filter(br => br.idEstado === 2).length
  const cntCan  = mockBatchRecords.filter(br => br.idEstado === 3).length
  const cntLib  = mockBatchRecords.filter(br => br.idEstado === 4).length
  const totalBR = mockBatchRecords.length

  // ── EBR-specific KPIs ─────────────────────────────────────────────────────
  const brActivos2      = mockBatchRecords.filter(br => br.idEstado === 1)
  const avancePromedio  = brActivos2.length > 0
    ? Math.round(brActivos2.reduce((s, br) => s + (br.porcentajeAvance ?? 0), 0) / brActivos2.length)
    : 0
  const brFinalizados   = mockBatchRecords.filter(br => br.idEstado === 2 || br.idEstado === 4)
  const ultimoFinalizado = brFinalizados.length > 0
    ? (() => {
        const br = brFinalizados[brFinalizados.length - 1]
        const op = mockOrdenes.find(o => o.idOrdenProceso === br.idOrdenProceso)
        return { id: br.idBatchRecord, producto: op?.descripcionMaterial ?? '—', fecha: br.fechaCreacion }
      })()
    : null

  // ── BR por material ───────────────────────────────────────────────────────
  const matCount: Record<string, number> = {}
  mockBatchRecords.forEach(br => {
    const op = mockOrdenes.find(o => o.idOrdenProceso === br.idOrdenProceso)
    if (op) matCount[op.codigoMaterial] = (matCount[op.codigoMaterial] ?? 0) + 1
  })
  const matEntries = Object.entries(matCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const matColors = [C.navy, C.orange, C.teal, C.forest, '#8B5CF6', '#EC4899']

  // ── BR por centro ─────────────────────────────────────────────────────────
  const centroCount: Record<string, number> = {}
  mockBatchRecords.forEach(br => {
    const op = mockOrdenes.find(o => o.idOrdenProceso === br.idOrdenProceso)
    if (op) centroCount[op.centro] = (centroCount[op.centro] ?? 0) + 1
  })
  const centroEntries = Object.entries(centroCount).sort((a, b) => b[1] - a[1])
  const maxCentro = Math.max(...centroEntries.map(([, v]) => v), 1)

  // ── Actividad reciente ────────────────────────────────────────────────────
  const recent = [...mockBatchRecords]
    .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
    .slice(0, 5)
    .map(br => {
      const op   = mockOrdenes.find(o => o.idOrdenProceso === br.idOrdenProceso)
      const user = mockUsuarios.find(u => u.idUsuario === br.idUsuarioCreacion)
      const cfg  = { 1: { label: 'En Tratamiento', color: C.teal }, 2: { label: 'Finalizado', color: C.forest }, 3: { label: 'Cancelado', color: C.red } } as Record<number, { label: string; color: string }>
      return {
        texto:  `BR-${String(br.idBatchRecord).padStart(3, '0')} · ${op?.codigoMaterial ?? '—'}`,
        sub:    `${cfg[br.idEstado]?.label ?? '?'} · Por ${user?.login ?? 'sistema'}`,
        tiempo: relTime(br.fechaCreacion),
        color:  cfg[br.idEstado]?.color ?? C.navy,
      }
    })

  return (
    <>
      <style>{`
        .dash { display: flex; flex-direction: column; gap: 22px; }
        .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .kpi-card { background: #fff; border: 1px solid var(--hair-2); border-radius: var(--r-lg); padding: 18px 20px 16px; display: flex; align-items: flex-start; gap: 14px; box-shadow: 0 1px 4px rgba(10,21,48,.06); transition: box-shadow 140ms, transform 140ms; }
        .kpi-card:hover { box-shadow: var(--sh-2); transform: translateY(-2px); }
        .kpi-icon { width: 44px; height: 44px; border-radius: var(--r-md); display: grid; place-items: center; font-size: 18px; flex-shrink: 0; }
        .kpi-value { font-size: 28px; font-weight: 800; color: var(--ink); line-height: 1; letter-spacing: -1px; }
        .kpi-label { font-size: 12.5px; font-weight: 500; color: var(--ink-3); margin-top: 3px; }
        .kpi-sub   { font-size: 11px; font-family: var(--f-mono); color: var(--ink-4); margin-top: 6px; }
        .chart-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .chart-grid-3 { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
        .chart-card { background: #fff; border: 1px solid var(--hair-2); border-radius: var(--r-lg); padding: 20px 22px; box-shadow: 0 1px 4px rgba(10,21,48,.06); }
        .chart-title { font-size: 13px; font-weight: 700; color: var(--ink); margin-bottom: 4px; letter-spacing: -.01em; }
        .chart-sub   { font-size: 11px; color: var(--ink-4); margin-bottom: 18px; font-family: var(--f-mono); }
        .donut-wrap { position: relative; }
        .donut-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -58%); text-align: center; pointer-events: none; }
        .donut-center-val { font-size: 24px; font-weight: 800; color: var(--ink); line-height: 1; }
        .donut-center-lbl { font-size: 10px; font-family: var(--f-mono); color: var(--ink-4); letter-spacing: .08em; text-transform: uppercase; margin-top: 2px; }
        .centro-pills { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
        .centro-pill { display: flex; align-items: center; gap: 10px; }
        .centro-pill-bar-wrap { flex: 1; background: var(--paper-2,#f1f5f9); border-radius: 100px; height: 8px; overflow: hidden; }
        .centro-pill-bar { height: 100%; border-radius: 100px; }
        .centro-pill-label { font-size: 12px; color: var(--ink-2); font-weight: 500; width: 130px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .centro-pill-val { font-size: 12px; font-family: var(--f-mono); color: var(--ink-3); width: 28px; text-align: right; }
        .activity-list { display: flex; flex-direction: column; }
        .activity-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--hair); }
        .activity-item:last-child { border-bottom: none; }
        .activity-dot { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; flex-shrink: 0; margin-top: 1px; }
        .activity-body { flex: 1; min-width: 0; }
        .activity-text { font-size: 13px; font-weight: 600; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .activity-detail { font-size: 11.5px; color: var(--ink-4); margin-top: 1px; }
        .activity-time { font-size: 10.5px; font-family: var(--f-mono); color: var(--ink-4); white-space: nowrap; margin-top: 2px; }
      `}</style>

      <div className="dash">

        {/* KPI Cards */}
        <div className="kpi-row">
          {kpis.map(k => (
            <div key={k.label} className="kpi-card">
              <div className="kpi-icon" style={{ background: k.light, color: k.color }}>
                <i className={`fa ${k.icon}`} />
              </div>
              <div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-sub">{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Evolución mensual + Donut estado */}
        <div className="chart-grid-2">
          <div className="chart-card">
            <div className="chart-title">Evolución mensual</div>
            <div className="chart-sub">Batch Records y Fórmulas de Control · últimos 8 meses</div>
            <Line
              data={{
                labels: meses,
                datasets: [
                  { label: 'Batch Records', data: brPorMes, borderColor: C.navy,   backgroundColor: 'rgba(10,45,99,0.08)', borderWidth: 2.5, fill: true, tension: 0.4, pointBackgroundColor: C.navy,   pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4 },
                  { label: 'Fórmulas Control', data: fcPorMes, borderColor: C.orange, backgroundColor: 'rgba(255,107,53,0.07)', borderWidth: 2.5, fill: true, tension: 0.4, pointBackgroundColor: C.orange, pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4 },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { ...legendDefaults, position: 'top' as const }, tooltip: { ...tooltipDefaults } },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { family: fontFamily, size: 12 }, color: '#5B6478' } },
                  y: { beginAtZero: true, grid: { color: C.hair }, ticks: { font: { family: fontFamily, size: 11 }, color: '#8A8F9F', stepSize: 1 } },
                },
              }}
            />
          </div>

          <div className="chart-card">
            <div className="chart-title">Batch Records por estado</div>
            <div className="chart-sub">Distribución actual · {totalBR} total</div>
            <div className="donut-wrap">
              <Doughnut
                data={{
                  labels: ['En Tratamiento', 'Finalizado', 'Liberado', 'Cancelado'],
                  datasets: [{ data: [cntTrat, cntFin, cntLib, cntCan], backgroundColor: [C.teal, C.forest, '#7C3AED', C.red], borderColor: '#fff', borderWidth: 3, hoverOffset: 6 }],
                }}
                options={{
                  cutout: '68%',
                  plugins: { legend: { ...legendDefaults, position: 'bottom' as const }, tooltip: { ...tooltipDefaults } },
                }}
              />
              <div className="donut-center">
                <div className="donut-center-val">{totalBR}</div>
                <div className="donut-center-lbl">Total</div>
              </div>
            </div>
            {/* Mini EBR summary row */}
            <div style={{ display: 'flex', gap: 0, borderTop: '1px solid #F1F5F9', marginTop: 14, paddingTop: 12 }}>
              {[
                { lbl: 'En Proceso', val: cntTrat, color: C.teal },
                { lbl: 'Finalizados', val: cntFin, color: C.forest },
                { lbl: 'Liberados', val: cntLib, color: '#7C3AED' },
                { lbl: 'Cancelados', val: cntCan, color: C.red },
              ].map(({ lbl, val, color }) => (
                <div key={lbl} style={{ flex: 1, textAlign: 'center', padding: '0 4px' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1.1 }}>{val}</div>
                  <div style={{ fontSize: 9.5, color: '#94A3B8', fontFamily: 'var(--f-mono)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '.06em' }}>{lbl}</div>
                </div>
              ))}
            </div>
            {/* Avance promedio + último finalizado */}
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 100 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Avance Promedio</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${avancePromedio}%`, background: avancePromedio === 100 ? C.forest : C.teal, borderRadius: 3, transition: 'width 500ms' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.navy, fontFamily: 'var(--f-mono)', minWidth: 32 }}>{avancePromedio}%</span>
                </div>
                <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 3 }}>BRs en tratamiento ({brActivos2.length})</div>
              </div>
              {ultimoFinalizado && (
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Último Finalizado</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.forest, fontFamily: 'var(--f-mono)' }}>BR-{ultimoFinalizado.id}</div>
                  <div style={{ fontSize: 10.5, color: '#475569', marginTop: 1 }}>{ultimoFinalizado.producto}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'var(--f-mono)', marginTop: 1 }}>{ultimoFinalizado.fecha}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bar material + Centro + Actividad */}
        <div className="chart-grid-3">
          <div className="chart-card">
            <div className="chart-title">Batch Records por material</div>
            <div className="chart-sub">Acumulado · todos los estados</div>
            <Bar
              data={{
                labels: matEntries.map(([k]) => k),
                datasets: [{ label: 'Batch Records', data: matEntries.map(([, v]) => v), backgroundColor: matColors.slice(0, matEntries.length), borderRadius: 6, borderSkipped: false }],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false }, tooltip: { ...tooltipDefaults } },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { family: fontFamily, size: 12 }, color: '#5B6478' } },
                  y: { beginAtZero: true, grid: { color: C.hair }, ticks: { font: { family: fontFamily, size: 11 }, color: '#8A8F9F', stepSize: 1 } },
                },
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Por centro */}
            <div className="chart-card" style={{ flex: 1 }}>
              <div className="chart-title">Por centro de producción</div>
              <div className="chart-sub">Batch Records · todos los estados</div>
              <div className="centro-pills">
                {centroEntries.map(([label, val], i) => (
                  <div key={label} className="centro-pill">
                    <span className="centro-pill-label">{label}</span>
                    <div className="centro-pill-bar-wrap">
                      <div className="centro-pill-bar" style={{ width: `${Math.round((val / maxCentro) * 100)}%`, background: [C.navy, C.orange][i % 2] }} />
                    </div>
                    <span className="centro-pill-val">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actividad reciente */}
            <div className="chart-card" style={{ flex: 2 }}>
              <div className="chart-title">Actividad reciente</div>
              <div className="chart-sub">Últimas acciones · Batch Records</div>
              <div className="activity-list">
                {recent.map((a, i) => (
                  <div key={i} className="activity-item">
                    <div className="activity-dot" style={{ background: a.color + '18', color: a.color }}>
                      <i className="fa fa-clipboard-list" />
                    </div>
                    <div className="activity-body">
                      <div className="activity-text">{a.texto}</div>
                      <div className="activity-detail">{a.sub}</div>
                    </div>
                    <div className="activity-time">{a.tiempo}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
