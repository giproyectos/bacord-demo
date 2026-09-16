import { delay, mockOrdenes, mockComponentes, mockCarguesOP } from './mock'
import type { OrdenProceso, ComponenteOrden, CargueRegistro, BusquedaOrdenProceso, Resultado } from '@/types'

export const ordenProcesoApi = {
  buscar: async (f?: BusquedaOrdenProceso): Promise<OrdenProceso[]> => {
    await delay(400)
    let list = [...mockOrdenes]
    if (f?.numeroOrden) list = list.filter(o => o.numeroOrdenProceso.includes(f.numeroOrden!))
    if (f?.codigoMaterial) list = list.filter(o => o.codigoMaterial.includes(f.codigoMaterial!))
    if (f?.idEstado) list = list.filter(o => o.idEstado === f.idEstado)
    return list
  },

  find: async (id: number): Promise<OrdenProceso> => {
    await delay(300)
    const op = mockOrdenes.find(o => o.idOrdenProceso === id)
    if (!op) throw new Error(`Orden ${id} no encontrada`)
    return { ...op }
  },

  getComponentes: async (idOrdenProceso: number): Promise<ComponenteOrden[]> => {
    await delay(300)
    return mockComponentes.filter(c => c.idOrdenProceso === idOrdenProceso)
  },

  guardar: async (data: Partial<OrdenProceso> & { componentes?: Omit<ComponenteOrden, 'idComponente' | 'idOrdenProceso'>[] }): Promise<Resultado> => {
    await delay(500)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },

  confirmarCargue: async (
    archivo: string,
    ordenes: Omit<OrdenProceso, 'idOrdenProceso'>[],
    _componentes: Omit<ComponenteOrden, 'idComponente' | 'idOrdenProceso'>[][]
  ): Promise<Resultado<{ totalCargadas: number; totalComponentes: number; errores: number }>> => {
    await delay(800)
    const totalCargadas = ordenes.length
    const totalComponentes = _componentes.reduce((s, c) => s + c.length, 0)
    mockCarguesOP.push({
      id: Date.now(), archivo, fechaCargue: new Date().toISOString().split('T')[0],
      usuario: 'admin', totalOrdenes: totalCargadas, totalComponentes, errores: 0, estado: 'Exitoso',
    })
    return { estado: true, mensaje: `${totalCargadas} órdenes cargadas (modo demo — no persistidas)`, datos: { totalCargadas, totalComponentes, errores: 0 } }
  },

  buscarCargues: async (): Promise<CargueRegistro[]> => {
    await delay(300)
    return [...mockCarguesOP]
  },
}
