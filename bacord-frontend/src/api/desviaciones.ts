import { delay, mockDesviaciones } from './mock'
import type { Resultado } from '@/types'

export interface Desviacion {
  id: number; idBatchRecord: number; idDetalle: number
  campo: string; labelCampo: string; valorIngresado: string; limiteInfo: string
  descripcion: string; estado: 'abierta' | 'cerrada'
  idUsuarioReporta: number; fechaHora: string
  observacionCierre?: string | null; fechaCierre?: string | null
  idUsuarioCierre?: number | null
  usuarioReporta: { nombres: string; apellidos: string; login: string }
  usuarioCierra?: { nombres: string; apellidos: string; login: string } | null
}

const toApi = (d: typeof mockDesviaciones[0]): Desviacion => ({
  id: d.id, idBatchRecord: d.idBatchRecord, idDetalle: d.idDetalle,
  campo: d.campo, labelCampo: d.labelCampo, valorIngresado: d.valorIngresado,
  limiteInfo: d.limiteInfo, descripcion: d.descripcion, estado: d.estado,
  idUsuarioReporta: 1, fechaHora: d.fechaHora,
  observacionCierre: d.observacionCierre ?? null, fechaCierre: d.fechaCierre ?? null,
  usuarioReporta: { nombres: 'Usuario', apellidos: 'Demo', login: 'demo' },
  usuarioCierra: d.estado === 'cerrada'
    ? { nombres: 'Usuario', apellidos: 'Demo', login: 'demo' }
    : null,
})

// In-memory store for new desviaciones created in this session
const extraDesviaciones: Desviacion[] = []

export const desviacionesApi = {
  listar: async (idBatchRecord?: number): Promise<Desviacion[]> => {
    await delay(300)
    const base = mockDesviaciones.map(toApi)
    const all = [...base, ...extraDesviaciones]
    return idBatchRecord !== undefined ? all.filter(d => d.idBatchRecord === idBatchRecord) : all
  },
  crear: async (data: {
    idBatchRecord: number; idDetalle: number; campo: string; labelCampo: string
    valorIngresado: string; limiteInfo: string; descripcion: string
  }): Promise<Resultado<Desviacion>> => {
    await delay(400)
    const nueva: Desviacion = {
      ...data, id: Date.now(), estado: 'abierta',
      idUsuarioReporta: 1, fechaHora: new Date().toISOString(),
      usuarioReporta: { nombres: 'Usuario', apellidos: 'Demo', login: 'demo' },
    }
    extraDesviaciones.push(nueva)
    return { estado: true, mensaje: 'Desviación registrada', datos: nueva }
  },
  cerrar: async (id: number, _login: string, _pin: string, observacionCierre: string): Promise<Resultado<Desviacion>> => {
    await delay(400)
    const extra = extraDesviaciones.find(x => x.id === id)
    if (extra) {
      extra.estado = 'cerrada'; extra.observacionCierre = observacionCierre
      extra.fechaCierre = new Date().toISOString()
      extra.usuarioCierra = { nombres: 'Usuario', apellidos: 'Demo', login: _login }
      return { estado: true, mensaje: 'Desviación cerrada', datos: extra }
    }
    const d = mockDesviaciones.find(x => x.id === id)
    if (d) { d.estado = 'cerrada'; d.observacionCierre = observacionCierre; d.fechaCierre = new Date().toISOString() }
    return { estado: true, mensaje: 'Desviación cerrada', datos: d ? toApi(d) : undefined }
  },
}
