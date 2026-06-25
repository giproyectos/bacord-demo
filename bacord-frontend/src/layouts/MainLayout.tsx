import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight, User, LogOut, Menu } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

// ── Estructura del menú igual al original ──────────────────────────────────
interface NavLeaf { label: string; to: string }
interface NavGroup {
  label: string; icon: string; key: string
  children: (NavLeaf | NavBranch)[]
}
interface NavBranch { label: string; icon: string; key: string; children: NavLeaf[] }
type NavItem = NavGroup

// ── Menú completo (admins) ─────────────────────────────────────────────────
const NAV_ADMIN: NavItem[] = [
  {
    label: 'Operación', icon: 'fa-cogs', key: 'ModuloOperacion',
    children: [
      { label: 'Batch Record', to: '/batch-records' } as NavLeaf,
      {
        label: 'Fórmulas de Control', icon: 'fa-flask', key: 'LinkFormulaControl',
        children: [
          { label: 'Crear Fórmula de Control', to: '/formulas-control/crear' },
          { label: 'Consultar Fórmulas de Control', to: '/formulas-control' },
        ],
      },
      {
        label: 'Órdenes de Proceso', icon: 'fa-list-alt', key: 'LinkOrdenesProceso',
        children: [
          { label: 'Cargar Órdenes de Proceso', to: '/ordenes-proceso/cargar' },
          { label: 'Consultar Órdenes de Proceso', to: '/ordenes-proceso' },
        ],
      },
      { label: 'Firmas', to: '/firmas' } as NavLeaf,
      { label: 'Estrategia de Firmas', to: '/estrategias-firma' } as NavLeaf,
    ],
  },
  {
    label: 'Administración', icon: 'fa-wrench', key: 'ModuloAdministracion',
    children: [
      {
        label: 'Usuarios y Acceso', icon: 'fa-users', key: 'ModuloUsuarios',
        children: [
          { label: 'Usuarios', to: '/administracion/usuarios' },
          { label: 'Roles', to: '/administracion/roles' },
          { label: 'Consulta Log', to: '/admin/logs' },
          { label: 'Sesiones', to: '/admin/sesiones' },
          { label: 'Log de Ingresos', to: '/admin/log-logueos' },
        ],
      },
      { label: 'Centros', to: '/administracion/centros' } as NavLeaf,
      { label: 'Grupos Responsables', to: '/administracion/grupos-responsables' } as NavLeaf,
      { label: 'Materiales', to: '/administracion/materiales' } as NavLeaf,
      { label: 'Procesos', to: '/administracion/procesos' } as NavLeaf,
      { label: 'Parámetros', to: '/administracion/parametros' } as NavLeaf,
      { label: 'Recetas Maestras', to: '/recetas-maestras' } as NavLeaf,
      { label: 'Detalles', to: '/administracion/detalles' } as NavLeaf,
    ],
  },
]

// ── Menú calidad (QA) ──────────────────────────────────────────────────────
const NAV_CALIDAD: NavItem[] = [
  {
    label: 'Operación', icon: 'fa-cogs', key: 'ModuloOperacion',
    children: [
      { label: 'Batch Record', to: '/batch-records' } as NavLeaf,
      { label: 'Firmas', to: '/firmas' } as NavLeaf,
      { label: 'Estrategia de Firmas', to: '/estrategias-firma' } as NavLeaf,
    ],
  },
]

// ── Menú producción / supervisión ─────────────────────────────────────────
const NAV_OPERARIO: NavItem[] = [
  {
    label: 'Operación', icon: 'fa-cogs', key: 'ModuloOperacion',
    children: [
      { label: 'Batch Record', to: '/batch-records' } as NavLeaf,
    ],
  },
]

function isLeaf(item: NavLeaf | NavBranch): item is NavLeaf {
  return 'to' in item
}

