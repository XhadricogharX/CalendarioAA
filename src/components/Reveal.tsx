import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { gsap } from '../lib/gsap'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Anima los hijos directos en cascada con este retardo (s). 0 = un solo bloque. */
  stagger?: number
  y?: number
  delay?: number
  start?: string
}

/**
 * Revela su contenido con GSAP + ScrollTrigger al entrar en viewport.
 * Si el usuario prefiere menos movimiento, muestra todo sin animación.
 */
export function Reveal({
  children,
  className,
  stagger = 0,
  y = 20,
  delay = 0,
  start = 'top 86%',
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reduced) return

    const ctx = gsap.context(() => {
      const targets =
        stagger > 0 && el.children.length ? Array.from(el.children) : el
      gsap.from(targets, {
        opacity: 0,
        y,
        duration: 0.8,
        ease: 'power3.out',
        delay,
        stagger,
        scrollTrigger: { trigger: el, start, once: true },
      })
    }, el)

    return () => ctx.revert()
  }, [reduced, stagger, y, delay, start])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
