import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IconCheck } from './icons'

export function Toast({
  message,
  duration = 3200,
  onDone,
}: {
  message: string
  duration?: number
  onDone: () => void
}) {
  const cb = useRef(onDone)
  cb.current = onDone

  useEffect(() => {
    const t = window.setTimeout(() => cb.current(), duration)
    return () => window.clearTimeout(t)
  }, [duration])

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-cream shadow-float animate-fade-up"
      >
        <IconCheck className="h-4 w-4 text-mint" />
        {message}
      </div>
    </div>,
    document.body,
  )
}
