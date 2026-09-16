import { delay, mockFirmas, mockGruposResponsables } from './mock'
import type { Resultado } from '@/types'

export interface FirmaApi {
  idFirma: number; codigo: string; descripcion: string; texto: string
  activo: boolean; idGrupo: number
  grupo: { id: number; nombre: string; colorKey: string }
}

const toApi = (f: typeof mockFirmas[0]): FirmaApi => {
  const g = mockGruposResponsables.find(x => x.id === f.idGrupo)
  return {
    idFirma: f.idFirma, codigo: f.codigo, descripcion: f.descripcion,
    texto: f.texto, activo: f.activo === 1, idGrupo: f.idGrupo,
    grupo: { id: f.idGrupo, nombre: g?.nombre ?? '', colorKey: g?.colorKey ?? 'slate' },
  }
}

export const firmasApi = {
  listar: async (): Promise<FirmaApi[]> => { await delay(300); return mockFirmas.map(toApi) },
  crear: async (data: { codigo: string; descripcion: string; texto: string; idGrupo: number }): Promise<Resultado<FirmaApi>> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },
  actualizar: async (id: number, data: Partial<Omit<FirmaApi, 'idFirma' | 'grupo'>>): Promise<Resultado<FirmaApi>> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },
  eliminar: async (id: number): Promise<Resultado> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },
}
