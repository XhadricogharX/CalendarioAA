import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { IconCheck } from './icons'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const SEEN_KEY = 'aa_install_seen'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/** Evento global para abrir la guía desde cualquier sitio (p. ej. el pie). */
export function openInstallGuide() {
  window.dispatchEvent(new Event('aa-open-install'))
}

export function InstallApp() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setDeferred(null)
    const onOpen = () => setShowGuide(true)

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('aa-open-install', onOpen)

    // Primera visita (dispositivo nuevo): mostrar la guía una sola vez.
    let timer: number | undefined
    try {
      if (!isStandalone() && localStorage.getItem(SEEN_KEY) !== '1') {
        timer = window.setTimeout(() => {
          try {
            localStorage.setItem(SEEN_KEY, '1')
          } catch {
            /* sin localStorage */
          }
          setShowGuide(true)
        }, 1200)
      }
    } catch {
      /* sin localStorage */
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('aa-open-install', onOpen)
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  async function installNow() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setShowGuide(false)
  }

  return (
    <Modal
      open={showGuide}
      onClose={() => setShowGuide(false)}
      eyebrow="Progressive Web App"
      title="Instala la app en tu dispositivo"
      size="lg"
      ariaLabel="Cómo instalar la app"
    >
      <p className="mb-6 text-[0.95rem] leading-relaxed text-content/70">
        Añádela a tu pantalla de inicio para abrirla como una app normal, a
        pantalla completa y con acceso sin conexión.
      </p>

      {deferred && (
        <button type="button" onClick={installNow} className="btn-mint mb-6 w-full">
          <IconCheck className="h-5 w-5" />
          Instalar ahora
        </button>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Guide
          title="iPhone / iPad"
          subtitle="Safari"
          illustration={<IosShareArt />}
          steps={[
            'Pulsa el botón Compartir (el cuadro con la flecha hacia arriba).',
            'Elige “Añadir a pantalla de inicio”.',
            'Pulsa “Añadir” arriba a la derecha.',
          ]}
        />
        <Guide
          title="Android"
          subtitle="Chrome"
          illustration={<AndroidMenuArt />}
          steps={[
            'Abre el menú ⋮ (arriba a la derecha).',
            'Pulsa “Instalar app” o “Añadir a pantalla de inicio”.',
            'Confirma “Instalar”.',
          ]}
        />
        <Guide
          title="Ordenador"
          subtitle="Chrome o Edge"
          illustration={<DesktopArt />}
          steps={[
            'Mira al final de la barra de direcciones (arriba): aparece un icono de instalar (una pantallita con una flecha ⤓).',
            'Si no lo ves, abre el menú ⋮ y pulsa “Instalar Calendario…”.',
            'Pulsa “Instalar”.',
          ]}
        />
      </div>
    </Modal>
  )
}

function Guide({
  title,
  subtitle,
  illustration,
  steps,
}: {
  title: string
  subtitle: string
  illustration: React.ReactNode
  steps: string[]
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="mb-4 grid place-items-center rounded-xl bg-forest/[0.04] py-4">
        {illustration}
      </div>
      <h3 className="font-display text-lg font-extrabold leading-tight tracking-tighter text-title">
        {title}
      </h3>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-mint-600">
        {subtitle}
      </p>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-content/75">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mint text-[0.7rem] font-bold text-forest">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  )
}

/* Ilustraciones SVG (esquemas, no capturas) */

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 110" width="150" height="138" aria-hidden="true">
      <rect x="34" y="6" width="52" height="98" rx="10" fill="#06251B" />
      <rect x="38" y="14" width="44" height="82" rx="4" fill="#F5F4EC" />
      {children}
    </svg>
  )
}

function IosShareArt() {
  return (
    <Phone>
      <circle cx="60" cy="40" r="13" fill="#3CC489" opacity="0.18" />
      <path
        d="M60 30v16M55 35l5-5 5 5"
        stroke="#0B7A47"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M52 40h-3v12h22V40h-3"
        stroke="#0B7A47"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="44" y="70" width="32" height="7" rx="3.5" fill="#3CC489" />
      <rect x="44" y="82" width="22" height="6" rx="3" fill="#E4E2D6" />
    </Phone>
  )
}

function AndroidMenuArt() {
  return (
    <Phone>
      <circle cx="76" cy="22" r="2" fill="#0B7A47" />
      <circle cx="76" cy="28" r="2" fill="#0B7A47" />
      <circle cx="76" cy="34" r="2" fill="#0B7A47" />
      <rect x="50" y="44" width="30" height="22" rx="4" fill="#3CC489" opacity="0.18" />
      <rect x="54" y="49" width="22" height="5" rx="2.5" fill="#0B7A47" />
      <rect x="54" y="57" width="16" height="4" rx="2" fill="#27A874" />
    </Phone>
  )
}

function DesktopArt() {
  return (
    <svg viewBox="0 0 160 110" width="172" height="118" aria-hidden="true">
      {/* ventana navegador */}
      <rect x="10" y="12" width="140" height="86" rx="8" fill="#06251B" />
      <rect x="16" y="30" width="128" height="62" rx="4" fill="#F5F4EC" />
      {/* puntos */}
      <circle cx="22" cy="21" r="2.4" fill="#3CC489" />
      <circle cx="30" cy="21" r="2.4" fill="#5AD3A0" />
      <circle cx="38" cy="21" r="2.4" fill="#27A874" />
      {/* barra de direcciones */}
      <rect x="48" y="17" width="78" height="9" rx="4.5" fill="#0B3A2A" />
      {/* icono instalar resaltado */}
      <circle cx="135" cy="21.5" r="8" fill="#3CC489" opacity="0.25" />
      <rect x="130" y="17.5" width="10" height="7" rx="1.5" fill="none" stroke="#0B7A47" strokeWidth="1.6" />
      <path
        d="M135 19.5v3.5M133 21l2 2 2-2"
        stroke="#0B7A47"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
