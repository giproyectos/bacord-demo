import { delay, mockDetallesCatalogo } from './mock'
import {
  SCHEMA_ET1_F1, SCHEMA_ET1_F2, SCHEMA_ET1_F3,
  SCHEMA_ET2_F1, SCHEMA_ET2_F2, SCHEMA_ET2_F3,
  SCHEMA_ET3_F1, SCHEMA_ET3_F2, SCHEMA_ET3_F3,
} from './demoSchemas'
import type { Resultado } from '@/types'

export interface DetalleApi {
  id: number; codigo: string; descripcion: string
  estado: 'Activo' | 'En creación' | 'Obsoleto'
  idEstrategiaFirma?: number | null
  jsonSchema: string; jsonData?: string | null; jsonOptions?: string | null
}

const SCHEMAS: Record<number, string> = {
  101: SCHEMA_ET1_F1, 102: SCHEMA_ET1_F2, 103: SCHEMA_ET1_F3,
  201: SCHEMA_ET2_F1, 202: SCHEMA_ET2_F2, 203: SCHEMA_ET2_F3,
  301: SCHEMA_ET3_F1, 302: SCHEMA_ET3_F2, 303: SCHEMA_ET3_F3,
}

const toApi = (d: typeof mockDetallesCatalogo[0]): DetalleApi => ({
  id: d.id, codigo: d.codigo, descripcion: d.descripcion,
  estado: 'Activo', idEstrategiaFirma: d.idEstrategiaFirma ?? null,
  jsonSchema: SCHEMAS[d.id] ?? '{"components":[]}',
})

export const detallesApi = {
  listar: async (): Promise<DetalleApi[]> => { await delay(300); return mockDetallesCatalogo.map(toApi) },
  find: async (id: number): Promise<DetalleApi> => {
    await delay(200)
    const d = mockDetallesCatalogo.find(x => x.id === id)
    if (!d) throw new Error(`Detalle ${id} no encontrado`)
    return toApi(d)
  },
  crear: async (data: Omit<DetalleApi, 'id'>): Promise<Resultado<DetalleApi>> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },
  actualizar: async (id: number, data: Partial<Omit<DetalleApi, 'id'>>): Promise<Resultado<DetalleApi>> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },
  eliminar: async (id: number): Promise<Resultado> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },
}
