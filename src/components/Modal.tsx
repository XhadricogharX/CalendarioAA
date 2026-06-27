import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './icons'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  eyebrow?: ReactNode
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  ariaLabel?: string
}

const sizes: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
}

function trapTab(e: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return
  const els = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  if (!els.length) return
  const first = els[0]
  const last = els[els.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  size = 'md',
  ariaLabel,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restoreFocus.current = document.activeElement as HTMLElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])',
      )
      ;(focusable ?? panelRef.current)?.focus()
    }, 40)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Tab') {
        trapTab(e, panelRef.current)
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      restoreFocus.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-forest/55 animate-fade backdrop-blur-[3px]"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-page shadow-float outline-none animate-sheet-up sm:rounded-3xl ${sizes[size]}`}
      >
        {(title || eyebrow) && (
          <header className="flex items-start justify-between gap-4 border-b border-hairline px-6 py-5 sm:px-8">
            <div className="min-w-0">
              {eyebrow && (
                <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-mint-600">
                  {eyebrow}
                </p>
              )}
              {title && (
                <h2 className="font-display text-xl font-extrabold leading-tight tracking-tighter text-title sm:text-2xl">
                  {title}
                </h2>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-title/70 transition-colors duration-200 hover:bg-content/[0.08] hover:text-title"
            >
              <IconClose className="h-5 w-5" />
            </button>
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
