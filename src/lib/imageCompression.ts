import imageCompression from 'browser-image-compression'

export interface OptimizedImage {
  file: File
  width: number
  height: number
}

/** Imagen optimizada (grande) + su miniatura (para rejillas/responsive). */
export interface OptimizedPair {
  full: OptimizedImage
  thumb: OptimizedImage
}

interface OptimizeOpts {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  initialQuality?: number
}

/**
 * Optimiza una imagen para el plan gratuito de Supabase: redimensiona, convierte
 * a WebP y comprime. Por defecto: 1600px máx / ~0,45 MB. Todo en cliente.
 */
export async function optimizeImage(
  input: File,
  opts: OptimizeOpts = {},
): Promise<OptimizedImage> {
  const { maxSizeMB = 0.45, maxWidthOrHeight = 1600, initialQuality = 0.8 } = opts
  let compressed: File
  try {
    compressed = await imageCompression(input, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality,
    })
  } catch {
    // Si la compresión falla por cualquier motivo, subimos el original.
    compressed = input
  }

  const { width, height } = await readDimensions(compressed)
  return { file: compressed, width, height }
}

/** Genera la versión grande (1600px) y una miniatura (640px, muy ligera). */
export async function optimizePair(input: File): Promise<OptimizedPair> {
  const full = await optimizeImage(input)
  const thumb = await optimizeImage(input, {
    maxSizeMB: 0.08,
    maxWidthOrHeight: 640,
    initialQuality: 0.7,
  })
  return { full, thumb }
}

async function readDimensions(
  file: Blob,
): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file)
      const dims = { width: bmp.width, height: bmp.height }
      bmp.close()
      return dims
    } catch {
      /* fallback abajo */
    }
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      resolve({ width: 0, height: 0 })
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
