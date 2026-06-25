import { useState } from 'react'
import { Panel } from '@/components/shared/Panel'
import { DataTable, type Column } from '@/components/shared/DataTable'

interface LogLogueo { id: number; login: string; fechaAcceso: string; ipAcceso: string; accion: string; exitoso: string }

const mock: LogLogueo[] = [
  { id: 1, login: 'admin',  fechaAcceso: '2024-10-01 08:00:00', ipAcceso: '192.168.1.10', accion: 'Login',  exitoso: 'Sí' },
  { id: 2, login: 'jborda', fechaAcceso: '2024-10-01 08:15:00', ipAcceso: '192.168.1.11', accion: 'Login',  exitoso: 'Sí' },
  { id: 3, login: 'pedro',  fechaAcceso: '2024-10-01 09:00:00', ipAcceso: '192.168.1.15', accion: 'Login',  exitoso: 'No' },
  { id: 4, login: 'admin',  fechaAcceso: '2024-10-01 17:00:00', ipAcceso: '192.168.1.10', accion: 'Logout', exitoso: 'Sí' },
]

export function LogLogueos() {
  const today = new Date().toISOString().split('T')[0]
  const [filtros, setFiltros] = useState({ Login: '', FechaInicialAcceso: today, FechaFinalAcceso: today })

  const cols: Column<LogLogueo>[] = [
    { key: 'id',          header: 'Id',           width: '5%' },
    { key: 'login',       header: 'Login',        width: '15%' },
    { key: 'fechaAcceso', header: 'Fecha Acceso', width: '18%' },
    { key: 'ipAcceso',    header: 'IP Acceso',    width: '15%' },
    { key: 'accion',      header: 'Acción',       width: '12%' },
    { key: 'exitoso',     header: 'Exitoso',      width: '10%' },
  ]

  return (
    <>
      <Panel title={<><i className="fa fa-search" /> Buscar ingresos al sistema</>} collapsible>
        <div className="form-horizontal">
          <div className="grid-row">
            <div className="form-group">
              <label>Login</label>
              <input type="text" className="form-control input-sm" value={filtros.Login} onChange={e => setFiltros(f => ({ ...f, Login: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Fecha acceso desde</label>
              <input type="date" className="form-control input-sm" value={filtros.FechaInicialAcceso} onChange={e => setFiltros(f => ({ ...f, FechaInicialAcceso: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Fecha acceso hasta</label>
              <input type="date" className="form-control input-sm" value={filtros.FechaFinalAcceso} onChange={e => setFiltros(f => ({ ...f, FechaFinalAcceso: e.target.value }))} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-gray" onClick={() => setFiltros({ Login: '', FechaInicialAcceso: today, FechaFinalAcceso: today })}><i className="fa fa-undo" /> Limpiar</button>
            <button className="btn btn-primary"><i className="fa fa-search" /> Buscar</button>
          </div>
        </div>
      </Panel>
      <Panel title="Resultado de la búsqueda">
        <DataTable<LogLogueo> columns={cols} data={mock} />
      </Panel>
    </>
  )
}
