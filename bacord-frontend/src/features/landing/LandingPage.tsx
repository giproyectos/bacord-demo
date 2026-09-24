import { useState } from 'react'
import { Link } from 'react-router-dom'

const lexend = "'Lexend', 'Geist', sans-serif"

const PROBLEMAS = [
  {
    icon: 'fa-file-circle-exclamation',
    titulo: 'La noche antes de la auditoría',
    detalle: 'Días armando a mano la evidencia que el inspector va a pedir: batch record, firmas, desviaciones, trazabilidad.',
  },
  {
    icon: 'fa-eraser',
    titulo: 'Un lote perdido por transcripción',
    detalle: 'Un valor fuera de rango que nadie marcó a tiempo porque el papel no valida nada — el error se descubre demasiado tarde.',
  },
  {
    icon: 'fa-magnifying-glass',
    titulo: 'Desviaciones sin trazabilidad real',
    detalle: 'Reportes de no conformidad en carpetas aparte, sin vínculo claro al lote, al paso del proceso ni a quién los cerró.',
  },
]

const SOLUCIONES = [
  {
    icon: 'fa-ruler',
    color: '#0891B2', bg: '#E0F7FA',
    titulo: 'Validación en tiempo real',
    detalle: 'Rangos mínimos y máximos por campo, con alerta visual inmediata apenas el operario ingresa un valor fuera de especificación.',
  },
  {
    icon: 'fa-triangle-exclamation',
    color: '#D97706', bg: '#FEF3C7',
    titulo: 'Desviaciones y CAPA',
    detalle: 'El flujo de reporte se abre automáticamente, queda vinculado al lote y visible en el dashboard con alerta en tiempo real para Calidad.',
  },
  {
    icon: 'fa-clock-rotate-left',
    color: '#1D4ED8', bg: '#EEF2FF',
    titulo: 'Audit trail completo',
    detalle: 'Quién, qué campo, cuándo, desde qué equipo y qué valor cambió — visible en la consulta del lote, no solo en un panel lateral.',
  },
  {
    icon: 'fa-file-pdf',
    color: '#DC2626', bg: '#FEE2E2',
    titulo: 'Paquete de auditoría en 1 clic',
    detalle: 'Datos del lote, firmas con timestamp, audit trail y desviaciones — exportados y listos para el inspector, incluso en varios lotes a la vez.',
  },
]

const COMPARACION = [
  { criterio: 'Tiempo de implementación', papel: 'N/A — pero sin control', global: '6–18 meses', bacord: '2–6 semanas por línea' },
  { criterio: 'Validación de rango en línea', papel: 'No', global: 'Sí, config. pesada', bacord: 'Sí, nativo' },
  { criterio: 'Desviaciones vinculadas al lote', papel: 'Manual, aparte', global: 'Sí', bacord: 'Sí, automático' },
  { criterio: 'Paquete de auditoría', papel: 'Días de armado manual', global: 'Requiere consultoría', bacord: 'Un clic' },
  { criterio: 'Cómo se compra', papel: '—', global: 'RFP, demo bajo NDA', bacord: 'Se prueba en vivo, antes de la llamada' },
]

const VIDEOS = [
  { n: 1, titulo: 'Un lote que se valida solo', detalle: 'Cómo el sistema marca un valor fuera de rango en tiempo real.' },
  { n: 5, titulo: 'El paquete de auditoría en segundos', detalle: 'De la lista de lotes al PDF listo para el inspector INVIMA.' },
  { n: 9, titulo: 'El patrón detrás de una desviación', detalle: 'Cómo la analítica encuentra la causa raíz sobre datos reales del lote.' },
]

const PLANES = [
  {
    tier: 'STARTUP', destacado: false,
    resumen: 'Para arrancar con 1 línea de producción',
    features: ['1 grupo desplegado', 'Batch record digital y firmas', 'Desviaciones y CAPA', 'Paquete de auditoría', 'Usuarios ilimitados'],
  },
  {
    tier: 'GROWTH', destacado: true,
    resumen: 'Para varias líneas o plantas en crecimiento',
    features: ['Todo lo de Startup', 'Grupos y plantas adicionales', 'Filtros y auditoría multi-lote', 'Soporte extendido disponible', 'Listo para integraciones ERP'],
  },
  {
    tier: 'ENTERPRISE', destacado: false,
    resumen: 'Para operaciones multi-planta sin límite',
    features: ['Todo lo de Growth', 'Grupos ilimitados', 'Integración ERP y de equipos', 'Soporte 24/7 disponible', 'Ruta directa a módulos de IA'],
  },
]

