import { delay } from './mock'
import type { Resultado } from '@/types'

export interface Parametro {
  id: number; nombre: string; valor: string; descripcion?: string | null
}

export let mockParametros: Parametro[] = [
  { id: 1, nombre: 'inactividad_minutos', valor: '60', descripcion: 'Minutos de inactividad antes de cerrar sesión' },
  { id: 2, nombre: 'max_intentos_login',  valor: '5',  descripcion: 'Máximo de intentos fallidos antes de bloquear usuario' },
]

export const parametrosApi = {
  listar: async (): Promise<Parametro[]> => { await delay(300); return [...mockParametros] },
  crear: async (data: Omit<Parametro, 'id'>): Promise<Resultado<Parametro>> => {
    await delay(400)
    const nuevo = { ...data, id: Date.now() }
    mockParametros.push(nuevo)
    return { estado: true, mensaje: 'Parámetro creado', datos: nuevo }
  },
  actualizar: async (id: number, data: Partial<Omit<Parametro, 'id'>>): Promise<Resultado<Parametro>> => {
    await delay(400)
    const i = mockParametros.findIndex(p => p.id === id)
    if (i < 0) return { estado: false, mensaje: 'No encontrado' }
    mockParametros[i] = { ...mockParametros[i], ...data }
    return { estado: true, mensaje: 'Actualizado', datos: mockParametros[i] }
  },
  eliminar: async (id: number): Promise<Resultado> => {
    await delay(400)
    mockParametros = mockParametros.filter(p => p.id !== id)
    return { estado: true, mensaje: 'Eliminado' }
  },
}
