import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from '../lib/gsap'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { isSupabaseConfigured } from '../lib/supabase'
import { fetchNextEvent } from '../lib/events'
import { fromKey, MONTHS } from '../lib/dates'
import type { PartyEvent } from '../lib/types'
import { Logo } from './Brand'
import { StarMark, IconArrowDown, IconCalendar, IconArrowUpRight } from './icons'

function shortDate(key: string): string {
  const d = fromKey(key)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}.`
}

export function Hero() {
  const root = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const [next, setNext] = useState<PartyEvent | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true
    fetchNextEvent()
      .then((e) => active && setNext(e))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useLayoutEffect(() => {
    const el = root.current
    if (!el || reduced) return

    const ctx = gsap.context(() => {
      // --- Entrada ---
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.hero-eyebrow', { y: 16, opacity: 0, duration: 0.6 })
        .from('.hero-line', { yPercent: 115, duration: 0.9, stagger: 0.1 }, '-=0.2')
        .from('.hero-sub', { y: 18, opacity: 0, duration: 0.6 }, '-=0.5')
        .from('.hero-cta', { y: 18, opacity: 0, duration: 0.6 }, '-=0.45')
        .from(
          '.hero-emblem',
          { scale: 0.85, opacity: 0, rotate: -6, duration: 1, ease: 'power4.out' },
          '-=1.0',
        )

      // --- Parallax dirigido por el scroll (scrub) ---
      const scrub = { trigger: el, start: 'top top', end: 'bottom top', scrub: true }
      gsap.to('.hero-glow', { yPercent: 40, ease: 'none', scrollTrigger: scrub })
      gsap.to('.hero-star', { yPercent: 32, rotate: 20, ease: 'none', scrollTrigger: scrub })
      gsap.to('.hero-emblem-wrap', { yPercent: -16, ease: 'none', scrollTrigger: scrub })
      gsap.to('.hero-text', {
        yPercent: -10,
        opacity: 0.5,
        ease: 'none',
        scrollTrigger: scrub,
      })
    }, el)

    return () => ctx.revert()
  }, [reduced])

  return (
    <section
      id="top"
      ref={root}
      className="relative isolate overflow-hidden bg-forest pb-40 pt-28 text-cream grain sm:pt-32 lg:pb-52"
    >
      <div
        className="hero-glow pointer-events-none absolute -right-[12%] -top-[20%] h-[60vmax] w-[60vmax] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(60,196,137,0.22), rgba(60,196,137,0) 60%)',
        }}
        aria-hidden="true"
      />
      <StarMark className="hero-star pointer-events-none absolute -left-[10%] bottom-[2%] h-[34vmax] w-[34vmax] text-mint/[0.06]" />

      <div className="relative mx-auto grid w-full max-w-edge items-center gap-y-12 edge lg:grid-cols-12 lg:gap-x-10">
        <div className="hero-text order-2 lg:order-1 lg:col-span-7">
          <p className="hero-eyebrow mb-5 flex items-center gap-3 text-[0.78rem] font-bold uppercase tracking-[0.24em] text-mint">
            <span className="h-px w-9 bg-mint/60" />
            Andalucista · Feminista · Ecosocialista
          </p>

          <h1 className="display-hero text-[clamp(2.6rem,8vw,6rem)]">
            <span className="block overflow-hidden pb-[0.08em]">
              <span className="hero-line block">Organízate,</span>
            </span>
            <span className="block overflow-hidden pb-[0.08em]">
              <span className="hero-line block text-mint">Andalucía.</span>
            </span>
          </h1>

          <p className="hero-sub mt-6 max-w-lg text-lg leading-relaxed text-cream/80">
            Manifestaciones, asambleas y actos de Adelante Andalucía en un
            calendario vivo. Pulsa cualquier día para verlo en grande.
          </p>

          <div className="hero-cta mt-8 flex flex-wrap items-center gap-3">
            <a href="#calendario" className="btn-mint text-base">
              Ver el calendario
              <IconArrowDown className="h-5 w-5" />
            </a>
            <a
              href="#identidad"
              className="btn border border-white/25 text-cream hover:bg-white/10"
            >
              Quiénes somos
            </a>
          </div>

          {next && (
            <a
              href={`#/evento/${next.id}`}
              className="mt-6 inline-flex max-w-full items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.06] py-2 pl-3 pr-4 text-sm text-cream/85 transition-colors hover:border-mint hover:bg-white/10"
            >
              <span className="inline-flex shrink-0 items-center gap-1.5 font-bold text-mint">
                <IconCalendar className="h-4 w-4" />
                Próxima
              </span>
              <span className="truncate">
                {shortDate(next.event_date)} · {next.title}
              </span>
              <IconArrowUpRight className="h-4 w-4 shrink-0 text-cream/55" />
            </a>
          )}
        </div>

        <div className="order-1 flex justify-center lg:order-2 lg:col-span-5 lg:justify-end">
          <div className="hero-emblem-wrap">
            <Logo variant="emblem" className="hero-emblem w-52 sm:w-64 lg:w-[20rem]" />
          </div>
        </div>
      </div>
    </section>
  )
}
