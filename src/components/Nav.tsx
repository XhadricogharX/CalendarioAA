import { useEffect, useState } from 'react'
import { Brand } from './Brand'
import { useTheme } from '../hooks/useTheme'
import { IconSun, IconMoon } from './icons'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] transition-colors duration-300 ${
        scrolled
          ? 'border-b border-hairline bg-page/90 text-title backdrop-blur-md'
          : 'border-b border-transparent bg-transparent text-cream'
      }`}
    >
      <div className="mx-auto flex max-w-edge items-center justify-between gap-3 py-3 edge">
        <a
          href="#top"
          className="inline-flex items-center rounded-lg"
          aria-label="Adelante Andalucía, ir al inicio"
        >
          <Brand markClass="h-9 w-9" textClass="hidden text-[0.92rem] sm:block" />
        </a>

        <nav className="flex items-center gap-3 sm:gap-6">
          <a
            href="#identidad"
            className="hidden text-sm font-semibold tracking-tight transition-opacity duration-200 hover:opacity-60 sm:inline"
          >
            Identidad
          </a>

          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
            className={`grid h-10 w-10 cursor-pointer place-items-center rounded-full transition-colors duration-200 ${
              scrolled
                ? 'text-title hover:bg-black/[0.06]'
                : 'text-cream hover:bg-white/10'
            }`}
          >
            {theme === 'dark' ? (
              <IconSun className="h-5 w-5" />
            ) : (
              <IconMoon className="h-5 w-5" />
            )}
          </button>

          <a
            href="#calendario"
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold tracking-tight transition-colors duration-200 ${
              scrolled
                ? 'bg-forest text-cream hover:bg-forest-800'
                : 'bg-mint text-forest hover:bg-mint-400'
            }`}
          >
            Calendario
          </a>
        </nav>
      </div>
    </header>
  )
}
