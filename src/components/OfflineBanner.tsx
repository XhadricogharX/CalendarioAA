import { useEffect, useState } from 'react'

export function OfflineBanner() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  )

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[env(safe-area-inset-top)]"
    >
      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 shadow-float animate-fade-up">
        <span className="h-2 w-2 rounded-full bg-amber-950" />
        Sin conexión · puede que no veas las últimas convocatorias
      </div>
    </div>
  )
}