function SubItem({ item }: { item: NavLeaf | NavBranch }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  if (isLeaf(item)) {
    return (
      <NavLink
        to={item.to}
        className={({ isActive }) => `nav-sub-leaf${isActive ? ' active' : ''}`}
      >
        <i className="fa fa-caret-right" style={{ marginRight: 6, fontSize: 10 }} />
        {item.label}
      </NavLink>
    )
  }

  const isChildActive = item.children.some((c) => location.pathname === c.to)
  return (
    <div>
      <button
        className={`nav-branch${isChildActive ? ' active' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <i className={`fa ${item.icon}`} style={{ marginRight: 8, width: 14 }} />
        {item.label}
        <span style={{ marginLeft: 'auto' }}>
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </span>
      </button>
      {open && (
        <div className="nav-sub-sub">
          {item.children.map((c) => (
            <NavLink key={c.to} to={c.to} className={({ isActive }) => `nav-sub-leaf indent${isActive ? ' active' : ''}`}>
              <i className="fa fa-caret-right" style={{ marginRight: 6, fontSize: 10 }} />
              {c.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

function TopItem({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const isChildActive = item.children.some((c) =>
    isLeaf(c) ? location.pathname === c.to : c.children.some((cc) => location.pathname === cc.to)
  )

  return (
    <li className={`nav-top-item${isChildActive ? ' active open' : ''}`}>
      <button className="nav-top-btn" onClick={() => setOpen(!open)}>
        <b className="caret-b" />
        <i className={`fa ${item.icon}`} style={{ marginRight: 10, width: 16 }} />
        <span>{item.label}</span>
        <span style={{ marginLeft: 'auto' }}>
          {(open || isChildActive) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
      </button>
      {(open || isChildActive) && (
        <ul className="sub-menu">
          {item.children.map((child, i) => (
            <li key={i}>
              <SubItem item={child} />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()

  // Seleccionar menú según rol
  const grupos = user?.grupos?.split(',').map(g => g.trim()) ?? []
  const isAdmin = !!user?.esAdministrador
  const isCalidad = grupos.includes('Calidad')
  const NAV = isAdmin ? NAV_ADMIN : isCalidad ? NAV_CALIDAD : NAV_OPERARIO

  const handleLogout = () => { logout(); navigate('/login') }

  // Título de página desde la ruta
  const PAGE_TITLES: Record<string, string> = {
    '/': 'Inicio',
    '/batch-records': 'Batch Record',
    '/recetas-maestras': 'Receta Maestra',
    '/ordenes-proceso': 'Órdenes de Proceso',
    '/ordenes-proceso/cargar': 'Cargue Orden Proceso',
    '/formulas-control': 'Fórmula Control',
    '/formulas-control/crear': 'Crear Fórmula Control',
    '/firmas': 'Firmas',
    '/estrategias-firma': 'Estrategia Firma',
    '/administracion/usuarios': 'Usuarios y perfiles',
    '/administracion/roles': 'Perfiles',
    '/administracion/centros': 'Centros',
    '/administracion/grupos-responsables': 'Grupos Responsables',
    '/administracion/materiales': 'Materiales',
    '/administracion/procesos': 'Procesos',
    '/administracion/parametros': 'Parámetros',
    '/administracion/detalles': 'Detalles',

    '/admin/logs': 'Consultar modificaciones a datos',
    '/admin/sesiones': 'Sesiones de usuarios',
    '/admin/log-logueos': 'Log de Ingresos',
  }
  // Para rutas con parámetros
  const dynamicTitles: [RegExp, string][] = [
    [/^\/batch-records\/\d+\/editar$/, 'Editar Batch Record'],
    [/^\/batch-records\/\d+\/consultar$/, 'Consultar Batch Record'],
    [/^\/recetas-maestras\/\d+\/configurar$/, 'Configurar Receta Maestra'],
  ]
  const pageTitle = PAGE_TITLES[location.pathname]
    ?? dynamicTitles.find(([re]) => re.test(location.pathname))?.[1]
    ?? ''

  return (
    <>
      <style>{`
        /* ── Reset ── */
        *, *::before, *::after { box-sizing: border-box; }

        /* ── Shell ── */
        .shell {
          display: flex; height: 100vh; overflow: hidden;
          background: var(--paper);
        }

        /* ── Sidebar ── */
        .sidebar {
          width: ${sidebarOpen ? '220px' : '0'};
          min-width: ${sidebarOpen ? '220px' : '0'};
          overflow: hidden;
          transition: width 0.22s ease, min-width 0.22s ease;
          background: var(--navy);
          display: flex; flex-direction: column;
          border-right: 1px solid rgba(0,0,0,0.18);
          flex-shrink: 0;
        }
        .sidebar-inner {
          width: 220px; height: 100%;
          display: flex; flex-direction: column;
          overflow-y: auto; overflow-x: hidden;
        }
        .sidebar-inner::-webkit-scrollbar { width: 3px; }
        .sidebar-inner::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }

        /* Brand */
        .brand {
          padding: 16px 14px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          display: flex; align-items: center; gap: 9px; flex-shrink: 0;
        }
        .brand-logo {
          width: 34px; height: 34px; border-radius: 50%;
          background: #fff; display: grid; place-items: center;
          flex-shrink: 0; box-shadow: 0 0 0 1.5px rgba(255,255,255,0.18);
          overflow: hidden; padding: 2px;
        }
        .brand-logo img { width: 100%; height: 100%; object-fit: contain; }
        .brand-logo-fallback {
          width: 34px; height: 34px; border-radius: 50%; background: #fff;
          display: grid; place-items: center; font-weight: 800; font-size: 13px;
          color: var(--navy); flex-shrink: 0;
        }
        .brand-text { font-weight: 800; font-size: 17px; color: #fff; letter-spacing: 0.03em; line-height: 1; }
        .brand-sub { font-family: var(--f-mono); font-size: 8px; color: #7A95C0; letter-spacing: 0.18em; text-transform: uppercase; margin-top: 3px; }

        /* User profile block */
        .sidebar-user {
          padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.07);
          display: flex; align-items: center; gap: 10px; flex-shrink: 0;
        }
        .user-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, var(--yellow), var(--orange));
          display: grid; place-items: center;
          color: var(--navy-900); font-weight: 700; font-size: 12px; flex-shrink: 0;
        }
        .user-name { font-size: 12.5px; font-weight: 600; color: #fff; line-height: 1.2; }
        .user-roles { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px; }
        .user-role-badge {
          font-size: 9px; font-family: var(--f-mono); padding: 1px 6px;
          background: rgba(255,255,255,0.1); color: #8FA5C9;
          border-radius: 3px; letter-spacing: 0.05em;
        }

        /* Nav */
        .sidebar-nav { flex: 1; padding: 8px 0; }
        .sidebar-nav ul { list-style: none; margin: 0; padding: 0; }
        .nav-top-item { }

        .nav-top-btn {
          display: flex; align-items: center; width: 100%;
          padding: 9px 14px; background: none; border: none;
          color: #B8C6DE; font-size: 13px; font-weight: 500; font-family: var(--f-sans);
          cursor: pointer; text-align: left; transition: background 100ms, color 100ms;
          white-space: nowrap;
        }
        .nav-top-btn:hover { background: rgba(255,255,255,0.04); color: #fff; }
        .nav-top-item.active > .nav-top-btn { color: #fff; }

        .sub-menu { list-style: none; margin: 0; padding: 0; background: rgba(0,0,0,0.12); }

        .nav-branch {
          display: flex; align-items: center; width: 100%;
          padding: 8px 14px 8px 24px;
          background: none; border: none;
          color: #99AACC; font-size: 12.5px; font-family: var(--f-sans);
          cursor: pointer; transition: background 100ms, color 100ms; white-space: nowrap;
        }
        .nav-branch:hover { background: rgba(255,255,255,0.04); color: #fff; }
        .nav-branch.active { color: #fff; }

        .nav-sub-sub { background: rgba(0,0,0,0.08); }

        .nav-sub-leaf {
          display: block; padding: 7px 14px 7px 32px;
          color: #8FA5C9; font-size: 12px; text-decoration: none;
          transition: background 80ms, color 80ms; white-space: nowrap;
        }
        .nav-sub-leaf.indent { padding-left: 44px; }
        .nav-sub-leaf:hover { background: rgba(255,255,255,0.04); color: #fff; }
        .nav-sub-leaf.active {
          color: #fff; background: rgba(255,223,100,0.1);
          position: relative;
        }
        .nav-sub-leaf.active::before {
          content: ''; position: absolute;
          left: 0; top: 5px; bottom: 5px;
          width: 3px; background: var(--yellow); border-radius: 0 2px 2px 0;
        }

        /* Inicio link */
        .nav-inicio {
          display: flex; align-items: center; width: 100%;
          padding: 9px 14px; background: none; border: none;
          color: #B8C6DE; font-size: 13px; font-weight: 500; font-family: var(--f-sans);
          cursor: pointer; text-align: left; transition: background 100ms, color 100ms;
          white-space: nowrap; text-decoration: none;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          margin-bottom: 4px;
        }
        .nav-inicio:hover { background: rgba(255,255,255,0.04); color: #fff; }
        .nav-inicio.active { color: var(--yellow); background: rgba(255,223,100,0.08); }

        /* Sidebar minify btn */
        .sidebar-minify {
          padding: 10px 14px; border-top: 1px solid rgba(255,255,255,0.07); flex-shrink: 0;
        }
        .sidebar-minify button {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.04); border: none; color: #7A95C0;
          padding: 7px 12px; border-radius: var(--r-sm); cursor: pointer;
          font-size: 12px; font-family: var(--f-sans); width: 100%;
          transition: background 100ms;
        }
        .sidebar-minify button:hover { background: rgba(255,255,255,0.08); color: #fff; }

        /* ── Right side ── */
        .right-side { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

        /* Header */
        .page-header-bar {
          display: flex; align-items: center; gap: 12px;
          padding: 0 20px; height: 52px;
          background: var(--navy); border-bottom: 1px solid rgba(0,0,0,0.2);
          flex-shrink: 0;
        }
        .header-toggle {
          background: none; border: none; color: rgba(255,255,255,0.6);
          cursor: pointer; padding: 6px; display: grid; place-items: center;
          border-radius: var(--r-sm); transition: background 100ms;
        }
        .header-toggle:hover { background: rgba(255,255,255,0.08); color: #fff; }

        .header-brand { font-weight: 800; font-size: 16px; color: #fff; letter-spacing: 0.04em; }
        .header-brand b { color: #fff; }
        .header-brand span { font-weight: 400; color: rgba(255,255,255,0.7); }

        .header-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
        .header-user {
          display: flex; align-items: center; gap: 8px;
          padding: 5px 10px; border-radius: var(--r-sm);
          cursor: pointer; color: rgba(255,255,255,0.85); font-size: 13px;
          transition: background 100ms;
        }
        .header-user:hover { background: rgba(255,255,255,0.08); }
        .header-user img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
        .header-logout {
          background: none; border: none; color: rgba(255,255,255,0.6);
          cursor: pointer; padding: 6px; display: grid; place-items: center;
          border-radius: var(--r-sm); font-family: var(--f-sans);
          font-size: 13px; display: flex; align-items: center; gap: 6px;
          transition: background 100ms;
        }
        .header-logout:hover { background: rgba(255,255,255,0.08); color: #fff; }

        /* Page title bar */
        .page-title-bar {
          padding: 14px 22px 0;
          background: var(--paper);
          flex-shrink: 0;
        }
        .page-title-bar h1 {
          font-size: 20px; font-weight: 700; color: var(--ink);
          margin: 0 0 12px; letter-spacing: -0.01em;
          border-bottom: 1px solid var(--hair-2); padding-bottom: 12px;
        }
        .page-title-bar h1 small { font-size: 13px; font-weight: 400; color: var(--ink-4); margin-left: 8px; }

        /* Content */
        .page-content {
          flex: 1; overflow-y: auto; padding: 18px 22px;
          background: #fff; min-height: 0;
        }
        .page-content::-webkit-scrollbar { width: 5px; }
        .page-content::-webkit-scrollbar-thumb { background: var(--hair-2); border-radius: 3px; }
      `}</style>

      <div className="shell">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-inner">
            {/* Brand */}
            <NavLink to="/" end style={{ textDecoration: 'none' }}>
              <div className="brand">
                <div className="brand-logo">
                  <img
                    src="/assets/zenttra-circular.png"
                    alt="BACORD"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement
                      el.parentElement!.className = 'brand-logo-fallback'
                      el.parentElement!.textContent = 'B'
                    }}
                  />
                </div>
                <div>
                  <div className="brand-text"><b>BAC</b>ord</div>
                  <div className="brand-sub">By ZENTTRA</div>
                </div>
              </div>
            </NavLink>

            {/* User profile */}
            <div className="sidebar-user">
              <div className="user-avatar">
                <User size={16} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.nombres} {user?.apellidos}
                </div>
                <div className="user-roles">
                  {user?.roles?.map((r) => (
                    <span key={r} className="user-role-badge">{r}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="sidebar-nav">
              <ul>
                <li>
                  <NavLink to="/" end className={({ isActive }) => `nav-inicio${isActive ? ' active' : ''}`}>
                    <i className="fa fa-home" style={{ marginRight: 10, width: 16 }} />
                    <span>Inicio</span>
                  </NavLink>
                </li>
                {NAV.map((item) => (
                  <TopItem key={item.key} item={item} />
                ))}
              </ul>
            </nav>

            {/* Minify */}
            <div className="sidebar-minify">
              <button onClick={() => setSidebarOpen(false)}>
                <i className="fa fa-angle-double-left" />
                <span>Colapsar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="right-side">
          {/* Header */}
          <div className="page-header-bar">
            <button className="header-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={18} />
            </button>
            <div className="header-brand">
              <b>BAC</b><span>ord</span>
            </div>
            <div className="header-right">
              <div className="header-user">
                <img src="/assets/zenttra-circular.png" alt=""
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <span>{user?.nombres}</span>
              </div>
              <button className="header-logout" onClick={handleLogout}>
                <LogOut size={14} />
                Salir
              </button>
            </div>
          </div>

          {/* Page title */}
          {pageTitle && (
            <div className="page-title-bar">
              <h1>{pageTitle} <small></small></h1>
            </div>
          )}

          {/* Content */}
          <div className="page-content">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  )
}
