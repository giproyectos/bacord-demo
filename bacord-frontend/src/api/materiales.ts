import { delay, mockMateriales } from './mock'
import type { Resultado } from '@/types'

export type TipoMaterial = 'PRODUCTO_TERMINADO' | 'MATERIAL_EMPAQUE' | 'MATERIAL_ENVASE' | 'EXCIPIENTE' | 'PRINCIPIO_ACTIVO'

export const TIPO_MATERIAL_LABELS: Record<TipoMaterial, string> = {
  PRODUCTO_TERMINADO: 'Producto Terminado',
  MATERIAL_EMPAQUE: 'Material de Empaque',
  MATERIAL_ENVASE: 'Material de Envase',
  EXCIPIENTE: 'Excipiente (Semiterminado/Granel)',
  PRINCIPIO_ACTIVO: 'Principio Activo (Semiterminado/Granel)',
}

export interface Material {
  id: number; codigo: string; descripcion: string
  tipo?: TipoMaterial | null; activo?: boolean
}

export interface CargueMaterialRegistro {
  id: number; archivo: string; fechaCargue: string; usuario: string
  totalMateriales: number; errores: number
  estado: 'Exitoso' | 'Con errores' | 'Fallido'
}

const mockCarguesMateriales: CargueMaterialRegistro[] = []

export const materialesApi = {
  listar: async (_tipo?: TipoMaterial): Promise<Material[]> => { await delay(300); return [...mockMateriales] },
  find: async (id: number): Promise<Material | null> => {
    await delay(200)
    return mockMateriales.find(m => m.id === id) ?? null
  },
  crear: async (data: Omit<Material, 'id'>): Promise<Resultado<Material>> => {
    await delay(400)
    const nuevo = { ...data, id: Date.now() }
    mockMateriales.push(nuevo)
    return { estado: true, mensaje: 'Material creado', datos: nuevo }
  },
  actualizar: async (id: number, data: Partial<Material>): Promise<Resultado<Material>> => {
    await delay(400)
    const i = mockMateriales.findIndex(m => m.id === id)
    if (i < 0) return { estado: false, mensaje: 'No encontrado' }
    mockMateriales[i] = { ...mockMateriales[i], ...data }
    return { estado: true, mensaje: 'Actualizado', datos: mockMateriales[i] }
  },
  eliminar: async (_id: number): Promise<Resultado> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },
  cargar: async (archivo: string, materiales: { codigo: string; descripcion: string; tipo: TipoMaterial }[]):
    Promise<Resultado<{ total: number; creados: number; errores: number }>> => {
    await delay(800)
    const reg: CargueMaterialRegistro = {
      id: Date.now(), archivo, fechaCargue: new Date().toISOString().split('T')[0],
      usuario: 'admin', totalMateriales: materiales.length, errores: 0, estado: 'Exitoso',
    }
    mockCarguesMateriales.push(reg)
    return { estado: true, mensaje: `${materiales.length} materiales cargados (modo demo)`, datos: { total: materiales.length, creados: materiales.length, errores: 0 } }
  },
  buscarCargues: async (): Promise<CargueMaterialRegistro[]> => {
    await delay(300)
    return [...mockCarguesMateriales]
  },
}
