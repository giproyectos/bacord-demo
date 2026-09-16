// Demo mode — audit is stored locally in auditStore, not sent to a real backend
import type { AuditAccion, AuditCambio, AuditEntidad } from '@/types/audit'

export interface RegistrarAuditParams {
  entidad: AuditEntidad; idEntidad: string | number; descripcionEntidad: string
  accion: AuditAccion; modulo: string; cambios?: AuditCambio[]; motivo?: string
}

export const auditoriaApi = {
  registrar: async (_params: RegistrarAuditParams): Promise<void> => {
    // No-op in demo — audit events handled by useAuditStore locally
  },
  listar: async (_filtros?: Record<string, unknown>) => [],
  consultar: async (_filtro?: { entidad?: string; idEntidad?: string | number }) => [],
}
