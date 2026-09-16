import { delay, mockProcesosGlobal } from './mock'
import type { Resultado } from '@/types'

export interface ProcesoItem {
  id: number; idMaterial: number; codigo: string; descripcion: string; orden: number; activo: boolean
}

const toApi = (p: typeof mockProcesosGlobal[0]): ProcesoItem => ({ ...p, activo: true })

export const procesosApi = {
  listar: async (idMaterial?: number): Promise<ProcesoItem[]> => {
    await delay(300)
    const list = idMaterial
      ? mockProcesosGlobal.filter(p => p.idMaterial === idMaterial)
      : mockProcesosGlobal
    return list.map(toApi)
  },
  crear: async (data: Omit<ProcesoItem, 'id' | 'activo'>): Promise<Resultado<ProcesoItem>> => {
    await delay(400)
    const nuevo = { ...data, id: Date.now(), activo: true }
    mockProcesosGlobal.push({ id: nuevo.id, idMaterial: nuevo.idMaterial, codigo: nuevo.codigo, descripcion: nuevo.descripcion, orden: nuevo.orden })
    return { estado: true, mensaje: 'Proceso creado', datos: nuevo }
  },
  actualizar: async (id: number, data: Partial<Omit<ProcesoItem, 'id'>>): Promise<Resultado<ProcesoItem>> => {
    await delay(400)
    const i = mockProcesosGlobal.findIndex(p => p.id === id)
    if (i < 0) return { estado: false, mensaje: 'No encontrado' }
    Object.assign(mockProcesosGlobal[i], data)
    return { estado: true, mensaje: 'Actualizado', datos: toApi(mockProcesosGlobal[i]) }
  },
  eliminar: async (_id: number): Promise<Resultado> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },
}
