import { delay, mockEstrategiasFirma } from './mock'
import type { EstrategiaFirma, Resultado } from '@/types'

export interface EstrategiaFirmaInput {
  codigo: string; descripcion: string
  gruposDerogacion?: string[]
  firmas: { idFirma: number; texto: string; orden: number }[]
}

export const estrategiasFirmaApi = {
  listar: async (): Promise<EstrategiaFirma[]> => { await delay(300); return [...mockEstrategiasFirma] },
  find: async (id: number): Promise<EstrategiaFirma | null> => {
    await delay(200)
    return mockEstrategiasFirma.find(e => e.id === id) ?? null
  },
  crear: async (_data: EstrategiaFirmaInput): Promise<Resultado<EstrategiaFirma>> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },
  actualizar: async (id: number, _data: Partial<EstrategiaFirmaInput>): Promise<Resultado<EstrategiaFirma>> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },
  eliminar: async (_id: number): Promise<Resultado> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },
}
