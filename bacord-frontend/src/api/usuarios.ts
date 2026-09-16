import { delay, mockUsuarios } from './mock'
import type { Usuario, Resultado } from '@/types'

export interface UsuarioInput {
  numeroIdentificacion: string; nombres: string; apellidos: string
  login: string; email: string; idCentro: number
  esAdministrador?: boolean; activo?: boolean
  idGrupos?: number[]; idRol?: number | null; fechaCaducidad?: string | null
}

export const usuariosApi = {
  listar: async (): Promise<Usuario[]> => { await delay(300); return [...mockUsuarios] },
  find: async (id: number): Promise<Usuario | null> => {
    await delay(200)
    return mockUsuarios.find(u => u.idUsuario === id) ?? null
  },
  crear: async (data: UsuarioInput): Promise<Resultado<Usuario>> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },
  actualizar: async (id: number, data: Partial<UsuarioInput>): Promise<Resultado<Usuario>> => {
    await delay(400)
    const i = mockUsuarios.findIndex(u => u.idUsuario === id)
    if (i < 0) return { estado: false, mensaje: 'No encontrado' }
    return { estado: true, mensaje: 'Actualizado (modo demo — cambios no persistidos)', datos: mockUsuarios[i] }
  },
  eliminar: async (_id: number): Promise<Resultado> => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },
  desbloquear: async (_id: number): Promise<Resultado> => {
    await delay(400)
    return { estado: true, mensaje: 'Usuario desbloqueado (modo demo)' }
  },
  resetearPin: async (_id: number): Promise<Resultado> => {
    await delay(400)
    return { estado: true, mensaje: 'PIN reseteado (modo demo)' }
  },
  resetPin: async (_id: number): Promise<Resultado> => {
    await delay(400)
    return { estado: true, mensaje: 'PIN reseteado (modo demo)' }
  },
  reenviarInvitacion: async (_id: number): Promise<Resultado> => {
    await delay(400)
    return { estado: true, mensaje: 'Invitación reenviada (modo demo)' }
  },
}
