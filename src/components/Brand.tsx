import { useState } from 'react'
import { StarMark } from './icons'

/** Isotipo: círculo verde menta con la estrella-molinillo blanca (tamaños pequeños). */
export function BrandMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-full bg-mint ${className}`}
    >
      <StarMark className="h-[58%] w-[58%] text-white" />
    </span>
  )
}

/**
 * Emblema circular completo (recreación fiel del logo): círculo verde con el
 * wordmark "Adelante Andalucía" en blanco y la estrella debajo. El texto escala
 * con el tamaño del círculo (unidades de contenedor `cqw`).
 */
export function BrandEmblem({ className = 'w-40' }: { className?: string }) {
  return (
    <div
      className={`relative grid aspect-square place-items-center rounded-full bg-mint ${className}`}
      style={{ containerType: 'inline-size' }}
      role="img"
      aria-label="Adelante Andalucía"
    >
      <div className="flex flex-col items-center px-[10%] text-center text-white">
        <span className="font-display font-extrabold leading-[0.82] tracking-tightest text-[14.5cqw]">
          <span className="block">Adelante</span>
          <span className="block">Andalucía</span>
        </span>
        <StarMark className="mt-[6cqw] w-[26%] text-white" />
      </div>
    </div>
  )
}

/**
 * Logo "inteligente". Si existe `public/logo.svg` (tu logo oficial), lo usa en
 * TODA la web. Si no, muestra la recreación (emblema o isotipo según `variant`).
 * Así solo tienes que pegar tu archivo y no tocar nada de código.
 */
export function Logo({
  className = 'w-40',
  variant = 'emblem',
}: {
  className?: string
  variant?: 'emblem' | 'mark'
}) {
  const [ok, setOk] = useState(false)
  const [failed, setFailed] = useState(false)
  const Fallback = variant === 'mark' ? BrandMark : BrandEmblem

  return (
    <div className={`relative aspect-square shrink-0 ${className}`}>
      {!ok && <Fallback className="absolute inset-0 h-full w-full" />}
      {!failed && (
        <img
          src="/logo.svg"
          alt="Adelante Andalucía"
          draggable={false}
          onLoad={() => setOk(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
            ok ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  )
}

interface BrandProps {
  className?: string
  markClass?: string
  textClass?: string
}

/** Lockup horizontal: logo + wordmark a dos líneas (barra de navegación / pie). */
export function Brand({
  className = '',
  markClass = 'h-10 w-10',
  textClass = 'text-[1.05rem]',
}: BrandProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Logo variant="mark" className={markClass} />
      <span
        className={`font-display font-extrabold leading-[0.86] tracking-tighter ${textClass}`}
      >
        <span className="block">Adelante</span>
        <span className="block">Andalucía</span>
      </span>
    </span>
  )
}
