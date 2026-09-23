import { create } from 'zustand'
import type { AuditEntry } from '@/types/audit'

interface AuditState {
  entries: AuditEntry[]
  add: (entry: AuditEntry) => void
}

export const useAuditStore = create<AuditState>()((set) => ({
  entries: [
    {
      id: 'a-001', timestamp: '2025-09-15T08:15:00Z',
      idUsuario: 3, nombreUsuario: 'Ana Torres', loginUsuario: 'operario', cargo: 'Técnico de Producción',
      entidad: 'DetalleValores', idEntidad: 'BR-1', descripcionEntidad: 'ET1-F1 Acondicionamiento — SYNAPTOMAX 250mg',
      accion: 'MODIFICAR', modulo: 'Batch Record',
      cambios: [{ campo: 'numTemperatura', etiqueta: 'Temperatura (°C)', valorAnterior: '', valorNuevo: '22.3' }],
    },
    {
      id: 'a-002', timestamp: '2025-09-15T09:42:00Z',
      idUsuario: 2, nombreUsuario: 'María López', loginUsuario: 'supervisor', cargo: 'Supervisora de Turno',
      entidad: 'FirmaCierre', idEntidad: 'BR-1', descripcionEntidad: 'Firma cierre ET1 — SYNAPTOMAX 250mg Lote LL-2024-001',
      accion: 'FIRMAR_CIERRE', modulo: 'Batch Record',
    },
    {
      id: 'a-003', timestamp: '2025-10-20T07:30:00Z',
      idUsuario: 3, nombreUsuario: 'Ana Torres', loginUsuario: 'operario', cargo: 'Técnico de Producción',
      entidad: 'DetalleValores', idEntidad: 'BR-2', descripcionEntidad: 'ET1-F1 Granulación — CARBOPLEX 500mg',
      accion: 'MODIFICAR', modulo: 'Batch Record',
      cambios: [
        { campo: 'numTemperaturaEntrada', etiqueta: 'Temperatura entrada (°C)', valorAnterior: '', valorNuevo: '62.5' },
        { campo: 'numHumedad', etiqueta: 'Humedad relativa (%)', valorAnterior: '', valorNuevo: '38.2' },
      ],
    },
    {
      id: 'a-004', timestamp: '2025-10-20T14:10:00Z',
      idUsuario: 2, nombreUsuario: 'María López', loginUsuario: 'supervisor', cargo: 'Supervisora de Turno',
      entidad: 'FirmaCierre', idEntidad: 'BR-2', descripcionEntidad: 'Firma cierre ET1 — CARBOPLEX 500mg',
      accion: 'FIRMAR_CIERRE', modulo: 'Batch Record',
    },
    {
      id: 'a-005', timestamp: '2025-10-21T08:00:00Z',
      idUsuario: 3, nombreUsuario: 'Ana Torres', loginUsuario: 'operario', cargo: 'Técnico de Producción',
      entidad: 'DetalleValores', idEntidad: 'BR-2', descripcionEntidad: 'ET2-F1 Encapsulado — CARBOPLEX 500mg',
      accion: 'MODIFICAR', modulo: 'Batch Record',
      cambios: [{ campo: 'numVelocidadObj', etiqueta: 'Velocidad encapsuladora (cáps/min)', valorAnterior: '', valorNuevo: '120000' }],
    },
    {
      id: 'a-006', timestamp: '2025-11-10T09:45:00Z',
      idUsuario: 3, nombreUsuario: 'Ana Torres', loginUsuario: 'operario', cargo: 'Técnico de Producción',
      entidad: 'Desviacion', idEntidad: '1', descripcionEntidad: 'Velocidad encapsuladora fuera de rango — BR-3 ET2-F1',
      accion: 'REGISTRAR_DESVIACION', modulo: 'Batch Record',
      cambios: [{ campo: 'numVelocidadObj', etiqueta: 'Velocidad (cáps/min)', valorAnterior: 'límite: 3000 máx', valorNuevo: '3250 — NO CONFORME' }],
    },
    {
      id: 'a-007', timestamp: '2025-11-10T11:20:00Z',
      idUsuario: 2, nombreUsuario: 'María López', loginUsuario: 'supervisor', cargo: 'Supervisora de Turno',
      entidad: 'Desviacion', idEntidad: '1', descripcionEntidad: 'Cierre desviación velocidad encapsuladora — BR-3',
      accion: 'CERRAR_DESVIACION', modulo: 'Batch Record',
      motivo: 'Evaluado por QA. Impacto en calidad mínimo — lote continúa bajo monitoreo reforzado.',
    },
    {
      id: 'a-008', timestamp: '2026-01-15T10:30:00Z',
      idUsuario: 4, nombreUsuario: 'Diana Morales', loginUsuario: 'director', cargo: 'Director Técnico de Planta',
      entidad: 'BatchRecord', idEntidad: '4', descripcionEntidad: 'BR-4 — SYNAPTOMAX 250mg Lote LL-2024-004',
      accion: 'LIBERAR_LOTE', modulo: 'Batch Record',
      motivo: 'Todos los controles conformes. Revisión GMP completa. Aprobado para distribución.',
    },
    {
      id: 'a-009', timestamp: '2026-03-10T08:45:00Z',
      idUsuario: 3, nombreUsuario: 'Ana Torres', loginUsuario: 'operario', cargo: 'Técnico de Producción',
      entidad: 'Desviacion', idEntidad: '2', descripcionEntidad: 'Temperatura sala fuera de rango — BR-5 ET1-F1',
      accion: 'REGISTRAR_DESVIACION', modulo: 'Batch Record',
      cambios: [{ campo: 'numTemperatura', etiqueta: 'Temperatura sala (°C)', valorAnterior: 'límite: máx 30°C', valorNuevo: '32°C — NO CONFORME' }],
    },
    {
      id: 'a-010', timestamp: '2026-03-11T09:00:00Z',
      idUsuario: 2, nombreUsuario: 'María López', loginUsuario: 'supervisor', cargo: 'Supervisora de Turno',
      entidad: 'BatchRecord', idEntidad: '5', descripcionEntidad: 'BR-5 — CARBOPLEX 500mg Lote LL-2025-001',
      accion: 'CANCELAR', modulo: 'Batch Record',
      motivo: 'Temperatura sala 32°C supera límite GMP (máx 30°C). Lote cancelado. Se abre CAPA-2026-005.',
    },
  ],
  add: (entry) => set((s) => ({ entries: [entry, ...s.entries] })),
}))
