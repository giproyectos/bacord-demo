import { delay, mockFormulasControl, mockOrdenes, mockRecetas, mockBatchRecords } from './mock'
import type { FormulaControl, OrdenProceso, RecetaMaestra, BatchRecord, Resultado } from '@/types'

export const formulaControlApi = {
  buscar: async (): Promise<FormulaControl[]> => {
    await delay(400)
    return [...mockFormulasControl]
  },

  find: async (id: number): Promise<FormulaControl> => {
    await delay(300)
    const fc = mockFormulasControl.find(f => f.idFormulaControl === id)
    if (!fc) throw new Error(`Fórmula ${id} no encontrada`)
    return { ...fc }
  },

  // PoC signature: crear(idOrdenProceso) → FormulaControl (not Resultado)
  crear: async (idOrdenProceso: number): Promise<FormulaControl> => {
    await delay(500)
    const orden = mockOrdenes.find(o => o.idOrdenProceso === idOrdenProceso)
    const receta = mockRecetas[0]
    const nuevo: FormulaControl = {
      idFormulaControl: Date.now(), idRecetaMaestra: receta?.idRecetaMaestra ?? 1,
      idOrdenProceso, motivoEstado: '',
      idEstado: 1, idCentro: 1, idUsuarioCreacion: 1, fechaCreacion: new Date().toISOString(),
    }
    mockFormulasControl.push(nuevo)
    return nuevo
  },

  // PoC signature: enviar(id) → BatchRecord
  enviar: async (idFormulaControl: number): Promise<BatchRecord> => {
    await delay(500)
    const fc = mockFormulasControl.find(f => f.idFormulaControl === idFormulaControl)
    if (!fc) throw new Error('Fórmula no encontrada')
    const nuevo: BatchRecord = {
      idBatchRecord: Date.now(), idFormulaControl, idRecetaMaestra: fc.idRecetaMaestra,
      idOrdenProceso: fc.idOrdenProceso, motivoEstado: '',
      idEstado: 1, idCentro: 1, idUsuarioCreacion: 1, fechaCreacion: new Date().toISOString(),
      idUsuarioModificacion: 1, fechaModificacion: new Date().toISOString(), porcentajeAvance: 0,
    }
    mockBatchRecords.push(nuevo)
    fc.idEstado = 2
    return nuevo
  },

  // PoC signature: cancelar(id, motivo) → void
  cancelar: async (idFormulaControl: number, motivo: string): Promise<void> => {
    await delay(400)
    const fc = mockFormulasControl.find(f => f.idFormulaControl === idFormulaControl)
    if (fc) { fc.idEstado = 4; fc.motivoEstado = motivo }
  },

  getOrden: async (id: number): Promise<OrdenProceso | null> => {
    await delay(200)
    const fc = mockFormulasControl.find(f => f.idFormulaControl === id)
    return fc ? mockOrdenes.find(o => o.idOrdenProceso === fc.idOrdenProceso) ?? null : null
  },

  getReceta: async (id: number): Promise<RecetaMaestra | null> => {
    await delay(200)
    const fc = mockFormulasControl.find(f => f.idFormulaControl === id)
    return fc ? mockRecetas.find(r => r.idRecetaMaestra === fc.idRecetaMaestra) ?? null : null
  },

  getBatchRecords: async (id: number): Promise<BatchRecord[]> => {
    await delay(200)
    return mockBatchRecords.filter(b => b.idFormulaControl === id)
  },

  cambiarEstado: async (id: number, idEstado: number, motivo: string): Promise<Resultado<FormulaControl>> => {
    await delay(400)
    const fc = mockFormulasControl.find(f => f.idFormulaControl === id)
    if (fc) { fc.idEstado = idEstado; fc.motivoEstado = motivo }
    return { estado: true, mensaje: 'Estado actualizado (modo demo)', datos: fc }
  },

  crearBatchRecord: async (idFormulaControl: number): Promise<Resultado<BatchRecord>> => {
    await delay(500)
    const fc = mockFormulasControl.find(f => f.idFormulaControl === idFormulaControl)
    if (!fc) return { estado: false, mensaje: 'Fórmula no encontrada' }
    const nuevo: BatchRecord = {
      idBatchRecord: Date.now(), idFormulaControl, idRecetaMaestra: fc.idRecetaMaestra,
      idOrdenProceso: fc.idOrdenProceso, motivoEstado: '',
      idEstado: 1, idCentro: 1, idUsuarioCreacion: 1, fechaCreacion: new Date().toISOString(),
      idUsuarioModificacion: 1, fechaModificacion: new Date().toISOString(), porcentajeAvance: 0,
    }
    mockBatchRecords.push(nuevo)
    return { estado: true, mensaje: 'Batch Record creado (modo demo)', datos: nuevo }
  },
}
