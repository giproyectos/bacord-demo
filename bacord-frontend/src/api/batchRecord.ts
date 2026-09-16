import { authApi } from './auth'
import {
  delay, mockBatchRecords, mockFirmadosBR, mockPreLlenados,
  mockRecetaEstructuras, mockProcesosGlobal, mockDetallesCatalogo,
  mockEstrategiasFirma,
} from './mock'
import { SCHEMA_ET1_F1, SCHEMA_ET1_F2, SCHEMA_ET1_F3, SCHEMA_ET2_F1, SCHEMA_ET2_F2, SCHEMA_ET2_F3, SCHEMA_ET3_F1, SCHEMA_ET3_F2, SCHEMA_ET3_F3 } from './demoSchemas'
import type { BatchRecord, BusquedaBatchRecord, PreLlenadoBR, Resultado } from '@/types'

export interface BatchRecordDetalleData {
  id: number; idBatchRecord: number; idDetalle: number; jsonData: string; actualizadoEn: string
}
export interface BatchRecordFirmaRegistrada {
  id: number; idBatchRecord: number; idDetalle: number; bloqueKey: string
  idFirma: number; idUsuario: number; firmadoEn: string
  usuario: { nombres: string; apellidos: string; login: string }
  firma: { idFirma: number; codigo: string; descripcion: string; texto: string; idGrupo: number; grupo: { nombre: string } }
}
export interface BatchRecordLiberacionInfo {
  idBatchRecord: number; idUsuario: number; observacion: string | null; liberadoEn: string
  usuario: { nombres: string; apellidos: string; login: string }
}
export interface BatchRecordProcesoCierre {
  id: number; idBatchRecord: number; idProceso: number; idUsuario: number; cerradoEn: string
}
export interface EstructuraFirmaItem {
  idFirma: number; texto: string; orden: number; activo: boolean
  firma: { codigo: string; descripcion: string; grupo: { nombre: string } }
}
export interface EstructuraDetalle {
  id: number; codigo: string; descripcion: string
  estado: 'Activo' | 'En creación' | 'Obsoleto'
  idEstrategiaFirma: number | null; jsonSchema: string; jsonOptions?: string | null
  estrategiaFirma: { id: number; gruposDerogacion: string | null; firmas: EstructuraFirmaItem[] } | null
}
export interface EstructuraProceso {
  id: number; idProceso: number; orden: number
  proceso: { id: number; codigo: string; descripcion: string }
  detalles: { id: number; idDetalle: number; orden: number; detalle: EstructuraDetalle }[]
}

const SCHEMAS: Record<number, string> = {
  101: SCHEMA_ET1_F1, 102: SCHEMA_ET1_F2, 103: SCHEMA_ET1_F3,
  201: SCHEMA_ET2_F1, 202: SCHEMA_ET2_F2, 203: SCHEMA_ET2_F3,
  301: SCHEMA_ET3_F1, 302: SCHEMA_ET3_F2, 303: SCHEMA_ET3_F3,
}

// Saved form data per BR (in-memory for demo session)
const savedDetalles: Record<string, BatchRecordDetalleData> = {}

// Closed processes per BR
const closedProcesses: BatchRecordProcesoCierre[] = []

// Liberation info per BR
const liberaciones: Record<number, BatchRecordLiberacionInfo> = {}

