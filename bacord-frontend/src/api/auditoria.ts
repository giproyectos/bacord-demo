import { useAuthStore } from '@/stores/authStore'
import type { AuditAccion, AuditCambio, AuditEntidad, AuditEntry } from '@/types/audit'

export interface RegistrarAuditParams {
  entidad: AuditEntidad; idEntidad: string | number; descripcionEntidad: string
  accion: AuditAccion; modulo: string; cambios?: AuditCambio[]; motivo?: string
}

// In-memory audit log — pre-seeded with realistic demo events
const auditLog: AuditEntry[] = [
  {
    id: 'a-001', timestamp: '2025-11-05T08:15:22Z',
    idUsuario: 1, nombreUsuario: 'Carlos Mendoza', loginUsuario: 'operario', cargo: 'Técnico de Producción',
    entidad: 'DetalleValores', idEntidad: 'BR-1:101', descripcionEntidad: 'ET1-F1 — Acondicionamiento Área',
    accion: 'MODIFICAR', modulo: 'Batch Record',
    cambios: [{ campo: 'numTemperatura', etiqueta: 'Temperatura (°C)', valorAnterior: '', valorNuevo: '22.3' }],
  },
  {
    id: 'a-002', timestamp: '2025-11-05T08:42:10Z',
    idUsuario: 2, nombreUsuario: 'María López', loginUsuario: 'supervisor', cargo: 'Supervisora de Turno',
    entidad: 'FirmaCierre', idEntidad: 'BR-1:101', descripcionEntidad: 'Firma cierre ET1-F1',
    accion: 'FIRMAR_CIERRE', modulo: 'Batch Record',
  },
  {
    id: 'a-003', timestamp: '2025-12-14T07:45:00Z',
    idUsuario: 1, nombreUsuario: 'Carlos Mendoza', loginUsuario: 'operario', cargo: 'Técnico de Producción',
    entidad: 'DetalleValores', idEntidad: 'BR-2:201', descripcionEntidad: 'ET2-F1 — Configuración Encapsulado',
    accion: 'MODIFICAR', modulo: 'Batch Record',
    cambios: [{ campo: 'numVelocidadObj', etiqueta: 'Velocidad Objetivo', valorAnterior: '80000', valorNuevo: '120000' }],
  },
  {
    id: 'a-004', timestamp: '2026-01-16T09:45:00Z',
    idUsuario: 1, nombreUsuario: 'Carlos Mendoza', loginUsuario: 'operario', cargo: 'Técnico de Producción',
    entidad: 'Desviacion', idEntidad: '1', descripcionEntidad: 'Desviación velocidad encapsuladora ET2-F1 — BR-3',
    accion: 'REGISTRAR_DESVIACION', modulo: 'Batch Record',
    cambios: [{ campo: 'numVelocidadObj', etiqueta: 'Velocidad (cáps/min)', valorAnterior: '100–3000', valorNuevo: '3250' }],
  },
  {
    id: 'a-005', timestamp: '2026-02-09T09:05:00Z',
    idUsuario: 2, nombreUsuario: 'María López', loginUsuario: 'supervisor', cargo: 'Jefe de Producción',
    entidad: 'FirmaCierre', idEntidad: 'BR-4:303', descripcionEntidad: 'Firma cierre ET3-F3 — Liberación',
    accion: 'FIRMAR_CIERRE', modulo: 'Batch Record',
  },
  {
    id: 'a-006', timestamp: '2026-02-09T11:42:00Z',
    idUsuario: 4, nombreUsuario: 'Diana Morales', loginUsuario: 'director', cargo: 'Director Técnico de Planta',
    entidad: 'FirmaCierre', idEntidad: 'BR-4:303', descripcionEntidad: 'Firma liberación — BR-4',
    accion: 'FIRMAR_CIERRE', modulo: 'Batch Record',
  },
  {
    id: 'a-007', timestamp: '2026-02-11T09:30:00Z',
    idUsuario: 4, nombreUsuario: 'Diana Morales', loginUsuario: 'director', cargo: 'Director Técnico de Planta',
    entidad: 'BatchRecord', idEntidad: '4', descripcionEntidad: 'BR-4 — SYNAPTOMAX 250mg Lote LL-2024-004',
    accion: 'LIBERAR_LOTE', modulo: 'Batch Record',
    motivo: 'Todos los controles conformes. Desviación DEV-2025-042 evaluada y cerrada sin impacto en calidad.',
  },
  {
    id: 'a-008', timestamp: '2026-03-12T08:45:00Z',
    idUsuario: 1, nombreUsuario: 'Ana Torres', loginUsuario: 'operario', cargo: 'Técnico de Producción',
    entidad: 'Desviacion', idEntidad: '2', descripcionEntidad: 'Desviación temperatura sala — BR-5',
    accion: 'REGISTRAR_DESVIACION', modulo: 'Batch Record',
    cambios: [{ campo: 'numTemperatura', etiqueta: 'Temperatura (°C)', valorAnterior: 'máx 30°C', valorNuevo: '32°C' }],
  },
  {
    id: 'a-009', timestamp: '2026-03-13T10:15:00Z',
    idUsuario: 2, nombreUsuario: 'María López', loginUsuario: 'supervisor', cargo: 'Supervisora de Turno',
    entidad: 'BatchRecord', idEntidad: '5', descripcionEntidad: 'BR-5 — CARBOPLEX 500mg Lote LL-2025-001',
    accion: 'CANCELAR', modulo: 'Batch Record',
    motivo: 'Desviación crítica en peso de tabletas — fuera de especificación ±5%',
  },
  {
    id: 'a-010', timestamp: '2026-03-12T08:00:00Z',
    idUsuario: 1, nombreUsuario: 'Carlos Mendoza', loginUsuario: 'operario', cargo: 'Técnico de Producción',
    entidad: 'Sesion', idEntidad: 'operario', descripcionEntidad: 'Inicio de sesión',
    accion: 'LOGIN', modulo: 'Auth',
  },
]

let nextId = auditLog.length + 1

export const auditoriaApi = {
  registrar: async (params: RegistrarAuditParams): Promise<void> => {
    const user = useAuthStore.getState().user
    const entry: AuditEntry = {
      id: `a-${String(nextId++).padStart(3, '0')}`,
      timestamp: new Date().toISOString(),
      idUsuario: user?.idUsuario ?? 0,
      nombreUsuario: user ? `${user.nombres} ${user.apellidos}` : 'Sistema',
      loginUsuario: user?.login ?? 'sistema',
      cargo: user?.roles?.[0] ?? 'Usuario',
      ...params,
    }
    auditLog.unshift(entry)
  },

  listar: async (_filtros?: Record<string, unknown>): Promise<AuditEntry[]> => {
    return [...auditLog]
  },

  consultar: async (_filtro?: { entidad?: string; idEntidad?: string | number }): Promise<AuditEntry[]> => {
    return [...auditLog]
  },
}