function useContactForm() {
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviado, setEnviado] = useState(false)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre || !correo) return
    setEnviado(true)
  }
  return { nombre, setNombre, correo, setCorreo, empresa, setEmpresa, mensaje, setMensaje, enviado, handleSubmit }
}

export function LandingPage() {
  const f = useContactForm()

  return (
    <>
      <style>{`
        .lp { background: var(--paper); color: var(--ink); min-height: 100vh; overflow-x: hidden; }
        .lp a { text-decoration: none; color: inherit; }
        .lp-container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
        .lp-section { padding: 72px 0; }
        .lp-section-alt { background: var(--white); }
        .lp-eyebrow {
          font-family: var(--f-mono); font-size: 11.5px; font-weight: 600; letter-spacing: .14em;
          text-transform: uppercase; color: var(--navy); margin-bottom: 12px;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .lp-h2 { font-family: ${lexend}; font-size: 30px; font-weight: 800; letter-spacing: -.02em; color: var(--ink); margin-bottom: 10px; }
        .lp-lead { font-size: 15.5px; color: var(--ink-3); max-width: 640px; line-height: 1.6; }
        .lp-head { margin-bottom: 40px; }
        .lp-head.center { text-align: center; margin-left: auto; margin-right: auto; }
        .lp-head.center .lp-lead { margin-left: auto; margin-right: auto; }

        /* ── nav ── */
        .lp-nav {
          position: sticky; top: 0; z-index: 40; background: rgba(246,244,238,.92); backdrop-filter: blur(8px);
          border-bottom: 1px solid var(--hair);
        }
        .lp-nav-inner { max-width: 1120px; margin: 0 auto; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
        .lp-nav-brand { display: flex; align-items: center; gap: 10px; }
        .lp-nav-brand img { height: 26px; }
        .lp-nav-links { display: flex; align-items: center; gap: 26px; }
        .lp-nav-links a { font-size: 13.5px; font-weight: 600; color: var(--ink-2); }
        .lp-nav-links a:hover { color: var(--navy); }
        .lp-nav-cta { display: flex; align-items: center; gap: 10px; }
        @media (max-width: 760px) { .lp-nav-links { display: none; } }

        /* ── botones ── */
        .lp-btn {
          display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px; border-radius: var(--r-sm);
          font-size: 13.5px; font-weight: 700; cursor: pointer; border: none; font-family: var(--f-sans);
          transition: transform .12s, opacity .12s; white-space: nowrap;
        }
        .lp-btn:hover { opacity: .92; transform: translateY(-1px); }
        .lp-btn-primary { background: var(--navy); color: #fff; }
        .lp-btn-accent  { background: var(--yellow-2); color: var(--navy-900); }
        .lp-btn-ghost   { background: transparent; color: var(--ink); border: 1.5px solid var(--hair-strong); }
        .lp-btn-sm { padding: 8px 14px; font-size: 12.5px; }

        /* ── hero ── */
        .lp-hero { padding: 88px 0 64px; text-align: center; }
        .lp-hero-h1 {
          font-family: ${lexend}; font-size: 46px; font-weight: 800; letter-spacing: -.03em; line-height: 1.08;
          color: var(--navy-900); max-width: 820px; margin: 0 auto 20px;
        }
        .lp-hero-h1 span { color: var(--navy); background: linear-gradient(180deg, transparent 62%, var(--yellow) 62%); }
        .lp-hero-sub { font-size: 16.5px; color: var(--ink-3); max-width: 600px; margin: 0 auto 32px; line-height: 1.65; }
        .lp-hero-ctas { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; margin-bottom: 44px; }
        .lp-trust { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
        .lp-trust-pill {
          display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: var(--ink-2);
          background: var(--white); border: 1px solid var(--hair-2); border-radius: 100px; padding: 7px 14px;
        }
        .lp-trust-pill i { color: var(--forest); }

        /* ── problema ── */
        .lp-cards3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .lp-problem-card {
          background: var(--white); border: 1px solid var(--hair-2); border-radius: var(--r-lg); padding: 24px;
        }
        .lp-problem-card i { font-size: 20px; color: var(--orange-2); margin-bottom: 14px; display: block; }
        .lp-problem-card h3 { font-family: ${lexend}; font-size: 15px; font-weight: 700; margin-bottom: 8px; color: var(--ink); }
        .lp-problem-card p { font-size: 13px; color: var(--ink-3); line-height: 1.6; }

        /* ── solución ── */
        .lp-cards4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .lp-sol-card { background: var(--white); border: 1px solid var(--hair-2); border-radius: var(--r-lg); padding: 22px; }
        .lp-sol-icon { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; font-size: 17px; margin-bottom: 14px; }
        .lp-sol-card h3 { font-family: ${lexend}; font-size: 14.5px; font-weight: 700; margin-bottom: 7px; color: var(--ink); }
        .lp-sol-card p { font-size: 12.5px; color: var(--ink-3); line-height: 1.6; }

        /* ── comparación ── */
        .lp-compare-wrap { overflow-x: auto; border: 1px solid var(--hair-2); border-radius: var(--r-lg); background: var(--white); }
        .lp-compare { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 640px; }
        .lp-compare th, .lp-compare td { padding: 14px 18px; text-align: left; border-bottom: 1px solid var(--hair); }
        .lp-compare th { font-family: var(--f-mono); font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; }
        .lp-compare th.hl, .lp-compare td.hl { background: var(--navy-50); }
        .lp-compare td.hl { font-weight: 700; color: var(--navy); }
        .lp-compare tr:last-child td { border-bottom: none; }
        .lp-compare td.criterio { font-weight: 600; color: var(--ink-2); }

        /* ── videos ── */
        .lp-cards3 .lp-video-card { cursor: default; }
        .lp-video-card { background: var(--navy-900); border-radius: var(--r-lg); overflow: hidden; color: #fff; }
        .lp-video-thumb {
          height: 140px; background: linear-gradient(135deg, var(--navy) 0%, var(--navy-700) 100%);
          display: grid; place-items: center; position: relative;
        }
        .lp-video-play {
          width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,.16);
          display: grid; place-items: center; font-size: 16px; color: #fff; border: 1.5px solid rgba(255,255,255,.3);
        }
        .lp-video-badge {
          position: absolute; top: 10px; left: 10px; font-family: var(--f-mono); font-size: 10px; font-weight: 700;
          background: rgba(0,0,0,.35); padding: 3px 9px; border-radius: 100px; letter-spacing: .05em;
        }
        .lp-video-body { padding: 16px 18px 18px; }
        .lp-video-body h3 { font-family: ${lexend}; font-size: 14px; font-weight: 700; margin-bottom: 6px; }
        .lp-video-body p { font-size: 12px; color: rgba(255,255,255,.65); line-height: 1.55; }

        /* ── pricing ── */
        .lp-cards3.pricing { align-items: stretch; }
        .lp-plan { background: var(--white); border: 1.5px solid var(--hair-2); border-radius: var(--r-lg); padding: 26px 24px; display: flex; flex-direction: column; }
        .lp-plan.destacado { border-color: var(--navy); box-shadow: var(--sh-3); position: relative; }
        .lp-plan-badge {
          position: absolute; top: -12px; left: 24px; background: var(--yellow-2); color: var(--navy-900);
          font-size: 10.5px; font-weight: 800; padding: 4px 10px; border-radius: 100px; letter-spacing: .04em;
        }
        .lp-plan-tier { font-family: var(--f-mono); font-size: 12px; font-weight: 700; letter-spacing: .08em; color: var(--navy); margin-bottom: 6px; }
        .lp-plan-resumen { font-size: 13px; color: var(--ink-3); margin-bottom: 18px; min-height: 34px; }
        .lp-plan-features { list-style: none; padding: 0; margin: 0 0 22px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
        .lp-plan-features li { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--ink-2); }
        .lp-plan-features i { color: var(--forest); font-size: 11px; margin-top: 3px; flex-shrink: 0; }
        .lp-plan-note { font-size: 11.5px; color: var(--ink-4); text-align: center; margin-top: 18px; }

        /* ── IA banner ── */
        .lp-ia { background: linear-gradient(120deg, var(--navy-900) 0%, var(--navy) 100%); border-radius: var(--r-xl); padding: 44px 40px; color: #fff; display: flex; align-items: center; gap: 32px; justify-content: space-between; }
        .lp-ia-text h2 { font-family: ${lexend}; font-size: 24px; font-weight: 800; margin-bottom: 10px; letter-spacing: -.02em; }
        .lp-ia-text p { font-size: 14px; color: rgba(255,255,255,.75); max-width: 480px; line-height: 1.6; }
        .lp-ia-icon { font-size: 56px; color: var(--yellow); flex-shrink: 0; opacity: .9; }
        @media (max-width: 720px) { .lp-ia { flex-direction: column; text-align: center; } .lp-ia-text p { margin: 0 auto; } }

        /* ── contacto / CTA final ── */
        .lp-cta-band { text-align: center; }
        .lp-contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; }
        .lp-contact-form { background: var(--white); border: 1px solid var(--hair-2); border-radius: var(--r-lg); padding: 28px; }
        .lp-contact-form .form-group { margin-bottom: 14px; }
        .lp-thanks { text-align: center; padding: 30px 10px; }
        .lp-thanks i { font-size: 30px; color: var(--forest); margin-bottom: 12px; display: block; }
        .lp-thanks h3 { font-family: ${lexend}; font-size: 16px; margin-bottom: 6px; }
        .lp-thanks p { font-size: 13px; color: var(--ink-3); }

        /* ── footer ── */
        .lp-footer { border-top: 1px solid var(--hair); padding: 32px 0; }
        .lp-footer-inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .lp-footer-brand { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--ink-3); }
        .lp-footer-brand img { height: 20px; opacity: .8; }
        .lp-footer-links { display: flex; gap: 18px; font-size: 12.5px; color: var(--ink-3); }

        @media (max-width: 900px) {
          .lp-cards4 { grid-template-columns: 1fr 1fr; }
          .lp-contact-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 680px) {
          .lp-hero-h1 { font-size: 32px; }
          .lp-cards3, .lp-cards4 { grid-template-columns: 1fr; }
          .lp-section { padding: 48px 0; }
        }
      `}</style>

      <div className="lp">

        {/* ── Nav ── */}
        <div className="lp-nav">
          <div className="lp-nav-inner">
            <div className="lp-nav-brand">
              <img src="/assets/bacord-logo-mark.png" alt="BACORD" />
            </div>
            <div className="lp-nav-links">
              <a href="#producto">Producto</a>
              <a href="#como-funciona">Cómo funciona</a>
              <a href="#precios">Precios</a>
              <a href="#contacto">Contacto</a>
            </div>
            <div className="lp-nav-cta">
              <Link to="/login" className="lp-btn lp-btn-primary lp-btn-sm">
                <i className="fa fa-flask" aria-hidden="true" /> Explorar sandbox
              </Link>
            </div>
          </div>
        </div>

        {/* ── Hero ── */}
        <div className="lp-hero lp-container">
          <div className="lp-eyebrow">
            <i className="fa fa-industry" aria-hidden="true" /> ZENTTRA · Registro electrónico de lote para manufactura regulada
          </div>
          <h1 className="lp-hero-h1">
            El batch record electrónico que se implementa en <span>semanas, no en años</span>
          </h1>
          <p className="lp-hero-sub">
            BACORD digitaliza tu lote, tus firmas y tus desviaciones — y genera el paquete de auditoría en un clic.
            Pruébalo tú mismo, en vivo, antes de hablar con nosotros.
          </p>
          <div className="lp-hero-ctas">
            <Link to="/login" className="lp-btn lp-btn-accent">
              <i className="fa fa-flask" aria-hidden="true" /> Explorar el sandbox en vivo
            </Link>
            <a href="#como-funciona" className="lp-btn lp-btn-ghost">
              <i className="fa fa-play" aria-hidden="true" /> Ver cómo funciona
            </a>
          </div>
          <div className="lp-trust">
            {['Listo para auditoría INVIMA', 'Firmas electrónicas', 'Audit trail completo', 'Desviaciones y CAPA'].map(t => (
              <span key={t} className="lp-trust-pill"><i className="fa fa-check-circle" aria-hidden="true" /> {t}</span>
            ))}
          </div>
        </div>

        {/* ── Problema ── */}
        <div className="lp-section lp-section-alt">
          <div className="lp-container">
            <div className="lp-head center">
              <div className="lp-eyebrow">El problema</div>
              <h2 className="lp-h2">¿Sigues auditando con papel y Excel?</h2>
              <p className="lp-lead">Tres momentos donde el papel te cuesta más de lo que parece.</p>
            </div>
            <div className="lp-cards3">
              {PROBLEMAS.map(p => (
                <div className="lp-problem-card" key={p.titulo}>
                  <i className={`fa ${p.icon}`} aria-hidden="true" />
                  <h3>{p.titulo}</h3>
                  <p>{p.detalle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Producto / Solución ── */}
        <div className="lp-section" id="producto">
          <div className="lp-container">
            <div className="lp-head center">
              <div className="lp-eyebrow">La solución</div>
              <h2 className="lp-h2">Lo que BACORD resuelve desde el primer lote</h2>
              <p className="lp-lead">Cuatro módulos que reemplazan el papel sin obligarte a rediseñar tu planta.</p>
            </div>
            <div className="lp-cards4">
              {SOLUCIONES.map(s => (
                <div className="lp-sol-card" key={s.titulo}>
                  <div className="lp-sol-icon" style={{ background: s.bg, color: s.color }}>
                    <i className={`fa ${s.icon}`} aria-hidden="true" />
                  </div>
                  <h3>{s.titulo}</h3>
                  <p>{s.detalle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Comparación ── */}
        <div className="lp-section lp-section-alt">
          <div className="lp-container">
            <div className="lp-head center">
              <div className="lp-eyebrow">Por qué es diferente</div>
              <h2 className="lp-h2">No compites contra el papel, compites contra el miedo a la próxima auditoría</h2>
            </div>
            <div className="lp-compare-wrap">
              <table className="lp-compare">
                <thead>
                  <tr>
                    <th>Criterio</th>
                    <th>Papel / Excel</th>
                    <th>MES/EBR global</th>
                    <th className="hl">BACORD</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARACION.map(row => (
                    <tr key={row.criterio}>
                      <td className="criterio">{row.criterio}</td>
                      <td>{row.papel}</td>
                      <td>{row.global}</td>
                      <td className="hl">{row.bacord}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Video-first ── */}
        <div className="lp-section" id="como-funciona">
          <div className="lp-container">
            <div className="lp-head center">
              <div className="lp-eyebrow">Míralo funcionar</div>
              <h2 className="lp-h2">No es una demo de ventas — es el sistema real, en video</h2>
              <p className="lp-lead">Una serie corta mostrando BACORD en uso, sin data ficticia detrás de un formulario.</p>
            </div>
            <div className="lp-cards3">
              {VIDEOS.map(v => (
                <div className="lp-video-card" key={v.n}>
                  <div className="lp-video-thumb">
                    <span className="lp-video-badge">VIDEO {v.n} · PRÓXIMAMENTE</span>
                    <div className="lp-video-play"><i className="fa fa-play" aria-hidden="true" /></div>
                  </div>
                  <div className="lp-video-body">
                    <h3>{v.titulo}</h3>
                    <p>{v.detalle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Pricing ── */}
        <div className="lp-section lp-section-alt" id="precios">
          <div className="lp-container">
            <div className="lp-head center">
              <div className="lp-eyebrow">Precios</div>
              <h2 className="lp-h2">Empieza con una línea, crece a tu ritmo</h2>
              <p className="lp-lead">Implementación por grupo desplegado + suscripción anual. Sin licencia enterprise obligatoria desde el día 1.</p>
            </div>
            <div className="lp-cards3 pricing">
              {PLANES.map(p => (
                <div className={`lp-plan ${p.destacado ? 'destacado' : ''}`} key={p.tier}>
                  {p.destacado && <span className="lp-plan-badge">Más elegido</span>}
                  <div className="lp-plan-tier">{p.tier}</div>
                  <div className="lp-plan-resumen">{p.resumen}</div>
                  <ul className="lp-plan-features">
                    {p.features.map(feat => (
                      <li key={feat}><i className="fa fa-check" aria-hidden="true" /> {feat}</li>
                    ))}
                  </ul>
                  <a href="#contacto" className={`lp-btn ${p.destacado ? 'lp-btn-primary' : 'lp-btn-ghost'}`} style={{ justifyContent: 'center' }}>
                    Solicitar cotización
                  </a>
                </div>
              ))}
            </div>
            <p className="lp-plan-note">Precio final según grupos desplegados, plantas e integraciones. Un asesor te arma la propuesta exacta.</p>
          </div>
        </div>

        {/* ── IA roadmap ── */}
        <div className="lp-section">
          <div className="lp-container">
            <div className="lp-ia">
              <div className="lp-ia-text">
                <h2>Tus datos ya son la materia prima de la IA</h2>
                <p>
                  Cada lote que documentas en BACORD acumula historial estructurado. Cuando estés listo,
                  activa detección de patrones de desviación y análisis de causa raíz sobre tus propios datos —
                  sin migración, sin nueva implementación.
                </p>
              </div>
              <i className="fa fa-brain lp-ia-icon" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* ── Contacto / CTA final ── */}
        <div className="lp-section lp-section-alt" id="contacto">
          <div className="lp-container">
            <div className="lp-contact-grid">
              <div>
                <div className="lp-eyebrow">Hablemos</div>
                <h2 className="lp-h2">¿Listo para ver BACORD en tu propia operación?</h2>
                <p className="lp-lead" style={{ marginBottom: 24 }}>
                  Cuéntanos sobre tu planta y te contactamos con una propuesta a la medida. O si prefieres explorar primero,
                  entra directo al sandbox sin esperar respuesta.
                </p>
                <Link to="/login" className="lp-btn lp-btn-accent">
                  <i className="fa fa-flask" aria-hidden="true" /> Ir al sandbox ahora
                </Link>
              </div>

              <div className="lp-contact-form">
                {f.enviado ? (
                  <div className="lp-thanks">
                    <i className="fa fa-circle-check" aria-hidden="true" />
                    <h3>¡Gracias, {f.nombre.split(' ')[0]}!</h3>
                    <p>Recibimos tu mensaje. Un asesor comercial te va a contactar pronto.</p>
                  </div>
                ) : (
                  <form className="form-horizontal" onSubmit={f.handleSubmit}>
                    <div className="form-group">
                      <label htmlFor="lp-nombre">Nombre</label>
                      <input id="lp-nombre" className="form-control" value={f.nombre} onChange={e => f.setNombre(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="lp-correo">Correo corporativo</label>
                      <input id="lp-correo" type="email" className="form-control" value={f.correo} onChange={e => f.setCorreo(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="lp-empresa">Empresa / planta</label>
                      <input id="lp-empresa" className="form-control" value={f.empresa} onChange={e => f.setEmpresa(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="lp-mensaje">¿Qué te gustaría resolver primero?</label>
                      <textarea id="lp-mensaje" className="form-control" rows={3} value={f.mensaje} onChange={e => f.setMensaje(e.target.value)} />
                    </div>
                    <div className="form-actions" style={{ justifyContent: 'flex-start', border: 'none', marginTop: 4, paddingTop: 0 }}>
                      <button type="submit" className="lp-btn lp-btn-primary">
                        <i className="fa fa-paper-plane" aria-hidden="true" /> Enviar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="lp-footer">
          <div className="lp-container lp-footer-inner">
            <div className="lp-footer-brand">
              <img src="/assets/zenttra-circular.png" alt="ZENTTRA" />
              <span>BACORD es un producto de ZENTTRA · Manufactura regulada, sin papel</span>
            </div>
            <div className="lp-footer-links">
              <a href="#producto">Producto</a>
              <a href="#precios">Precios</a>
              <Link to="/login">Ingresar</Link>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
