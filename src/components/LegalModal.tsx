import { useState } from 'react'
import { Modal } from './Modal'

type Tab = 'aviso' | 'privacidad' | 'terminos' | 'cookies'

const TABS: { id: Tab; label: string }[] = [
  { id: 'aviso', label: 'Aviso legal' },
  { id: 'privacidad', label: 'Privacidad' },
  { id: 'terminos', label: 'Términos de uso' },
  { id: 'cookies', label: 'Cookies' },
]

export function LegalModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('aviso')

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Información legal"
      title="Términos y privacidad"
      size="lg"
      ariaLabel="Información legal"
    >
      <div
        role="tablist"
        className="mb-6 flex flex-wrap gap-2 border-b border-hairline pb-4"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'bg-forest text-cream'
                : 'border border-hairline text-title hover:bg-content/[0.06]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 text-[0.95rem] leading-relaxed text-content/80">
        {tab === 'aviso' && <Aviso />}
        {tab === 'privacidad' && <Privacidad />}
        {tab === 'terminos' && <Terminos />}
        {tab === 'cookies' && <Cookies />}
      </div>

      <p className="mt-6 border-t border-hairline pt-4 text-xs text-content/45">
        Última actualización: {new Date().toLocaleDateString('es-ES')}.
      </p>
    </Modal>
  )
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pt-2 font-display text-lg font-extrabold tracking-tighter text-title">
      {children}
    </h3>
  )
}

function Aviso() {
  return (
    <>
      <H>Titularidad</H>
      <p>
        Esta web y aplicación («AA Calendario») es un proyecto de agenda de
        convocatorias gestionado por <strong>XhadricogharX</strong>, con correo de
        contacto <strong>adriangarciacollantes2007@gmail.com</strong>.
      </p>
      <H>Objeto</H>
      <p>
        Difundir convocatorias (manifestaciones, concentraciones, asambleas y
        actos) y permitir a las personas usuarias confirmar su asistencia.
      </p>
      <H>Propiedad intelectual e industrial</H>
      <p>
        La marca, el logotipo y los signos de «Adelante Andalucía» pertenecen a
        sus titulares y se usan en el marco de la actividad del partido. El resto
        de contenidos y el código de la aplicación pertenecen a su titular. No se
        permite su reproducción sin autorización.
      </p>
    </>
  )
}

function Privacidad() {
  return (
    <>
      <H>Responsable del tratamiento</H>
      <p>
        <strong>XhadricogharX</strong>, correo{' '}
        <strong>adriangarciacollantes2007@gmail.com</strong> (RGPD y LOPDGDD).
      </p>
      <H>Qué datos tratamos</H>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Si confirmas asistencia:</strong> el nombre y apellido que
          facilites, junto a un identificador técnico anónimo de tu dispositivo y
          la fecha. No pedimos correo, teléfono ni ningún otro dato.
        </li>
        <li>
          <strong>Administradores:</strong> correo electrónico y credenciales de
          acceso.
        </li>
      </ul>
      <H>Finalidad y base jurídica</H>
      <p>
        Gestionar y dimensionar la asistencia a las convocatorias. La base es tu{' '}
        <strong>consentimiento</strong>, que prestas al pulsar «Confirmar
        asistencia».
      </p>
      <H>Conservación</H>
      <p>
        Los datos de asistencia se conservan el tiempo necesario para organizar
        el acto y se eliminan tras su celebración (orientativo: hasta{' '}
        <strong>30</strong> días después). Puedes pedir su supresión antes.
      </p>
      <H>Destinatarios</H>
      <p>
        Los datos se alojan en <strong>Supabase</strong> (proveedor de base de
        datos), preferentemente en región de la <strong>Unión Europea</strong>.
        No se ceden a terceros ni se usan con fines comerciales o publicitarios.
      </p>
      <H>Tus derechos</H>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión,
        limitación, oposición y portabilidad escribiendo a{' '}
        <strong>adriangarciacollantes2007@gmail.com</strong>. También puedes
        reclamar ante la
        Agencia Española de Protección de Datos (www.aepd.es). Servicio no
        dirigido a menores de 14 años.
      </p>
    </>
  )
}

function Terminos() {
  return (
    <>
      <H>Uso aceptable</H>
      <p>
        No está permitido introducir ni publicar contenido ilícito, ofensivo,
        discriminatorio, de odio, spam o que infrinja derechos de terceros. Los
        nombres de asistencia deben ser reales y contener solo letras.
      </p>
      <H>Confirmación de asistencia</H>
      <p>
        Confirmar la asistencia es un compromiso voluntario. Al no existir
        registro de usuario, <strong>no es posible eliminarla desde la app</strong>{' '}
        una vez enviada; puedes solicitar su supresión por correo.
      </p>
      <H>Disponibilidad y cambios</H>
      <p>
        Las convocatorias pueden modificarse o cancelarse. Verifica siempre la
        información en los canales oficiales del partido. No nos
        responsabilizamos de posibles errores, omisiones o interrupciones del
        servicio.
      </p>
      <H>Moderación</H>
      <p>
        Nos reservamos el derecho de eliminar asistencias o contenidos que
        incumplan estas normas.
      </p>
    </>
  )
}

function Cookies() {
  return (
    <>
      <H>Cookies y almacenamiento</H>
      <p>
        <strong>No usamos cookies publicitarias ni de seguimiento.</strong>
      </p>
      <H>Almacenamiento técnico necesario</H>
      <p>
        Guardamos en tu navegador un identificador anónimo de dispositivo y una
        marca de las asistencias confirmadas (para no duplicarlas) y, si eres
        administrador, tu sesión de acceso. Es estrictamente necesario para el
        funcionamiento, por lo que no requiere consentimiento.
      </p>
      <H>Servicios de terceros</H>
      <p>
        Los mapas se muestran con <strong>OpenStreetMap</strong> (geocodificación
        con Nominatim) y las tipografías con <strong>Google Fonts</strong>. Al
        pulsar «Abrir en Google Maps» o «Apple Maps» accedes a esos servicios,
        sujetos a sus propias políticas de privacidad.
      </p>
    </>
  )
}
