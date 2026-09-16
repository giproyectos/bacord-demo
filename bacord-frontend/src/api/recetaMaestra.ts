import { delay, mockRecetas, mockDetallesCatalogo, mockProcesosGlobal, mockRecetaEstructuras } from './mock'
import type { RecetaMaestra, BusquedaRecetaMaestra, Resultado } from '@/types'

export interface RecetaMaestraInput {
  codigo: string; descripcion: string; version: string
  idCentro: number; idMaterial: number; motivo?: string
}

export interface RecetaEstructuraDetalle {
  id: number; idRecetaProceso: number; idDetalle: number; orden: number
  detalle: { id: number; codigo: string; descripcion: string; idEstrategiaFirma: number | null }
}
export interface RecetaEstructuraProceso {
  id: number; idRecetaMaestra: number; idProceso: number; orden: number
  proceso: { id: number; codigo: string; descripcion: string }
  detalles: RecetaEstructuraDetalle[]
}
export interface RecetaEstructuraResponse {
  idRecetaMaestra: number
  procesos: RecetaEstructuraProceso[]
}

export const recetaMaestraApi = {
  buscar: async (f?: BusquedaRecetaMaestra): Promise<RecetaMaestra[]> => {
    await delay(400)
    let list = [...mockRecetas]
    if (f?.codigo) list = list.filter(r => r.codigo.toLowerCase().includes(f.codigo!.toLowerCase()))
    if (f?.descripcion) list = list.filter(r => r.descripcion.toLowerCase().includes(f.descripcion!.toLowerCase()))
    if (f?.idEstado) list = list.filter(r => r.idEstado === f.idEstado)
    return list
  },

  find: async (id: number): Promise<RecetaMaestra> => {
    await delay(300)
    const rm = mockRecetas.find(r => r.idRecetaMaestra === id)
    if (!rm) throw new Error(`Receta ${id} no encontrada`)
    return { ...rm }
  },

  crear: async (_data: RecetaMaestraInput): Promise<Resultado<RecetaMaestra>> => {
    await delay(500)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },

  // PoC signature: guardar(id, data) — two args
  guardar: async (_id: number, _data: Partial<RecetaMaestraInput>): Promise<Resultado<RecetaMaestra>> => {
    await delay(500)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },

  cambiarEstado: async (id: number, idEstado: number, motivo: string): Promise<Resultado<RecetaMaestra>> => {
    await delay(400)
    const r = mockRecetas.find(x => x.idRecetaMaestra === id)
    if (r) { r.idEstado = idEstado; r.motivo = motivo }
    return { estado: true, mensaje: 'Estado actualizado (modo demo)', datos: r }
  },

  copiar: async (_id: number, _codigo: string): Promise<Resultado> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },

  eliminar: async (_id: number): Promise<Resultado> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },

  getEstructura: async (id: number): Promise<RecetaEstructuraResponse> => {
    await delay(300)
    const e = mockRecetaEstructuras.find(x => x.idRecetaMaestra === id)
    if (!e) return { idRecetaMaestra: id, procesos: [] }
    const procesos: RecetaEstructuraProceso[] = e.procesos.map((rp, pi) => {
      const proc = mockProcesosGlobal.find(p => p.id === rp.idProceso)
      return {
        id: rp.id, idRecetaMaestra: id, idProceso: rp.idProceso, orden: rp.orden,
        proceso: { id: rp.idProceso, codigo: proc?.codigo ?? '', descripcion: proc?.descripcion ?? '' },
        detalles: rp.detalles.map((rd, di) => {
          const det = mockDetallesCatalogo.find(d => d.id === rd.idDetalle)
          return {
            id: rd.id, idRecetaProceso: rp.id, idDetalle: rd.idDetalle, orden: rd.orden,
            detalle: { id: rd.idDetalle, codigo: det?.codigo ?? '', descripcion: det?.descripcion ?? '', idEstrategiaFirma: det?.idEstrategiaFirma ?? null },
          }
        }),
      }
    })
    return { idRecetaMaestra: id, procesos }
  },

  guardarEstructura: async (_id: number, _procesos: { idProceso: number; orden: number; detalles: { idDetalle: number; orden: number }[] }[]): Promise<Resultado> => {
    await delay(500)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },
}
