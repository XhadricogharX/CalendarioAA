import { StarMark } from './icons'

const WORDS = [
  'Andalucismo',
  'Feminismo',
  'Ecosocialismo',
  'Justicia social',
  'Soberanía',
  'Servicios públicos',
  'Memoria democrática',
  'Tierra y agua',
]

function Group() {
  return (
    <div className="flex shrink-0 items-center" aria-hidden="true">
      {WORDS.map((w) => (
        <span key={w} className="flex items-center">
          <span className="px-6 font-display text-2xl font-extrabold uppercase tracking-tighter sm:px-9 sm:text-4xl">
            {w}
          </span>
          <StarMark className="h-3.5 w-3.5 text-forest/60 sm:h-4 sm:w-4" />
        </span>
      ))}
    </div>
  )
}

export function Marquee() {
  return (
    <div className="overflow-hidden border-y border-forest/15 bg-mint py-5 text-forest sm:py-7">
      <div className="flex w-max animate-marquee will-change-transform">
        <Group />
        <Group />
      </div>
    </div>
  )
}
