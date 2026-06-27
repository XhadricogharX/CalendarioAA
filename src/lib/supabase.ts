import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Cliente de Supabase. Si faltan las variables de entorno, exportamos `null`
 * y la app muestra un aviso de configuración en vez de romperse.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export const EVENT_BUCKET = 'event-images'

export function publicImageUrl(path: string | null): string | null {
  if (!path || !supabase) return null
  const { data } = supabase.storage.from(EVENT_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
