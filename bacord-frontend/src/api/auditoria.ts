import { useAuthStore } from '@/stores/authStore'
import { useAuditStore } from '@/stores/auditStore'
import type { AuditAccion, AuditCambio, AuditEntidad, AuditEntry } from '@/types/audit'

export interface RegistrarAuditParams {
  entidad: AuditEntidad; idEntidad: string | number; descripcionEntidad: string
  accion: AuditAccion; modulo: string; cambios?: AuditCambio[]; motivo?: string
}

let nextId = useAuditStore.getState().entries.length + 1

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
    useAuditStore.getState().add(entry)
  },

  listar: async (_filtros?: Record<string, unknown>): Promise<AuditEntry[]> => {
    return useAuditStore.getState().entries
  },

  consultar: async (_filtro?: { entidad?: string; idEntidad?: string | number }): Promise<AuditEntry[]> => {
    return useAuditStore.getState().entries
  },
}
