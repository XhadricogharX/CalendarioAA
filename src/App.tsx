import { Suspense, lazy, useEffect, useState } from 'react'
import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { Marquee } from './components/Marquee'
import { Identity } from './components/Identity'
import { CalendarSection } from './components/CalendarSection'
import { Footer } from './components/Footer'
import { OfflineBanner } from './components/OfflineBanner'
import { InstallApp } from './components/InstallApp'
import { IconSpinner } from './components/icons'
import { registerDevice } from './lib/events'

// El panel de administración se carga bajo demanda (no pesa en la web pública).
const AdminPage = lazy(() =>
  import('./components/admin/AdminPage').then((m) => ({ default: m.AdminPage })),
)

function isAdminRoute(): boolean {
  return window.location.hash.replace(/^#\/?/, '').toLowerCase() === 'admin'
}

export default function App() {
  const [admin, setAdmin] = useState(isAdminRoute)

  useEffect(() => {
    const onHash = () => setAdmin(isAdminRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (admin) window.scrollTo(0, 0)
  }, [admin])

  // Primera carga: registra el id anónimo de dispositivo (best-effort).
  useEffect(() => {
    void registerDevice()
  }, [])

  return (
    <>
      <OfflineBanner />
      <InstallApp />

      {admin ? (
        // Página de administración: vista totalmente separada de la web pública.
        <Suspense
          fallback={
            <div className="grid min-h-[100svh] place-items-center bg-forest text-mint">
              <IconSpinner className="h-8 w-8" />
            </div>
          }
        >
          <AdminPage />
        </Suspense>
      ) : (
        <>
          <Nav />
          <main>
            <Hero />
            {/* El calendario es lo principal: aparece nada más entrar, sobre el hero. */}
            <CalendarSection primary />
            <Marquee />
            <Identity />
          </main>
          <Footer />
        </>
      )}
    </>
  )
}
