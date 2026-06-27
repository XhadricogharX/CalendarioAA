import { useLayoutEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { Reveal } from './Reveal'
import { StarMark } from './icons'

const PRINCIPLES = [
  {
    title: 'Andalucismo',
    text: 'Soberanía y autogobierno para Andalucía, con voz e identidad propias.',
  },
  {
    title: 'Feminismo',
    text: 'Igualdad real y vidas libres de violencia machista.',
  },
  {
    title: 'Ecosocialismo',
    text: 'Transición ecológica justa: agua, tierra y empleo verde.',
  },
  {
    title: 'Justicia social',
    text: 'Servicios públicos fuertes y derechos para la mayoría trabajadora.',
  },
]

export function Identity() {
  const root = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useLayoutEffect(() => {
    const el = root.current
    if (!el || reduced) return
    const ctx = gsap.context(() => {
      gsap.to('.id-star-bg', {
        yPercent: -28,
        rotate: 16,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      })
      gsap.to('.id-star-2', {
        yPercent: 38,
        rotate: -24,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      })
      gsap.to('.quote-star', {
        yPercent: -22,
        rotate: 18,
        ease: 'none',
        scrollTrigger: {
          trigger: '.quote-band',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      })
    }, el)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section
      id="identidad"
      ref={root}
      className="relative scroll-mt-20 overflow-hidden bg-page py-20 sm:py-28"
    >
      <StarMark className="id-star-bg pointer-events-none absolute -right-[6%] top-10 h-[26vmax] w-[26vmax] text-mint/[0.05]" />
      <StarMark className="id-star-2 pointer-events-none absolute -left-[8%] bottom-[6%] hidden h-[22vmax] w-[22vmax] text-mint/[0.04] lg:block" />

      <div className="relative mx-auto max-w-edge edge">
        <div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-16">
          <Reveal className="lg:col-span-7" stagger={0.12}>
            <p className="mb-5 inline-flex items-center gap-2 text-[0.78rem] font-bold uppercase tracking-[0.22em] text-mint-600">
              <span className="h-px w-8 bg-mint-600" />
              Quiénes somos
            </p>
            <h2 className="font-display text-[clamp(2.1rem,6vw,4.4rem)] font-extrabold leading-[0.96] tracking-tightest text-title">
              Una herramienta
              <br />
              del pueblo andaluz.
            </h2>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-content/75">
              Adelante Andalucía es una organización política andalucista y de
              izquierdas que defiende, desde Andalucía y para Andalucía, la
              justicia social, los servicios públicos, el feminismo y la
              transición ecológica.
            </p>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-content/75">
              Creemos en un pueblo que decide sobre su trabajo, su tierra y su
              futuro. Esta agenda reúne las convocatorias para hacerlo posible:
              en la calle, en los barrios y en cada rincón de Andalucía.
            </p>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-content/45">
              Organización política andalucista · 2019
            </p>
          </Reveal>

          <Reveal className="lg:col-span-5" stagger={0.1}>
            <ul className="divide-y divide-hairline border-y border-hairline">
              {PRINCIPLES.map((p, i) => (
                <li key={p.title} className="flex gap-5 py-6">
                  <span className="font-display text-lg font-extrabold text-mint-600">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-extrabold tracking-tighter text-title">
                      {p.title}
                    </h3>
                    <p className="mt-1 text-content/70">{p.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>

      {/* Banda declaración */}
      <Reveal className="mx-auto mt-16 max-w-edge edge sm:mt-24">
        <div className="quote-band relative isolate overflow-hidden rounded-3xl bg-forest px-7 py-14 text-cream grain sm:px-16 sm:py-20">
          <StarMark className="quote-star pointer-events-none absolute -bottom-12 -right-10 h-64 w-64 text-mint/10" />
          <p className="relative max-w-3xl font-display text-[clamp(1.8rem,4.5vw,3.2rem)] font-extrabold leading-[1.05] tracking-tighter">
            Organizar la esperanza. Pisar la calle.{' '}
            <span className="text-mint">Decidir nuestro futuro.</span>
          </p>
        </div>
      </Reveal>
    </section>
  )
}
