import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Captura errores de render para no dejar la pantalla en blanco: muestra un
 * mensaje claro con la marca y un botón para recargar.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Registro mínimo en consola (sin servicios externos ni datos personales).
    console.error('Error en la aplicación:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="grid min-h-[100svh] place-items-center bg-forest px-6 text-center text-cream">
        <div className="max-w-md">
          <h1 className="font-display text-3xl font-extrabold tracking-tighter">
            Algo no ha ido bien
          </h1>
          <p className="mt-3 leading-relaxed text-cream/70">
            Ha ocurrido un error inesperado. Recarga la página para volver al
            calendario.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-full bg-mint px-6 py-3 font-semibold text-forest transition-transform hover:scale-[1.03]"
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }
}
