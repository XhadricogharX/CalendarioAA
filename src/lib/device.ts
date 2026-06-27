// Identificador anónimo de dispositivo (sin datos personales). Sirve para
// limitar a 1 confirmación de asistencia por dispositivo y evento, y como
// medida anti-abuso básica (junto con el límite por tiempo del servidor).
const KEY = 'aa_device_id'

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    // Si no hay localStorage (modo privado), generamos uno efímero.
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}
