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
const savedDetalles: Record<string, BatchRecordDetalleData> = {
  // BR-4: SYNTRAVEX 500mg Caps — Lote SYNZ-2025-004, OP-4 — 100% completo, liberado
  '4:101': {
    id: 4101, idBatchRecord: 4, idDetalle: 101,
    jsonData: JSON.stringify({
      txtProducto: 'SYNTRAVEX 500mg Cápsulas', txtCodigo: 'SYNZ-500-CAP',
      txtLote: 'SYNZ-2025-004', txtOrden: 'OP-4',
      numTamanoLote: 126000, selSala: 'Sala-A Dispensación',
      txtResponsable: 'Carlos Méndez', txtBalanzaId: 'BAL-001',
      numTemperatura: 21.4, numHumedad: 46.2,
      txtEstadoTemp: 'CONFORME', txtEstadoHum: 'CONFORME',
      dtInicioEtapa1: '2025-03-10T07:30:00',
      txtVerifGlobal: 'APROBADO', txtObsEtapa1: 'Sin observaciones. Condiciones ambientales dentro de rango.',
    }),
    actualizadoEn: '2025-03-10T08:15:00.000Z',
  },
  '4:102': {
    id: 4102, idBatchRecord: 4, idDetalle: 102,
    jsonData: JSON.stringify({
      txtBalanzaPesaje: 'BAL-002 Mettler Toledo XS6002S',
      dtCalibBalanza: '2025-03-01', dtVigenciaBalanza: '2025-06-01',
      txtEstadoCalib: 'VIGENTE',
      dgPesaje: [
        { txtMaterial: 'Sintravelina Base', txtCodigoMP: 'MP-SYN-01', txtLoteProveedor: 'PRV-SYN-2025-02',
          numCantTeorica: 30.6, numCantPesada: 30.58, numDiferencia: -0.02, numPctDesv: 0.07, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '08:05' },
        { txtMaterial: 'HPMC K15M', txtCodigoMP: 'MP-HPMC-02', txtLoteProveedor: 'PRV-HPMC-2025-01',
          numCantTeorica: 21.6, numCantPesada: 21.63, numDiferencia: 0.03, numPctDesv: 0.14, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '08:22' },
        { txtMaterial: 'Cápsulas Talla 0', txtCodigoMP: 'MP-CAP-03', txtLoteProveedor: 'PRV-CAP-2025-03',
          numCantTeorica: 126000, numCantPesada: 126000, numDiferencia: 0, numPctDesv: 0.00, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '08:40' },
        { txtMaterial: 'MCC PH-102', txtCodigoMP: 'MP-MCC-04', txtLoteProveedor: 'PRV-MCC-2025-01',
          numCantTeorica: 10.5, numCantPesada: 10.59, numDiferencia: 0.09, numPctDesv: 0.86, txtEstadoPeso: 'ADVERTENCIA', txtHoraPesaje: '08:55' },
        { txtMaterial: 'Estearato de Magnesio', txtCodigoMP: 'MP-EST-05', txtLoteProveedor: 'PRV-EST-2025-02',
          numCantTeorica: 0.6, numCantPesada: 0.601, numDiferencia: 0.001, numPctDesv: 0.17, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '09:08' },
      ],
      numTotalTeorico: 189.3, numTotalPesado: 189.391,
      numRendDispensacion: 99.95,
      txtAprobDispensacion: 'APROBADO',
    }),
    actualizadoEn: '2025-03-10T09:15:00.000Z',
  },
  '4:103': {
    id: 4103, idBatchRecord: 4, idDetalle: 103,
    jsonData: JSON.stringify({
      dgChecklist: [
        { txtItem: '1', txtDescripcion: 'Verificación de limpieza de sala y equipos', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '2', txtDescripcion: 'Documentación de orden de proceso disponible', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '3', txtDescripcion: 'Materias primas liberadas por CCA', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '4', txtDescripcion: 'Equipos calibrados dentro de vigencia', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '5', txtDescripcion: 'EPP completo del operador verificado', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '6', txtDescripcion: 'Condiciones ambientales registradas y conformes', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '7', txtDescripcion: 'Recipientes etiquetados correctamente', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '8', txtDescripcion: 'Desviación registrada para MCC PH-102 (0.86%)', selEstado: 'SI', txtObsItem: 'DEV-2025-042 — dentro de límite de acción del 1.0%' },
      ],
      numItemsSI: 8, numItemsNO: 0,
      txtEstadoFinalET1: 'APROBADO',
      dtCierreET1: '2025-03-10T09:45:00',
      numDuracionET1: 135,
      txtNumDesviacion: 'DEV-2025-042',
    }),
    actualizadoEn: '2025-03-10T09:50:00.000Z',
  },
  '4:201': {
    id: 4201, idBatchRecord: 4, idDetalle: 201,
    jsonData: JSON.stringify({
      txtProducto: 'SYNTRAVEX 500mg Cápsulas', txtCodigo: 'SYNZ-500-CAP',
      txtLote: 'SYNZ-2025-004',
      selEquipo: 'ENCAPS-01 MG2 Planeta',
      txtSerieEquipo: 'MG2-SN-20198742',
      selSalaProduccion: 'Sala-B Encapsulado',
      txtOperadorPrincipal: 'Laura Ríos',
      selTamanoCap: 'Talla 0 — Transparente',
      numVelocidadObj: 85000, numPesoObjetivo: 680, numLimiteAcept: 10,
      numPesoMin: 670, numPesoMax: 690,
      numProdTeorica: 126000, numTiempoEstimado: 90,
      dgPreArranque: [
        { txtItem: 'Limpieza equipo', selOK: 'OK' },
        { txtItem: 'Tamaño cápsula correcto', selOK: 'OK' },
        { txtItem: 'Peso tara recipiente registrado', selOK: 'OK' },
        { txtItem: 'Velocidad inicial verificada', selOK: 'OK' },
      ],
      dtInicioEncap: '2025-03-10T10:30:00',
      txtAprobPreArranque: 'APROBADO',
    }),
    actualizadoEn: '2025-03-10T10:35:00.000Z',
  },
  '4:202': {
    id: 4202, idBatchRecord: 4, idDetalle: 202,
    jsonData: JSON.stringify({
      txtProducto: 'SYNTRAVEX 500mg Cápsulas', txtCodigo: 'SYNZ-500-CAP', txtLote: 'SYNZ-2025-004',
      numPesoObjCIP: 680, numLimInfCIP: 670, numLimSupCIP: 690, numRSDMax: 1.5,
      dgCIP: [
        { numC1: 681, numC2: 679, numC3: 682, numC4: 678, numC5: 680, numC6: 683, numC7: 679, numC8: 681, numC9: 680, numC10: 682, numPromedioCIP: 680.5, numMinCIP: 678, numMaxCIP: 683, numRSDCIP: 0.22, txtEstadoCIP: 'CONFORME' },
        { numC1: 680, numC2: 681, numC3: 679, numC4: 682, numC5: 680, numC6: 679, numC7: 681, numC8: 680, numC9: 678, numC10: 683, numPromedioCIP: 680.3, numMinCIP: 678, numMaxCIP: 683, numRSDCIP: 0.19, txtEstadoCIP: 'CONFORME' },
        { numC1: 679, numC2: 680, numC3: 681, numC4: 680, numC5: 682, numC6: 679, numC7: 680, numC8: 681, numC9: 683, numC10: 679, numPromedioCIP: 680.4, numMinCIP: 679, numMaxCIP: 683, numRSDCIP: 0.16, txtEstadoCIP: 'CONFORME' },
        { numC1: 682, numC2: 680, numC3: 679, numC4: 681, numC5: 680, numC6: 682, numC7: 679, numC8: 680, numC9: 681, numC10: 680, numPromedioCIP: 680.4, numMinCIP: 679, numMaxCIP: 682, numRSDCIP: 0.11, txtEstadoCIP: 'CONFORME' },
        { numC1: 680, numC2: 681, numC3: 680, numC4: 679, numC5: 682, numC6: 680, numC7: 681, numC8: 679, numC9: 680, numC10: 681, numPromedioCIP: 680.3, numMinCIP: 679, numMaxCIP: 682, numRSDCIP: 0.10, txtEstadoCIP: 'CONFORME' },
      ],
      numVelocidadActual: 86200,
      numTotalMuestras: 50, numPromedioGlobal: 680.4, numMinGlobal: 678, numMaxGlobal: 683,
      numFueraEspec: 0, txtEstadoGlobalCIP: 'APROBADO',
    }),
    actualizadoEn: '2025-03-10T12:10:00.000Z',
  },
  '4:203': {
    id: 4203, idBatchRecord: 4, idDetalle: 203,
    jsonData: JSON.stringify({
      dgChecklist: [
        { txtItem: '1', txtDescripcion: 'Limpieza final de equipo realizada', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '2', txtDescripcion: 'Conteo de cápsulas producidas vs teórico', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '3', txtDescripcion: 'Recipientes sellados y etiquetados', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '4', txtDescripcion: 'Rechazos transferidos a área de destrucción', selEstado: 'SI', txtObsItem: '' },
      ],
      dtFinEncap: '2025-03-10T12:30:00',
      numDuracionEncap: 120,
      numVelPromedio: 85800,
      numCapsulasProd: 125640,
      numRechazos: 360,
      numMuestrasTotal: 50,
      numProdTeorRef: 126000,
      numCapsAptas: 125640,
      numRendEncap: 99.71,
      numPerdidaEncap: 0.29,
      txtEstadoRendEncap: 'APROBADO',
    }),
    actualizadoEn: '2025-03-10T12:40:00.000Z',
  },
  '4:301': {
    id: 4301, idBatchRecord: 4, idDetalle: 301,
    jsonData: JSON.stringify({
      numTamLoteInsp: 125640, selNivelInsp: 'NI-II Normal',
      numMuestraAQL: 200, txtInspector: 'Ana Torres',
      numAQLCritico: 0, numAQLMayor: 1.0, numAQLMenor: 2.5,
      dgInspeccion: [
        { txtSubLote: 'SL-001', txtHoraInsp: '13:10', numUnidInsp: 50, numDefCrit: 0, numDefMayor: 0, numDefMenor: 1, numPctDefect: 2.0, txtEstadoAQL: 'APROBADO' },
        { txtSubLote: 'SL-002', txtHoraInsp: '13:35', numUnidInsp: 50, numDefCrit: 0, numDefMayor: 0, numDefMenor: 0, numPctDefect: 0.0, txtEstadoAQL: 'APROBADO' },
        { txtSubLote: 'SL-003', txtHoraInsp: '14:00', numUnidInsp: 50, numDefCrit: 0, numDefMayor: 1, numDefMenor: 0, numPctDefect: 2.0, txtEstadoAQL: 'APROBADO' },
        { txtSubLote: 'SL-004', txtHoraInsp: '14:25', numUnidInsp: 50, numDefCrit: 0, numDefMayor: 0, numDefMenor: 1, numPctDefect: 2.0, txtEstadoAQL: 'APROBADO' },
      ],
      numTotalInsp: 200, numPctDefGlobal: 1.5,
      txtDecisionAQL: 'APROBADO — Lote conforme a NI-II AQL 1.0/2.5',
    }),
    actualizadoEn: '2025-03-10T14:50:00.000Z',
  },
  '4:302': {
    id: 4302, idBatchRecord: 4, idDetalle: 302,
    jsonData: JSON.stringify({
      dgMatEmpaque: [
        { txtMatNombre: 'Blister PVC/PVDC 250µm', txtMatCodigo: 'ME-BLI-01', txtMatLote: 'BLI-2025-03', txtMatUnidad: 'unidades',
          numMatCantTeo: 10500, numMatCantUsada: 10488, numMatSobrante: 12, numMatPctUso: 99.89 },
        { txtMatNombre: 'Papel aluminio 20µm', txtMatCodigo: 'ME-ALU-02', txtMatLote: 'ALU-2025-03', txtMatUnidad: 'metros',
          numMatCantTeo: 2100, numMatCantUsada: 2096, numMatSobrante: 4, numMatPctUso: 99.81 },
        { txtMatNombre: 'Caja plegadiza 12 blisters', txtMatCodigo: 'ME-CAJ-03', txtMatLote: 'CAJ-2025-02', txtMatUnidad: 'unidades',
          numMatCantTeo: 875, numMatCantUsada: 872, numMatSobrante: 3, numMatPctUso: 99.66 },
        { txtMatNombre: 'Prospecto impreso', txtMatCodigo: 'ME-PRO-04', txtMatLote: 'PRO-2025-01', txtMatUnidad: 'unidades',
          numMatCantTeo: 875, numMatCantUsada: 872, numMatSobrante: 3, numMatPctUso: 99.66 },
      ],
      numCapsIngreso: 125640,
      numBlistProd: 10488, numBlistRech: 22, numBlistAprobados: 10466,
      numCajasProd: 872, numCajasRech: 2, numCajasAprobadas: 870,
      numCapsEnCajas: 125040,
      numRendEmpaque: 99.52, numRendGlobal: 99.24,
      numCajasFinales: 870,
      txtEstadoRendGlobal: 'APROBADO',
      dtInicioEmpaque: '2025-03-10T15:00:00',
      dtFinEmpaque: '2025-03-10T17:45:00',
      numDurEmpaque: 165,
    }),
    actualizadoEn: '2025-03-10T17:50:00.000Z',
  },
  '4:303': {
    id: 4303, idBatchRecord: 4, idDetalle: 303,
    jsonData: JSON.stringify({
      txtProducto: 'SYNTRAVEX 500mg Cápsulas', txtCodigo: 'SYNZ-500-CAP',
      txtLote: 'SYNZ-2025-004', txtLoteInspCierre: 'SYNZ-2025-004-A',
    }),
    actualizadoEn: '2025-03-10T18:00:00.000Z',
  },

  // BR-6: SYNTRAVEX 500mg Caps — Lote SYNZ-2025-006, OP-6 — solo encabezado ET1
  '6:101': {
    id: 6101, idBatchRecord: 6, idDetalle: 101,
    jsonData: JSON.stringify({
      txtProducto: 'SYNTRAVEX 500mg Cápsulas', txtCodigo: 'SYNZ-500-CAP',
      txtLote: 'SYNZ-2025-006', txtOrden: 'OP-6',
      numTamanoLote: 84000, selSala: 'Sala-A Dispensación',
      txtResponsable: 'Carlos Méndez', txtBalanzaId: 'BAL-001',
      numTemperatura: 22.1, numHumedad: 44.8,
      txtEstadoTemp: 'CONFORME', txtEstadoHum: 'CONFORME',
      dtInicioEtapa1: '',
      txtVerifGlobal: '', txtObsEtapa1: '',
    }),
    actualizadoEn: new Date().toISOString(),
  },
}

// Closed processes per BR
const closedProcesses: BatchRecordProcesoCierre[] = [
  { id: 40001, idBatchRecord: 4, idProceso: 1, idUsuario: 1, cerradoEn: '2025-03-10T09:50:00.000Z' },
  { id: 40002, idBatchRecord: 4, idProceso: 2, idUsuario: 1, cerradoEn: '2025-03-10T12:40:00.000Z' },
  { id: 40003, idBatchRecord: 4, idProceso: 3, idUsuario: 1, cerradoEn: '2025-03-10T18:00:00.000Z' },
]

// Liberation info per BR
const liberaciones: Record<number, BatchRecordLiberacionInfo> = {
  4: {
    idBatchRecord: 4, idUsuario: 2, observacion: 'Lote revisado. Todos los controles conformes. Desviación DEV-2025-042 evaluada y cerrada sin impacto en calidad.',
    liberadoEn: '2025-03-11T09:30:00.000Z',
    usuario: { nombres: 'Diana', apellidos: 'Morales', login: 'dmorales' },
  },
}

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
