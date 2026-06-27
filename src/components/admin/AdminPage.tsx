import { useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Brand, BrandMark } from '../Brand'
import { CalendarSection } from '../CalendarSection'
import { AdminStats } from './AdminStats'
import {
  IconLock,
  IconSpinner,
  IconLogout,
  IconArrowUpRight,
  IconChevronLeft,
} from '../icons'

export function AdminPage() {
  const { isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="grid min-h-[100svh] place-items-center bg-forest text-mint">
        <IconSpinner className="h-8 w-8" />
      </div>
    )
  }

  return isAdmin ? <AdminDashboard /> : <AdminLogin />
}

function AdminLogin() {
  const { signIn, configured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(traducir(error))
  }

  return (
    <div className="relative isolate grid min-h-[100svh] place-items-center overflow-hidden bg-forest px-5 py-16 text-cream grain">
      <div className="w-full max-w-md">
        <a
          href="#top"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-cream/60 transition-colors hover:text-mint"
        >
          <IconChevronLeft className="h-4 w-4" />
          Volver a la web
        </a>

        <div className="mb-6 flex items-center gap-3">
          <BrandMark className="h-12 w-12" />
          <div>
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.2em] text-mint">
              Área de organización
            </p>
            <h1 className="font-display text-2xl font-extrabold tracking-tighter">
              Acceso de administración
            </h1>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl bg-page p-7 text-content shadow-float sm:p-8"
        >
          {!configured && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Supabase no está configurado. Añade tus claves en{' '}
              <code className="font-mono">.env</code> (ver README) para activar el
              acceso.
            </div>
          )}

          <div>
            <label className="label" htmlFor="admin-email">
              Correo electrónico
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              className="field"
              placeholder="tu@adelanteandalucia.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="admin-password">
              Contraseña
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              className="field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading || !configured}
          >
            {loading ? (
              <>
                <IconSpinner className="h-5 w-5" />
                Entrando…
              </>
            ) : (
              <>
                <IconLock className="h-5 w-5" />
                Entrar
              </>
            )}
          </button>

          <p className="pt-1 text-center text-xs text-content/45">
            Solo personas autorizadas del partido tienen cuenta.
          </p>
        </form>
      </div>
    </div>
  )
}

function AdminDashboard() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-[100svh] bg-page">
      <header className="sticky top-0 z-30 border-b border-hairline bg-page/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-edge items-center justify-between gap-4 py-3 edge">
          <div className="flex items-center gap-3">
            <Brand markClass="h-9 w-9" textClass="text-[0.92rem] text-title" />
            <span className="hidden rounded-full bg-mint/20 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-green-action sm:inline">
              Panel
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a href="#top" className="btn-ghost !py-2.5">
              <IconArrowUpRight className="h-4 w-4" />
              Ver web
            </a>
            <button
              type="button"
              onClick={() => void signOut()}
              className="btn-primary !py-2.5"
            >
              <IconLogout className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-edge px-[var(--edge-x)] pt-8">
          <AdminStats />
        </div>
        <CalendarSection admin />
      </main>
    </div>
  )
}

function traducir(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.'
  if (m.includes('email not confirmed'))
    return 'Tu correo aún no está confirmado.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
  if (m.includes('configurado')) return msg
  return msg
}