export const batchRecordApi = {
  buscar: async (f?: BusquedaBatchRecord): Promise<BatchRecord[]> => {
    await delay(400)
    let list = [...mockBatchRecords]
    if (f?.idEstado) list = list.filter(b => b.idEstado === f.idEstado)
    if (f?.idCentro) list = list.filter(b => b.idCentro === f.idCentro)
    return list
  },

  find: async (id: number): Promise<BatchRecord> => {
    await delay(300)
    const br = mockBatchRecords.find(b => b.idBatchRecord === id)
    if (!br) throw new Error(`BatchRecord ${id} no encontrado`)
    return { ...br }
  },

  getPreLlenado: async (idBatchRecord: number): Promise<PreLlenadoBR | null> => {
    await delay(300)
    return mockPreLlenados.find(p => p.idBatchRecord === idBatchRecord) ?? null
  },

  getEstructura: async (idBatchRecord: number): Promise<EstructuraProceso[]> => {
    await delay(400)
    const br = mockBatchRecords.find(b => b.idBatchRecord === idBatchRecord)
    if (!br) return []
    const estructura = mockRecetaEstructuras.find(e => e.idRecetaMaestra === br.idRecetaMaestra)
    if (!estructura) return []

    return estructura.procesos.map(rp => {
      const proceso = mockProcesosGlobal.find(p => p.id === rp.idProceso)
      return {
        id: rp.id, idProceso: rp.idProceso, orden: rp.orden,
        proceso: { id: rp.idProceso, codigo: proceso?.codigo ?? '', descripcion: proceso?.descripcion ?? '' },
        detalles: rp.detalles.map(rd => {
          const det = mockDetallesCatalogo.find(d => d.id === rd.idDetalle)
          const ef = mockEstrategiasFirma.find(e => e.id === (det?.idEstrategiaFirma ?? 1))
          return {
            id: rd.id, idDetalle: rd.idDetalle, orden: rd.orden,
            detalle: {
              id: rd.idDetalle, codigo: det?.codigo ?? '', descripcion: det?.descripcion ?? '',
              estado: 'Activo' as const, idEstrategiaFirma: det?.idEstrategiaFirma ?? null,
              jsonSchema: SCHEMAS[rd.idDetalle] ?? '{"components":[]}',
              estrategiaFirma: ef ? {
                id: ef.id,
                gruposDerogacion: ef.gruposDerogacion?.join(',') ?? null,
                firmas: ef.firmas.map(f => ({
                  idFirma: f.idFirma, texto: f.texto, orden: f.orden, activo: f.activo,
                  firma: { codigo: f.codigo, descripcion: f.texto, grupo: { nombre: f.grupo } },
                })),
              } : null,
            },
          }
        }),
      }
    })
  },

  getDetalles: async (idBatchRecord: number): Promise<BatchRecordDetalleData[]> => {
    await delay(300)
    return Object.values(savedDetalles).filter(d => d.idBatchRecord === idBatchRecord)
  },

  guardarDetalle: async (idBatchRecord: number, idDetalle: number, jsonData: string): Promise<Resultado<BatchRecordDetalleData>> => {
    await delay(400)
    const key = `${idBatchRecord}:${idDetalle}`
    const item: BatchRecordDetalleData = {
      id: Date.now(), idBatchRecord, idDetalle, jsonData, actualizadoEn: new Date().toISOString(),
    }
    savedDetalles[key] = item
    return { estado: true, mensaje: 'Datos guardados', datos: item }
  },

  getProcesosCerrados: async (idBatchRecord: number): Promise<BatchRecordProcesoCierre[]> => {
    await delay(200)
    return closedProcesses.filter(c => c.idBatchRecord === idBatchRecord)
  },

  cerrarProceso: async (idBatchRecord: number, idProceso: number): Promise<Resultado<BatchRecordProcesoCierre>> => {
    await delay(400)
    const item: BatchRecordProcesoCierre = { id: Date.now(), idBatchRecord, idProceso, idUsuario: 1, cerradoEn: new Date().toISOString() }
    closedProcesses.push(item)
    return { estado: true, mensaje: 'Proceso cerrado', datos: item }
  },

  getFirmas: async (idBatchRecord: number): Promise<BatchRecordFirmaRegistrada[]> => {
    await delay(300)
    const firmasBR = mockFirmadosBR[idBatchRecord] ?? {}
    return Object.entries(firmasBR).map(([key, f], idx) => {
      const [, detalleId, firmaId] = key.split(':')
      return {
        id: idx + 1, idBatchRecord, idDetalle: Number(detalleId), bloqueKey: key,
        idFirma: Number(firmaId), idUsuario: f.idUsuario, firmadoEn: `${f.fecha}T${f.hora}:00`,
        usuario: { nombres: f.nombre.split(' ')[0], apellidos: f.nombre.split(' ').slice(1).join(' '), login: f.loginUsuario },
        firma: { idFirma: Number(firmaId), codigo: `F-${String(firmaId).padStart(3,'0')}`, descripcion: f.cargo, texto: f.cargo, idGrupo: 1, grupo: { nombre: f.cargo } },
      }
    })
  },

  firmar: async (idBatchRecord: number, idDetalle: number, idFirma: number, _login: string, _pin: string, bloqueKey = '') => {
    await delay(600)
    const key = bloqueKey || `cie:${idDetalle}:${idFirma}`
    if (!mockFirmadosBR[idBatchRecord]) mockFirmadosBR[idBatchRecord] = {}
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    mockFirmadosBR[idBatchRecord][key] = {
      nombre: 'Usuario Demo', cargo: 'Técnico Demo',
      fecha: `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`,
      hora: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      loginUsuario: _login, idUsuario: 1,
    }
    return { estado: true, mensaje: 'Firma registrada (modo demo)' }
  },

  derogarFirma: async (_idBatchRecord: number, _idFirmaRegistro: number, _login: string, _pin: string, _motivo: string): Promise<Resultado> => {
    await delay(500)
    return { estado: true, mensaje: 'Firma derogada (modo demo)' }
  },

  getLiberacion: async (idBatchRecord: number): Promise<BatchRecordLiberacionInfo | null> => {
    await delay(200)
    return liberaciones[idBatchRecord] ?? null
  },

  liberar: async (idBatchRecord: number, _login: string, _pin: string, observacion?: string): Promise<Resultado<BatchRecordLiberacionInfo>> => {
    await delay(600)
    const info: BatchRecordLiberacionInfo = {
      idBatchRecord, idUsuario: 1, observacion: observacion ?? null, liberadoEn: new Date().toISOString(),
      usuario: { nombres: 'Usuario', apellidos: 'Demo', login: _login },
    }
    liberaciones[idBatchRecord] = info
    const br = mockBatchRecords.find(b => b.idBatchRecord === idBatchRecord)
    if (br) { br.idEstado = 2; br.porcentajeAvance = 100 }
    return { estado: true, mensaje: 'Lote liberado (modo demo)', datos: info }
  },

  cancelar: async (idBatchRecord: number, _login: string, _pin: string, motivo: string): Promise<Resultado> => {
    await delay(600)
    const br = mockBatchRecords.find(b => b.idBatchRecord === idBatchRecord)
    if (br) { br.idEstado = 3; br.motivoEstado = motivo }
    return { estado: true, mensaje: 'Lote cancelado (modo demo)' }
  },

  validarFirma: (login: string, pin: string) => authApi.validarFirma(login, pin),
}
