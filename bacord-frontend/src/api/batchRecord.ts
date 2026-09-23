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

  // ── BR-1: SYNAPTOMAX 250mg — Lote LL-2024-001, OP-2024-001 — 33% (ET1 completa) ──
  '1:101': {
    id: 1101, idBatchRecord: 1, idDetalle: 101,
    jsonData: JSON.stringify({
      txtProducto: 'SYNAPTOMAX 250mg Cápsulas Lib. Modificada', txtCodigo: 'SYN-250-CL',
      txtLote: 'LL-2024-001', txtOrden: 'OP-2024-001',
      numTamanoLote: 105000, selSala: 'Sala-A Dispensación',
      txtResponsable: 'Ana Torres', txtBalanzaId: 'BAL-001',
      numTemperatura: 22.3, numHumedad: 48.1,
      txtEstadoTemp: 'CONFORME', txtEstadoHum: 'CONFORME',
      dtInicioEtapa1: '2024-08-05T07:00:00',
      txtVerifGlobal: 'APROBADO', txtObsEtapa1: 'Condiciones ambientales dentro de rango. Sin observaciones.',
    }),
    actualizadoEn: '2024-08-05T07:45:00.000Z',
  },
  '1:102': {
    id: 1102, idBatchRecord: 1, idDetalle: 102,
    jsonData: JSON.stringify({
      txtBalanzaPesaje: 'BAL-001 Mettler Toledo MS8001',
      dtCalibBalanza: '2024-07-15', dtVigenciaBalanza: '2024-10-15',
      txtEstadoCalib: 'VIGENTE',
      dgPesaje: [
        { txtMaterial: 'Synaptozina HCl (PA)', txtCodigoMP: 'MP-SYN-01', txtLoteProveedor: 'LC-SYN-001', numCantTeorica: 25.5, numCantPesada: 25.49, numDiferencia: -0.01, numPctDesv: 0.04, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '07:15' },
        { txtMaterial: 'HPMC K15M', txtCodigoMP: 'MP-HPMC-02', txtLoteProveedor: 'LC-HPM-002', numCantTeorica: 18.0, numCantPesada: 18.02, numDiferencia: 0.02, numPctDesv: 0.11, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '07:35' },
        { txtMaterial: 'Cápsulas Gelatina #00', txtCodigoMP: 'MP-CAP-03', txtLoteProveedor: 'LC-CAP-003', numCantTeorica: 105000, numCantPesada: 105000, numDiferencia: 0, numPctDesv: 0.00, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '07:55' },
        { txtMaterial: 'Celulosa MCC PH-102', txtCodigoMP: 'MP-MCC-04', txtLoteProveedor: 'LC-MCC-004', numCantTeorica: 8.75, numCantPesada: 8.74, numDiferencia: -0.01, numPctDesv: 0.11, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '08:10' },
        { txtMaterial: 'Estearato de Magnesio', txtCodigoMP: 'MP-EST-05', txtLoteProveedor: 'LC-EST-005', numCantTeorica: 0.5, numCantPesada: 0.501, numDiferencia: 0.001, numPctDesv: 0.20, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '08:20' },
      ],
      numTotalTeorico: 52.75, numTotalPesado: 52.751,
      numRendDispensacion: 99.998, txtAprobDispensacion: 'APROBADO',
    }),
    actualizadoEn: '2024-08-05T08:30:00.000Z',
  },
  '1:103': {
    id: 1103, idBatchRecord: 1, idDetalle: 103,
    jsonData: JSON.stringify({
      dgChecklist: [
        { txtItem: '1', txtDescripcion: 'Verificación de limpieza de sala y equipos', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '2', txtDescripcion: 'Documentación de orden de proceso disponible', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '3', txtDescripcion: 'Materias primas liberadas por CCA', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '4', txtDescripcion: 'Equipos calibrados dentro de vigencia', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '5', txtDescripcion: 'EPP completo del operador verificado', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '6', txtDescripcion: 'Condiciones ambientales registradas y conformes', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '7', txtDescripcion: 'Recipientes etiquetados correctamente', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '8', txtDescripcion: 'Sin desviaciones en dispensación', selEstado: 'SI', txtObsItem: '' },
      ],
      numItemsSI: 8, numItemsNO: 0,
      txtEstadoFinalET1: 'APROBADO', dtCierreET1: '2024-08-05T09:00:00', numDuracionET1: 120, txtNumDesviacion: '',
    }),
    actualizadoEn: '2024-08-05T09:05:00.000Z',
  },

  // ── BR-2: CARBOPLEX 500mg — Lote LL-2024-002, OP-2024-002 — 67% (ET1+ET2 completas) ──
  '2:101': {
    id: 2101, idBatchRecord: 2, idDetalle: 101,
    jsonData: JSON.stringify({
      txtProducto: 'CARBOPLEX 500mg Tabletas Lib. Inmediata', txtCodigo: 'CAR-500-TLI',
      txtLote: 'LL-2024-002', txtOrden: 'OP-2024-002',
      numTamanoLote: 500000, selSala: 'Sala-C Dispensación',
      txtResponsable: 'Roberto Vega', txtBalanzaId: 'BAL-003',
      numTemperatura: 23.1, numHumedad: 50.4,
      txtEstadoTemp: 'CONFORME', txtEstadoHum: 'CONFORME',
      dtInicioEtapa1: '2024-10-12T07:30:00',
      txtVerifGlobal: 'APROBADO', txtObsEtapa1: 'Sin observaciones.',
    }),
    actualizadoEn: '2024-10-12T08:10:00.000Z',
  },
  '2:102': {
    id: 2102, idBatchRecord: 2, idDetalle: 102,
    jsonData: JSON.stringify({
      txtBalanzaPesaje: 'BAL-003 Sartorius Entris II',
      dtCalibBalanza: '2024-10-01', dtVigenciaBalanza: '2025-01-01',
      txtEstadoCalib: 'VIGENTE',
      dgPesaje: [
        { txtMaterial: 'Carboplosina Base (PA)', txtCodigoMP: 'MP-CAR-01', txtLoteProveedor: 'LC-CAR-010', numCantTeorica: 125.0, numCantPesada: 124.97, numDiferencia: -0.03, numPctDesv: 0.02, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '08:15' },
        { txtMaterial: 'Lactosa Monohidrato', txtCodigoMP: 'MP-LAC-02', txtLoteProveedor: 'LC-LAC-011', numCantTeorica: 87.5, numCantPesada: 87.53, numDiferencia: 0.03, numPctDesv: 0.03, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '08:40' },
        { txtMaterial: 'Almidón de Maíz', txtCodigoMP: 'MP-ALM-03', txtLoteProveedor: 'LC-ALM-012', numCantTeorica: 25.0, numCantPesada: 25.01, numDiferencia: 0.01, numPctDesv: 0.04, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '09:00' },
        { txtMaterial: 'HPC-SL (Aglutinante)', txtCodigoMP: 'MP-HPC-04', txtLoteProveedor: 'LC-HPC-013', numCantTeorica: 10.0, numCantPesada: 10.0, numDiferencia: 0.0, numPctDesv: 0.00, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '09:15' },
        { txtMaterial: 'Estearato de Magnesio', txtCodigoMP: 'MP-EST-05', txtLoteProveedor: 'LC-EST-014', numCantTeorica: 2.5, numCantPesada: 2.502, numDiferencia: 0.002, numPctDesv: 0.08, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '09:25' },
      ],
      numTotalTeorico: 250.0, numTotalPesado: 250.002,
      numRendDispensacion: 99.999, txtAprobDispensacion: 'APROBADO',
    }),
    actualizadoEn: '2024-10-12T09:40:00.000Z',
  },
  '2:103': {
    id: 2103, idBatchRecord: 2, idDetalle: 103,
    jsonData: JSON.stringify({
      dgChecklist: [
        { txtItem: '1', txtDescripcion: 'Verificación de limpieza de sala y equipos', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '2', txtDescripcion: 'Documentación de orden de proceso disponible', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '3', txtDescripcion: 'Materias primas liberadas por CCA', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '4', txtDescripcion: 'Equipos calibrados dentro de vigencia', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '5', txtDescripcion: 'EPP completo del operador verificado', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '6', txtDescripcion: 'Condiciones ambientales conformes', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '7', txtDescripcion: 'Recipientes etiquetados correctamente', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '8', txtDescripcion: 'Sin desviaciones en dispensación', selEstado: 'SI', txtObsItem: '' },
      ],
      numItemsSI: 8, numItemsNO: 0,
      txtEstadoFinalET1: 'APROBADO', dtCierreET1: '2024-10-12T10:00:00', numDuracionET1: 150, txtNumDesviacion: '',
    }),
    actualizadoEn: '2024-10-12T10:05:00.000Z',
  },
  '2:201': {
    id: 2201, idBatchRecord: 2, idDetalle: 201,
    jsonData: JSON.stringify({
      txtProducto: 'CARBOPLEX 500mg Tabletas', txtCodigo: 'CAR-500-TLI', txtLote: 'LL-2024-002',
      selEquipo: 'TABLETEADORA-01 Korsch XL100',
      txtSerieEquipo: 'KOR-SN-18004521', selSalaProduccion: 'Sala-D Compresión',
      txtOperadorPrincipal: 'Miguel Herrera',
      selTamanoCap: 'Tableta oblonga 19mm',
      numVelocidadObj: 120000, numPesoObjetivo: 500, numLimiteAcept: 10,
      numPesoMin: 490, numPesoMax: 510,
      numProdTeorica: 500000, numTiempoEstimado: 240,
      dgPreArranque: [
        { txtItem: 'Limpieza equipo', selOK: 'OK' },
        { txtItem: 'Punzones y matrices verificados', selOK: 'OK' },
        { txtItem: 'Peso tara recipiente registrado', selOK: 'OK' },
        { txtItem: 'Fuerza de compresión calibrada', selOK: 'OK' },
      ],
      dtInicioEncap: '2024-10-12T10:30:00', txtAprobPreArranque: 'APROBADO',
    }),
    actualizadoEn: '2024-10-12T10:35:00.000Z',
  },
  '2:202': {
    id: 2202, idBatchRecord: 2, idDetalle: 202,
    jsonData: JSON.stringify({
      txtProducto: 'CARBOPLEX 500mg', txtCodigo: 'CAR-500-TLI', txtLote: 'LL-2024-002',
      numPesoObjCIP: 500, numLimInfCIP: 490, numLimSupCIP: 510, numRSDMax: 2.0,
      dgCIP: [
        { numC1: 501, numC2: 499, numC3: 500, numC4: 502, numC5: 498, numC6: 501, numC7: 500, numC8: 499, numC9: 501, numC10: 500, numPromedioCIP: 500.1, numMinCIP: 498, numMaxCIP: 502, numRSDCIP: 0.28, txtEstadoCIP: 'CONFORME' },
        { numC1: 500, numC2: 501, numC3: 499, numC4: 500, numC5: 502, numC6: 500, numC7: 501, numC8: 499, numC9: 500, numC10: 501, numPromedioCIP: 500.3, numMinCIP: 499, numMaxCIP: 502, numRSDCIP: 0.22, txtEstadoCIP: 'CONFORME' },
        { numC1: 499, numC2: 500, numC3: 501, numC4: 500, numC5: 499, numC6: 501, numC7: 500, numC8: 502, numC9: 499, numC10: 500, numPromedioCIP: 500.1, numMinCIP: 499, numMaxCIP: 502, numRSDCIP: 0.20, txtEstadoCIP: 'CONFORME' },
      ],
      numVelocidadActual: 121500,
      numTotalMuestras: 30, numPromedioGlobal: 500.2, numMinGlobal: 498, numMaxGlobal: 502,
      numFueraEspec: 0, txtEstadoGlobalCIP: 'APROBADO',
    }),
    actualizadoEn: '2024-10-13T12:00:00.000Z',
  },
  '2:203': {
    id: 2203, idBatchRecord: 2, idDetalle: 203,
    jsonData: JSON.stringify({
      dgChecklist: [
        { txtItem: '1', txtDescripcion: 'Limpieza final de equipo realizada', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '2', txtDescripcion: 'Conteo de tabletas producidas vs teórico', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '3', txtDescripcion: 'Recipientes sellados y etiquetados', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '4', txtDescripcion: 'Rechazos transferidos a área de destrucción', selEstado: 'SI', txtObsItem: '' },
      ],
      dtFinEncap: '2024-10-13T14:00:00', numDuracionEncap: 210,
      numVelPromedio: 120800, numCapsulasProd: 499200, numRechazos: 800,
      numMuestrasTotal: 30, numProdTeorRef: 500000,
      numCapsAptas: 499200, numRendEncap: 99.84, numPerdidaEncap: 0.16,
      txtEstadoRendEncap: 'APROBADO',
    }),
    actualizadoEn: '2024-10-13T14:15:00.000Z',
  },

  // ── BR-3: INFLACORT 20mg — Lote LL-2024-003, OP-2024-003 — 89% (ET1+ET2+ET3 sin cierre) ──
  '3:101': {
    id: 3101, idBatchRecord: 3, idDetalle: 101,
    jsonData: JSON.stringify({
      txtProducto: 'INFLACORT 20mg Suspensión Oral', txtCodigo: 'INF-20-SO',
      txtLote: 'LL-2024-003', txtOrden: 'OP-2024-003',
      numTamanoLote: 500, selSala: 'Sala-E Líquidos',
      txtResponsable: 'Laura Ríos', txtBalanzaId: 'BAL-002',
      numTemperatura: 20.5, numHumedad: 52.0,
      txtEstadoTemp: 'CONFORME', txtEstadoHum: 'CONFORME',
      dtInicioEtapa1: '2024-11-20T07:00:00',
      txtVerifGlobal: 'APROBADO', txtObsEtapa1: 'Temperatura dentro de rango para suspensión oral. Sin observaciones.',
    }),
    actualizadoEn: '2024-11-20T07:50:00.000Z',
  },
  '3:102': {
    id: 3102, idBatchRecord: 3, idDetalle: 102,
    jsonData: JSON.stringify({
      txtBalanzaPesaje: 'BAL-002 Mettler Toledo PB8001',
      dtCalibBalanza: '2024-11-01', dtVigenciaBalanza: '2025-02-01',
      txtEstadoCalib: 'VIGENTE',
      dgPesaje: [
        { txtMaterial: 'Inflacortisona Micronizada (PA)', txtCodigoMP: 'MP-INF-01', txtLoteProveedor: 'LC-INF-020', numCantTeorica: 10.0, numCantPesada: 10.0, numDiferencia: 0.0, numPctDesv: 0.00, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '07:10' },
        { txtMaterial: 'CMC Sódica (Viscosante)', txtCodigoMP: 'MP-CMC-02', txtLoteProveedor: 'LC-CMC-021', numCantTeorica: 5.0, numCantPesada: 5.01, numDiferencia: 0.01, numPctDesv: 0.20, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '07:25' },
        { txtMaterial: 'Sorbitol 70% (Edulcorante)', txtCodigoMP: 'MP-SOR-03', txtLoteProveedor: 'LC-SOR-022', numCantTeorica: 50.0, numCantPesada: 49.98, numDiferencia: -0.02, numPctDesv: 0.04, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '07:45' },
        { txtMaterial: 'Metilparabeno (Conservante)', txtCodigoMP: 'MP-PAR-04', txtLoteProveedor: 'LC-PAR-023', numCantTeorica: 0.5, numCantPesada: 0.501, numDiferencia: 0.001, numPctDesv: 0.20, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '08:00' },
      ],
      numTotalTeorico: 65.5, numTotalPesado: 65.491,
      numRendDispensacion: 99.986, txtAprobDispensacion: 'APROBADO',
    }),
    actualizadoEn: '2024-11-20T08:15:00.000Z',
  },
  '3:103': {
    id: 3103, idBatchRecord: 3, idDetalle: 103,
    jsonData: JSON.stringify({
      dgChecklist: [
        { txtItem: '1', txtDescripcion: 'Verificación de limpieza de sala y equipos', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '2', txtDescripcion: 'Documentación de orden de proceso disponible', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '3', txtDescripcion: 'Materias primas liberadas por CCA', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '4', txtDescripcion: 'Equipos calibrados dentro de vigencia', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '5', txtDescripcion: 'EPP completo del operador verificado', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '6', txtDescripcion: 'Condiciones ambientales conformes para líquidos', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '7', txtDescripcion: 'Recipientes etiquetados correctamente', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '8', txtDescripcion: 'Sin desviaciones en dispensación', selEstado: 'SI', txtObsItem: '' },
      ],
      numItemsSI: 8, numItemsNO: 0,
      txtEstadoFinalET1: 'APROBADO', dtCierreET1: '2024-11-20T08:30:00', numDuracionET1: 90, txtNumDesviacion: '',
    }),
    actualizadoEn: '2024-11-20T08:35:00.000Z',
  },
  '3:201': {
    id: 3201, idBatchRecord: 3, idDetalle: 201,
    jsonData: JSON.stringify({
      txtProducto: 'INFLACORT 20mg Suspensión Oral', txtCodigo: 'INF-20-SO', txtLote: 'LL-2024-003',
      selEquipo: 'MEZCLADOR-01 IKA LR 1000',
      txtSerieEquipo: 'IKA-SN-20214890', selSalaProduccion: 'Sala-E Mezclado Líquidos',
      txtOperadorPrincipal: 'Laura Ríos',
      selTamanoCap: 'N/A — Suspensión',
      numVelocidadObj: 150, numPesoObjetivo: 0, numLimiteAcept: 0,
      numPesoMin: 0, numPesoMax: 0,
      numProdTeorica: 500, numTiempoEstimado: 180,
      dgPreArranque: [
        { txtItem: 'Limpieza equipo mezclador', selOK: 'OK' },
        { txtItem: 'pH-metro calibrado', selOK: 'OK' },
        { txtItem: 'Temperatura del agua purificada verificada', selOK: 'OK' },
        { txtItem: 'Agitación verificada a velocidad objetivo', selOK: 'OK' },
      ],
      dtInicioEncap: '2024-11-21T07:00:00', txtAprobPreArranque: 'APROBADO',
    }),
    actualizadoEn: '2024-11-21T07:10:00.000Z',
  },
  '3:202': {
    id: 3202, idBatchRecord: 3, idDetalle: 202,
    jsonData: JSON.stringify({
      txtProducto: 'INFLACORT 20mg', txtCodigo: 'INF-20-SO', txtLote: 'LL-2024-003',
      numPesoObjCIP: 0, numLimInfCIP: 0, numLimSupCIP: 0, numRSDMax: 0,
      dgCIP: [
        { numC1: 4.98, numC2: 5.01, numC3: 4.99, numC4: 5.02, numC5: 5.00, numC6: 4.98, numC7: 5.01, numC8: 5.00, numC9: 4.99, numC10: 5.01, numPromedioCIP: 4.999, numMinCIP: 4.98, numMaxCIP: 5.02, numRSDCIP: 0.31, txtEstadoCIP: 'CONFORME' },
        { numC1: 5.00, numC2: 4.99, numC3: 5.01, numC4: 5.00, numC5: 5.02, numC6: 4.98, numC7: 5.00, numC8: 5.01, numC9: 4.99, numC10: 5.00, numPromedioCIP: 5.000, numMinCIP: 4.98, numMaxCIP: 5.02, numRSDCIP: 0.28, txtEstadoCIP: 'CONFORME' },
      ],
      numVelocidadActual: 152,
      numTotalMuestras: 20, numPromedioGlobal: 19.99, numMinGlobal: 19.92, numMaxGlobal: 20.08,
      numFueraEspec: 0, txtEstadoGlobalCIP: 'APROBADO',
    }),
    actualizadoEn: '2024-11-21T14:00:00.000Z',
  },
  '3:203': {
    id: 3203, idBatchRecord: 3, idDetalle: 203,
    jsonData: JSON.stringify({
      dgChecklist: [
        { txtItem: '1', txtDescripcion: 'Limpieza final de equipo realizada', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '2', txtDescripcion: 'Volumen producido vs teórico verificado', selEstado: 'SI', txtObsItem: '' },
        { txtItem: '3', txtDescripcion: 'pH final dentro de especificación (4.5–5.5)', selEstado: 'SI', txtObsItem: 'pH medido: 4.9' },
        { txtItem: '4', txtDescripcion: 'Transferencia a área de envase completada', selEstado: 'SI', txtObsItem: '' },
      ],
      dtFinEncap: '2024-11-21T16:00:00', numDuracionEncap: 180,
      numVelPromedio: 151, numCapsulasProd: 498, numRechazos: 2,
      numMuestrasTotal: 20, numProdTeorRef: 500,
      numCapsAptas: 498, numRendEncap: 99.60, numPerdidaEncap: 0.40,
      txtEstadoRendEncap: 'APROBADO',
    }),
    actualizadoEn: '2024-11-21T16:10:00.000Z',
  },
  '3:301': {
    id: 3301, idBatchRecord: 3, idDetalle: 301,
    jsonData: JSON.stringify({
      numTamLoteInsp: 498, selNivelInsp: 'NI-II Normal',
      numMuestraAQL: 50, txtInspector: 'Ana Torres',
      numAQLCritico: 0, numAQLMayor: 1.0, numAQLMenor: 2.5,
      dgInspeccion: [
        { txtSubLote: 'SL-001', txtHoraInsp: '08:00', numUnidInsp: 25, numDefCrit: 0, numDefMayor: 0, numDefMenor: 0, numPctDefect: 0.0, txtEstadoAQL: 'APROBADO' },
        { txtSubLote: 'SL-002', txtHoraInsp: '08:30', numUnidInsp: 25, numDefCrit: 0, numDefMayor: 0, numDefMenor: 1, numPctDefect: 4.0, txtEstadoAQL: 'APROBADO' },
      ],
      numTotalInsp: 50, numPctDefGlobal: 1.0,
      txtDecisionAQL: 'APROBADO — Lote conforme a NI-II AQL 1.0/2.5',
    }),
    actualizadoEn: '2024-11-22T09:00:00.000Z',
  },
  '3:302': {
    id: 3302, idBatchRecord: 3, idDetalle: 302,
    jsonData: JSON.stringify({
      dgMatEmpaque: [
        { txtMatNombre: 'Frasco HDPE 100mL', txtMatCodigo: 'ME-FRA-01', txtMatLote: 'FRA-2024-11', txtMatUnidad: 'unidades', numMatCantTeo: 5000, numMatCantUsada: 4980, numMatSobrante: 20, numMatPctUso: 99.60 },
        { txtMatNombre: 'Tapa rosca PP blanca', txtMatCodigo: 'ME-TAP-02', txtMatLote: 'TAP-2024-11', txtMatUnidad: 'unidades', numMatCantTeo: 5000, numMatCantUsada: 4980, numMatSobrante: 20, numMatPctUso: 99.60 },
        { txtMatNombre: 'Etiqueta INFLACORT 20mg', txtMatCodigo: 'ME-ETI-03', txtMatLote: 'ETI-2024-11', txtMatUnidad: 'unidades', numMatCantTeo: 5000, numMatCantUsada: 4975, numMatSobrante: 25, numMatPctUso: 99.50 },
      ],
      numCapsIngreso: 498,
      numBlistProd: 4980, numBlistRech: 15, numBlistAprobados: 4965,
      numCajasProd: 0, numCajasRech: 0, numCajasAprobadas: 4965,
      numCapsEnCajas: 498,
      numRendEmpaque: 99.70, numRendGlobal: 99.30,
      numCajasFinales: 4965,
      txtEstadoRendGlobal: 'APROBADO',
      dtInicioEmpaque: '2024-11-22T09:30:00', dtFinEmpaque: '2024-11-22T14:00:00', numDurEmpaque: 270,
    }),
    actualizadoEn: '2024-11-22T14:10:00.000Z',
  },

  // ── BR-5: CARBOPLEX 500mg — Lote LL-2025-001, OP-2025-001 — 22% (CANCELADO, solo ET1-F1 y ET1-F2) ──
  '5:101': {
    id: 5101, idBatchRecord: 5, idDetalle: 101,
    jsonData: JSON.stringify({
      txtProducto: 'CARBOPLEX 500mg Tabletas Lib. Inmediata', txtCodigo: 'CAR-500-TLI',
      txtLote: 'LL-2025-001', txtOrden: 'OP-2025-001',
      numTamanoLote: 600000, selSala: 'Sala-C Dispensación',
      txtResponsable: 'Ana Torres', txtBalanzaId: 'BAL-003',
      numTemperatura: 32.0, numHumedad: 55.2,
      txtEstadoTemp: 'NO CONFORME', txtEstadoHum: 'ADVERTENCIA',
      dtInicioEtapa1: '2026-03-12T08:00:00',
      txtVerifGlobal: 'RECHAZADO', txtObsEtapa1: 'Temperatura de sala: 32°C — supera límite máximo de 30°C. Desviación registrada. Proceso suspendido preventivamente.',
    }),
    actualizadoEn: '2026-03-12T08:30:00.000Z',
  },
  '5:102': {
    id: 5102, idBatchRecord: 5, idDetalle: 102,
    jsonData: JSON.stringify({
      txtBalanzaPesaje: 'BAL-003 Sartorius Entris II',
      dtCalibBalanza: '2026-03-01', dtVigenciaBalanza: '2026-06-01',
      txtEstadoCalib: 'VIGENTE',
      dgPesaje: [
        { txtMaterial: 'Carboplosina Base (PA)', txtCodigoMP: 'MP-CAR-01', txtLoteProveedor: 'LC-CAR-040', numCantTeorica: 150.0, numCantPesada: 149.95, numDiferencia: -0.05, numPctDesv: 0.03, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '08:10' },
        { txtMaterial: 'Lactosa Monohidrato', txtCodigoMP: 'MP-LAC-02', txtLoteProveedor: 'LC-LAC-041', numCantTeorica: 105.0, numCantPesada: 105.02, numDiferencia: 0.02, numPctDesv: 0.02, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '08:30' },
        { txtMaterial: 'Almidón de Maíz', txtCodigoMP: 'MP-ALM-03', txtLoteProveedor: 'LC-ALM-042', numCantTeorica: 30.0, numCantPesada: 30.0, numDiferencia: 0.0, numPctDesv: 0.00, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '08:45' },
        { txtMaterial: 'Estearato de Magnesio', txtCodigoMP: 'MP-EST-05', txtLoteProveedor: 'LC-EST-043', numCantTeorica: 3.0, numCantPesada: 3.001, numDiferencia: 0.001, numPctDesv: 0.03, txtEstadoPeso: 'CONFORME', txtHoraPesaje: '09:00' },
      ],
      numTotalTeorico: 288.0, numTotalPesado: 287.971,
      numRendDispensacion: 99.990, txtAprobDispensacion: 'APROBADO',
    }),
    actualizadoEn: '2026-03-12T09:10:00.000Z',
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
  // BR-1 (33%): ET1 cerrada
  { id: 10001, idBatchRecord: 1, idProceso: 1, idUsuario: 1, cerradoEn: '2024-08-05T09:05:00.000Z' },
  // BR-2 (67%): ET1 + ET2 cerradas
  { id: 20001, idBatchRecord: 2, idProceso: 1, idUsuario: 1, cerradoEn: '2024-10-12T10:05:00.000Z' },
  { id: 20002, idBatchRecord: 2, idProceso: 2, idUsuario: 2, cerradoEn: '2024-10-13T14:15:00.000Z' },
  // BR-3 (89%): ET1 + ET2 cerradas (ET3 en progreso)
  { id: 30001, idBatchRecord: 3, idProceso: 1, idUsuario: 1, cerradoEn: '2024-11-20T08:35:00.000Z' },
  { id: 30002, idBatchRecord: 3, idProceso: 2, idUsuario: 2, cerradoEn: '2024-11-21T16:10:00.000Z' },
  // BR-4 (100%): todas cerradas
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
