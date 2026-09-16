import { delay, mockGruposResponsables } from './mock'
import type { GrupoResponsable, Resultado } from '@/types'

type GrupoResponsableInput = Pick<GrupoResponsable, 'nombre' | 'descripcion' | 'colorKey'>

export const gruposResponsablesApi = {
  listar: async (): Promise<GrupoResponsable[]> => { await delay(300); return [...mockGruposResponsables] },
  crear: async (data: GrupoResponsableInput): Promise<Resultado<GrupoResponsable>> => {
    await delay(400)
    const nuevo: GrupoResponsable = { ...data, id: Date.now(), activo: true }
    mockGruposResponsables.push(nuevo)
    return { estado: true, mensaje: 'Grupo creado', datos: nuevo }
  },
  actualizar: async (id: number, data: Partial<GrupoResponsableInput>): Promise<Resultado<GrupoResponsable>> => {
    await delay(400)
    const i = mockGruposResponsables.findIndex(g => g.id === id)
    if (i < 0) return { estado: false, mensaje: 'No encontrado' }
    mockGruposResponsables[i] = { ...mockGruposResponsables[i], ...data }
    return { estado: true, mensaje: 'Actualizado', datos: mockGruposResponsables[i] }
  },
  eliminar: async (id: number): Promise<Resultado> => {
    await delay(400)
    const i = mockGruposResponsables.findIndex(g => g.id === id)
    if (i >= 0) mockGruposResponsables.splice(i, 1)
    return { estado: true, mensaje: 'Eliminado' }
  },
}
