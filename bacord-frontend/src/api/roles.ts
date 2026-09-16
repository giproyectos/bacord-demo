import { delay } from './mock'
import type { Rol, Resultado } from '@/types'

const ALL_MODULOS = [
  'batch-records','ordenes-proceso','formulas-control','firmas',
  'estrategias-firma','recetas-maestras','materiales','procesos',
  'centros','grupos-responsables','detalles','auditoria',
]

export let mockRoles: Rol[] = [
  { id: 1, nombre: 'Administrador', descripcion: 'Acceso total al sistema', modulos: ALL_MODULOS, modulosEdicion: ALL_MODULOS, activo: true, creadoEn: '2024-01-01T00:00:00' },
  { id: 2, nombre: 'Producción',    descripcion: 'Operarios de producción',  modulos: ['batch-records','ordenes-proceso'], modulosEdicion: ['batch-records'], activo: true, creadoEn: '2024-01-01T00:00:00' },
  { id: 3, nombre: 'Supervisión',   descripcion: 'Supervisores de turno',     modulos: ['batch-records','ordenes-proceso','formulas-control'], modulosEdicion: ['batch-records','formulas-control'], activo: true, creadoEn: '2024-01-01T00:00:00' },
  { id: 4, nombre: 'Calidad',       descripcion: 'Control de calidad',        modulos: ALL_MODULOS, modulosEdicion: ['batch-records','detalles','estrategias-firma'], activo: true, creadoEn: '2024-01-01T00:00:00' },
  { id: 5, nombre: 'Dirección',     descripcion: 'Dirección técnica',         modulos: ALL_MODULOS, modulosEdicion: [], activo: true, creadoEn: '2024-01-01T00:00:00' },
]

export interface RolInput {
  nombre: string; descripcion?: string; modulos: string[]; modulosEdicion?: string[]; activo?: boolean
}

export const rolesApi = {
  listar: async (): Promise<Rol[]> => { await delay(300); return [...mockRoles] },
  crear: async (data: RolInput): Promise<Resultado<Rol>> => {
    await delay(400)
    const nuevo: Rol = { id: Date.now(), nombre: data.nombre, descripcion: data.descripcion ?? '', modulos: data.modulos, modulosEdicion: data.modulosEdicion ?? [], activo: data.activo ?? true, creadoEn: new Date().toISOString() }
    mockRoles.push(nuevo)
    return { estado: true, mensaje: 'Rol creado', datos: nuevo }
  },
  actualizar: async (id: number, data: Partial<RolInput>): Promise<Resultado<Rol>> => {
    await delay(400)
    const i = mockRoles.findIndex(r => r.id === id)
    if (i < 0) return { estado: false, mensaje: 'No encontrado' }
    mockRoles[i] = { ...mockRoles[i], ...data }
    return { estado: true, mensaje: 'Actualizado', datos: mockRoles[i] }
  },
  eliminar: async (_id: number): Promise<Resultado> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },
}
