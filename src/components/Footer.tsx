import { useState } from 'react'
import { Brand } from './Brand'
import { LegalModal } from './LegalModal'
import { openInstallGuide } from './InstallApp'
import {
  IconInstagram,
  IconX,
  IconTelegram,
  IconFacebook,
  IconLock,
  IconArrowUpRight,
  IconArrowDown,
} from './icons'

const OFFICIAL = 'https://adelanteandalucia.org'
const INSTAGRAM = 'https://www.instagram.com/adelanteandalucia'
const TELEGRAM = 'https://t.me/adelante_andalucia'
const TWITTER = 'https://x.com/AdelanteAND'
const FACEBOOK = 'https://www.facebook.com/AdelanteAndalucia'

export function Footer() {
  const year = new Date().getFullYear()
  const [legalOpen, setLegalOpen] = useState(false)

  return (
    <>
    <footer className="relative isolate overflow-hidden bg-forest text-cream grain">
      <div className="mx-auto max-w-edge edge py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Brand markClass="h-11 w-11" textClass="text-lg" />
            <p className="mt-5 max-w-sm leading-relaxed text-cream/65">
              La agenda viva de Adelante Andalucía. Manifestaciones, asambleas y
              actos para organizarnos, barrio a barrio y pueblo a pueblo.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Social href={INSTAGRAM} label="Instagram de Adelante Andalucía">
                <IconInstagram className="h-5 w-5" />
              </Social>
              <Social href={TWITTER} label="Perfil de Adelante Andalucía en X">
                <IconX className="h-4 w-4" />
              </Social>
              <Social href={TELEGRAM} label="Telegram de Adelante Andalucía">
                <IconTelegram className="h-5 w-5" />
              </Social>
              <Social href={FACEBOOK} label="Facebook de Adelante Andalucía">
                <IconFacebook className="h-5 w-5" />
              </Social>
            </div>
            <button
              type="button"
              onClick={openInstallGuide}
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:border-mint hover:text-mint"
            >
              <IconArrowDown className="h-4 w-4" />
              Instalar app
            </button>
          </div>

          <nav className="lg:col-span-3" aria-label="Navegación del pie">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-mint">
              Navegación
            </h2>
            <ul className="mt-4 space-y-3 text-cream/75">
              <FooterLink href="#top">Inicio</FooterLink>
              <FooterLink href="#identidad">Identidad</FooterLink>
              <FooterLink href="#calendario">Calendario</FooterLink>
            </ul>
          </nav>

          <div className="lg:col-span-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-mint">
              Partido
            </h2>
            <ul className="mt-4 space-y-3 text-cream/75">
              <li>
                <a
                  href={OFFICIAL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-mint"
                >
                  Sitio web oficial
                  <IconArrowUpRight className="h-4 w-4" />
                </a>
              </li>
              <li>
                <a
                  href={`${OFFICIAL}/quienes-somos/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-mint"
                >
                  Quiénes somos
                  <IconArrowUpRight className="h-4 w-4" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-7 text-sm text-cream/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} · Calendario de Adelante Andalucía. Hecho por XhadricogharX.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={() => setLegalOpen(true)}
              className="cursor-pointer text-cream/50 transition-colors hover:text-mint"
            >
              Aviso legal y privacidad
            </button>
            <a
              href="#admin"
              className="inline-flex items-center gap-1.5 text-cream/40 transition-colors hover:text-mint"
              aria-label="Acceso de administración"
            >
              <IconLock className="h-3.5 w-3.5" />
              Acceso
            </a>
          </div>
        </div>
      </div>
    </footer>
    <LegalModal open={legalOpen} onClose={() => setLegalOpen(false)} />
    </>
  )
}

function Social({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-cream/80 transition-colors duration-200 hover:border-mint hover:text-mint"
    >
      {children}
    </a>
  )
}

function FooterLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <li>
      <a href={href} className="transition-colors hover:text-mint">
        {children}
      </a>
    </li>
  )
}
