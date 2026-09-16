import { delay, mockUsuarios } from './mock'
import type { AuthUser } from '@/types'

export interface PoliticaPassword {
  minCaracteres: number; requiereMayuscula: boolean
  requiereMinuscula: boolean; requiereEspecial: boolean
}
export interface AuthConfig {
  oidcEnabled: boolean; oidcLabel: string; passwordPolitica: PoliticaPassword
}

const ALL_MODULOS = [
  'batch-records','ordenes-proceso','formulas-control','firmas',
  'estrategias-firma','recetas-maestras','materiales','procesos',
  'centros','grupos-responsables','detalles','auditoria',
]

export const authApi = {
  login: async (login: string, clave: string): Promise<AuthUser> => {
    await delay(600)
    const user = mockUsuarios.find((u) => u.login === login)
    if (!user || clave !== 'bacord2025') throw new Error('Usuario o contraseña incorrectos')
    return {
      idUsuario: user.idUsuario, nombres: user.nombres, apellidos: user.apellidos,
      login: user.login, email: user.email, idCentro: user.idCentro,
      esAdministrador: user.esAdministrador === 1,
      roles: user.esAdministrador === 1 ? ['Admin'] : [user.rolNombre],
      modulos: ALL_MODULOS,
      moduloEdicion: ALL_MODULOS,
      token: `demo-token-${user.idUsuario}`,
      grupos: user.grupos, idGrupos: user.idGrupos,
    }
  },

  config: async (): Promise<AuthConfig> => {
    await delay(200)
    return {
      oidcEnabled: false, oidcLabel: '',
      passwordPolitica: { minCaracteres: 8, requiereMayuscula: false, requiereMinuscula: false, requiereEspecial: false },
    }
  },

  sesionConfig: async (): Promise<{ inactividadMinutos: number }> => {
    await delay(100)
    return { inactividadMinutos: 60 }
  },

  oidcLoginUrl: (): string => '/login',

  validarFirma: async (_login: string, _pin: string) => {
    await delay(400)
    return { estado: true, mensaje: 'Firma válida (modo demo)' }
  },

  olvideClave: async (_email: string) => {
    await delay(500)
    return { estado: true, mensaje: 'En modo demo no se envían correos.' }
  },

  validarTokenActivacion: async (_token: string) => {
    await delay(300)
    return { valido: false, nombre: undefined }
  },

  activarCuenta: async (_token: string, _password: string) => {
    await delay(400)
    return { estado: false, mensaje: 'No disponible en modo demo.' }
  },

  configurarPin: async (_pinNuevo: string, _pinActual?: string) => {
    await delay(400)
    return { estado: true, mensaje: 'PIN actualizado (modo demo).' }
  },
}
