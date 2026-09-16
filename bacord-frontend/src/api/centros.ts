import { delay } from './mock'
import type { Resultado } from '@/types'

export interface Centro {
  id: number; codigo: string; descripcion: string; direccion?: string | null; activo: boolean
}

export let mockCentros: Centro[] = [
  { id: 1, codigo: 'PP-01', descripcion: 'Planta Principal', direccion: 'Calle 100 #15-20, Bogotá', activo: true },
  { id: 2, codigo: 'PP-02', descripcion: 'Planta Secundaria', direccion: 'Av. Industrial #5-10, Medellín', activo: true },
]

export const centrosApi = {
  listar: async (): Promise<Centro[]> => { await delay(300); return [...mockCentros] },
  crear: async (data: Omit<Centro, 'id' | 'activo'>): Promise<Resultado<Centro>> => {
    await delay(400)
    const nuevo = { ...data, id: Date.now(), activo: true }
    mockCentros.push(nuevo)
    return { estado: true, mensaje: 'Centro creado', datos: nuevo }
  },
  actualizar: async (id: number, data: Partial<Omit<Centro, 'id'>>): Promise<Resultado<Centro>> => {
    await delay(400)
    const i = mockCentros.findIndex(c => c.id === id)
    if (i < 0) return { estado: false, mensaje: 'No encontrado' }
    mockCentros[i] = { ...mockCentros[i], ...data }
    return { estado: true, mensaje: 'Actualizado', datos: mockCentros[i] }
  },
  eliminar: async (id: number): Promise<Resultado> => {
    await delay(400)
    mockCentros = mockCentros.filter(c => c.id !== id)
    return { estado: true, mensaje: 'Eliminado' }
  },
}
