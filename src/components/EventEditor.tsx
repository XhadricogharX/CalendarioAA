import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Modal } from './Modal'
import {
  CATEGORIES,
  CATEGORY_ORDER,
  PROVINCES,
  PROVINCE_ORDER,
  type EventCategory,
  type EventDraft,
  type EventImage,
  type PartyEvent,
  type Province,
} from '../lib/types'
import { createEvent, updateEvent, publicImageUrl } from '../lib/events'
import {
  optimizeImage,
  optimizePair,
  formatBytes,
  type OptimizedImage,
  type OptimizedPair,
} from '../lib/imageCompression'
import { formatLongDate } from '../lib/dates'
import {
  IconImage,
  IconSpinner,
  IconTrash,
  IconUpload,
  IconCheck,
  IconPlus,
} from './icons'

interface GalleryNewItem {
  id: string
  pair: OptimizedPair
  url: string
}

interface EventEditorProps {
  open: boolean
  onClose: () => void
  dateKey: string
  existing: PartyEvent | null
  minKey: string
  maxKey: string
  onSaved: (message: string) => void
}

export function EventEditor({
  open,
  onClose,
  dateKey,
  existing,
  minKey,
  maxKey,
  onSaved,
}: EventEditorProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<EventCategory>('manifestacion')
  const [province, setProvince] = useState<Province | ''>('')
  const [eventDate, setEventDate] = useState(dateKey)
  const [startTime, setStartTime] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')

  const [optimized, setOptimized] = useState<OptimizedImage | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removeExisting, setRemoveExisting] = useState(false)
  const [origSize, setOrigSize] = useState(0)
  const [optimizing, setOptimizing] = useState(false)

  // Galería (imágenes adicionales): las que se conservan + las nuevas.
  const [galleryKeep, setGalleryKeep] = useState<EventImage[]>([])
  const [galleryNew, setGalleryNew] = useState<GalleryNewItem[]>([])
  const [galleryBusy, setGalleryBusy] = useState(false)
  const galleryUrls = useRef<string[]>([])
  const galleryInput = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const objectUrl = useRef<string | null>(null)

  // Inicializa el formulario cada vez que se abre.
  useEffect(() => {
    if (!open) return
    setTitle(existing?.title ?? '')
    setCategory(existing?.category ?? 'manifestacion')
    setProvince(existing?.province ?? '')
    setEventDate(existing?.event_date ?? dateKey)
    setStartTime(existing?.start_time ?? '')
    setLocation(existing?.location ?? '')
    setDescription(existing?.description ?? '')
    setOptimized(null)
    setRemoveExisting(false)
    setOrigSize(0)
    setError(null)
    setOptimizing(false)
    revokeUrl()
    setPreview(existing?.image_path ? publicImageUrl(existing.image_path) : null)
    setGalleryKeep(existing?.images ?? [])
    revokeGalleryUrls()
    setGalleryNew([])
    setGalleryBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing, dateKey])

  useEffect(
    () => () => {
      revokeUrl()
      revokeGalleryUrls()
    },
    [],
  )

  function revokeUrl() {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current)
      objectUrl.current = null
    }
  }

  function revokeGalleryUrls() {
    for (const u of galleryUrls.current) URL.revokeObjectURL(u)
    galleryUrls.current = []
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen.')
      return
    }
    setError(null)
    setOrigSize(file.size)
    setOptimizing(true)
    try {
      const opt = await optimizeImage(file)
      revokeUrl()
      const url = URL.createObjectURL(opt.file)
      objectUrl.current = url
      setOptimized(opt)
      setPreview(url)
      setRemoveExisting(false)
    } catch {
      setError('No se pudo procesar la imagen. Prueba con otra.')
    } finally {
      setOptimizing(false)
    }
  }

  function clearImage() {
    revokeUrl()
    setOptimized(null)
    setOrigSize(0)
    setPreview(null)
    setRemoveExisting(true)
    if (fileInput.current) fileInput.current.value = ''
  }

  async function handleGalleryFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (galleryInput.current) galleryInput.current.value = ''
    if (!files.length) return
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (!images.length) {
      setError('Los archivos de la galería deben ser imágenes.')
      return
    }
    setError(null)
    setGalleryBusy(true)
    try {
      const items: GalleryNewItem[] = []
      for (const file of images) {
        const pair = await optimizePair(file)
        const url = URL.createObjectURL(pair.thumb.file)
        galleryUrls.current.push(url)
        items.push({ id: crypto.randomUUID(), pair, url })
      }
      setGalleryNew((prev) => [...prev, ...items])
    } catch {
      setError('No se pudieron procesar algunas imágenes de la galería.')
    } finally {
      setGalleryBusy(false)
    }
  }

  function removeGalleryKeep(path: string) {
    setGalleryKeep((prev) => prev.filter((g) => g.path !== path))
  }

  function removeGalleryNew(id: string) {
    setGalleryNew((prev) => {
      const item = prev.find((g) => g.id === id)
      if (item) {
        URL.revokeObjectURL(item.url)
        galleryUrls.current = galleryUrls.current.filter((u) => u !== item.url)
      }
      return prev.filter((g) => g.id !== id)
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError('Ponle un título a la convocatoria.')
      return
    }
    if (!province) {
      setError('Elige la provincia del evento.')
      return
    }
    if (eventDate < minKey || eventDate > maxKey) {
      setError('La fecha está fuera del rango disponible (este mes o el siguiente).')
      return
    }

    const draft: EventDraft = {
      event_date: eventDate,
      start_time: startTime || null,
      title: title.trim(),
      description: description.trim() || null,
      category,
      province: province as Province,
      location: location.trim() || null,
    }

    const galleryNewPairs = galleryNew.map((g) => g.pair)

    setSaving(true)
    try {
      if (existing) {
        await updateEvent(
          existing,
          draft,
          optimized,
          removeExisting,
          galleryKeep,
          galleryNewPairs,
        )
        onSaved('Convocatoria actualizada')
      } else {
        await createEvent(draft, optimized, galleryNewPairs)
        onSaved('Convocatoria publicada')
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  const savings =
    origSize > 0 && optimized
      ? Math.max(0, Math.round((1 - optimized.file.size / origSize) * 100))
      : 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={existing ? 'Editar' : 'Nueva convocatoria'}
      title={
        existing ? 'Editar convocatoria' : `Convocar · ${formatLongDate(dateKey)}`
      }
      size="lg"
      ariaLabel="Editor de convocatoria"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="ev-title">
            Título
          </label>
          <input
            id="ev-title"
            className="field"
            placeholder="Ej. Manifestación por la sanidad pública"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ev-cat">
              Tipo de evento
            </label>
            <select
              id="ev-cat"
              className="field cursor-pointer"
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
            >
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIES[c].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ev-prov">
              Provincia
            </label>
            <select
              id="ev-prov"
              className="field cursor-pointer"
              value={province}
              onChange={(e) => setProvince(e.target.value as Province)}
              required
            >
              <option value="" disabled>
                Elige provincia…
              </option>
              {PROVINCE_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PROVINCES[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="ev-loc">
            Ubicación <span className="font-normal text-content/40">(opcional)</span>
          </label>
          <input
            id="ev-loc"
            className="field"
            placeholder="Ej. Plaza Nueva, Sevilla"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={160}
          />
          <p className="mt-1.5 text-xs text-content/50">
            Si la indicas, se mostrará en un mapa dentro de la app.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ev-date">
              Fecha
            </label>
            <input
              id="ev-date"
              type="date"
              className="field cursor-pointer"
              value={eventDate}
              min={minKey}
              max={maxKey}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="ev-time">
              Hora <span className="font-normal text-content/40">(opcional)</span>
            </label>
            <input
              id="ev-time"
              type="time"
              className="field cursor-pointer"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="ev-desc">
            Descripción{' '}
            <span className="font-normal text-content/40">(opcional)</span>
          </label>
          <textarea
            id="ev-desc"
            className="field min-h-[120px] resize-y"
            placeholder="Detalles de la convocatoria, recorrido, lemas, contacto…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1200}
          />
        </div>

        {/* Imagen */}
        <div>
          <span className="label">
            Imagen <span className="font-normal text-content/40">(opcional)</span>
          </span>

          {preview ? (
            <div className="overflow-hidden rounded-2xl border border-hairline bg-forest/5">
              <div className="grid place-items-center bg-forest/[0.04]">
                <img
                  src={preview}
                  alt="Vista previa de la imagen de la convocatoria"
                  className="max-h-72 w-full object-contain"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3">
                <div className="text-xs text-content/60">
                  {optimized ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-green-action">
                      <IconCheck className="h-4 w-4" />
                      Optimizada a WebP · {formatBytes(optimized.file.size)}
                      {savings > 0 && (
                        <span className="text-content/50">
                          {' '}
                          (desde {formatBytes(origSize)}, −{savings}%)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>Imagen actual</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearImage}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-red-600 transition-colors hover:text-red-700"
                >
                  <IconTrash className="h-4 w-4" />
                  Quitar
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="ev-image"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-hairline bg-surface/50 px-4 py-8 text-center transition-colors hover:border-mint-600 hover:bg-mint/5"
            >
              {optimizing ? (
                <IconSpinner className="h-7 w-7 text-mint-600" />
              ) : (
                <IconImage className="h-7 w-7 text-content/40" />
              )}
              <span className="text-sm font-semibold text-title">
                {optimizing ? 'Optimizando…' : 'Subir imagen'}
              </span>
              <span className="text-xs text-content/50">
                Se comprime y convierte a WebP automáticamente
              </span>
            </label>
          )}
          <input
            ref={fileInput}
            id="ev-image"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFile}
          />
        </div>

        {/* Galería (imágenes adicionales) */}
        <div>
          <span className="label">
            Galería{' '}
            <span className="font-normal text-content/40">
              (imágenes adicionales, opcional)
            </span>
          </span>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {galleryKeep.map((img) => (
              <GalleryThumb
                key={img.path}
                src={publicImageUrl(img.thumb ?? img.path) ?? ''}
                onRemove={() => removeGalleryKeep(img.path)}
              />
            ))}
            {galleryNew.map((item) => (
              <GalleryThumb
                key={item.id}
                src={item.url}
                onRemove={() => removeGalleryNew(item.id)}
              />
            ))}

            <label
              htmlFor="ev-gallery"
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-hairline bg-surface/50 text-center transition-colors hover:border-mint-600 hover:bg-mint/5"
            >
              {galleryBusy ? (
                <IconSpinner className="h-5 w-5 text-mint-600" />
              ) : (
                <IconPlus className="h-5 w-5 text-content/40" />
              )}
              <span className="px-1 text-[0.7rem] font-semibold text-content/60">
                {galleryBusy ? 'Procesando…' : 'Añadir'}
              </span>
            </label>
          </div>
          <p className="mt-1.5 text-xs text-content/50">
            Puedes subir varias. Se optimizan a WebP y se generan miniaturas
            automáticamente.
          </p>
          <input
            ref={galleryInput}
            id="ev-gallery"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={handleGalleryFiles}
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

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving || optimizing || galleryBusy}
          >
            {saving ? (
              <>
                <IconSpinner className="h-5 w-5" />
                Guardando…
              </>
            ) : (
              <>
                <IconUpload className="h-5 w-5" />
                {existing ? 'Guardar cambios' : 'Publicar convocatoria'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function GalleryThumb({
  src,
  onRemove,
}: {
  src: string
  onRemove: () => void
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-hairline bg-forest/5">
      {src && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Quitar imagen de la galería"
        className="absolute right-1.5 top-1.5 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-red-600"
      >
        <IconTrash className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
