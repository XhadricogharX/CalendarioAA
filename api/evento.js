// Vercel Serverless Function — sirve /evento/<id> con etiquetas Open Graph del
// evento (foto, título, descripción) para que al compartir el enlace en
// WhatsApp/redes salga la vista previa de ESE evento. Para las personas, la app
// se carga igual y abre el evento; para los robots de previsualización, leen las
// etiquetas. Usa las variables que ya tienes en Vercel (VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY); no hace falta añadir nada nuevo.

const PROV = {
  almeria: 'Almería',
  cadiz: 'Cádiz',
  cordoba: 'Córdoba',
  granada: 'Granada',
  huelva: 'Huelva',
  jaen: 'Jaén',
  malaga: 'Málaga',
  sevilla: 'Sevilla',
  andalucia: 'Toda Andalucía',
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default async function handler(req, res) {
  const base = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const origin = `${proto}://${host}`
  const id = typeof req.query.id === 'string' ? req.query.id : ''

  // HTML base de la SPA (ya compilada, con sus assets).
  let html
  try {
    const shell = await fetch(`${origin}/index.html`)
    html = await shell.text()
  } catch {
    res.setHeader('Location', '/')
    res.status(302).end()
    return
  }

  let ev = null
  if (base && key && /^[0-9a-fA-F-]{16,}$/.test(id)) {
    try {
      const r = await fetch(
        `${base}/rest/v1/events?id=eq.${encodeURIComponent(id)}` +
          '&select=title,description,event_date,start_time,province,location,image_path,image_width,image_height,images&limit=1',
        { headers: { apikey: key, Authorization: `Bearer ${key}` } },
      )
      if (r.ok) {
        const rows = await r.json()
        ev = Array.isArray(rows) && rows.length ? rows[0] : null
      }
    } catch {
      /* sin datos → vista previa genérica */
    }
  }

  if (ev) {
    const dt = new Date(`${ev.event_date}T00:00:00`)
    const fecha = isNaN(dt.getTime())
      ? ''
      : dt.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
    const partes = [
      fecha,
      ev.start_time ? String(ev.start_time).slice(0, 5) : null,
      ev.location,
      ev.province ? PROV[ev.province] : null,
    ].filter(Boolean)

    const title = `${ev.title} · Adelante Andalucía`
    const desc =
      (ev.description
        ? ev.description.replace(/\s+/g, ' ').trim().slice(0, 160)
        : partes.join(' · ')) || 'Convocatoria de Adelante Andalucía'

    const imgPath =
      ev.image_path ||
      (Array.isArray(ev.images) && ev.images[0] && ev.images[0].path) ||
      null
    const img = imgPath
      ? `${base}/storage/v1/object/public/event-images/${imgPath}`
      : `${origin}/og-image.png`
    const imgW = imgPath ? ev.image_width : 1200
    const imgH = imgPath ? ev.image_height : 630
    const url = `${origin}/evento/${id}`

    const tags = [
      `<title>${esc(title)}</title>`,
      `<meta name="description" content="${esc(desc)}" />`,
      `<meta property="og:type" content="article" />`,
      `<meta property="og:locale" content="es_ES" />`,
      `<meta property="og:site_name" content="Adelante Andalucía" />`,
      `<meta property="og:title" content="${esc(title)}" />`,
      `<meta property="og:description" content="${esc(desc)}" />`,
      `<meta property="og:image" content="${esc(img)}" />`,
      imgW ? `<meta property="og:image:width" content="${imgW}" />` : '',
      imgH ? `<meta property="og:image:height" content="${imgH}" />` : '',
      `<meta property="og:url" content="${esc(url)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${esc(title)}" />`,
      `<meta name="twitter:description" content="${esc(desc)}" />`,
      `<meta name="twitter:image" content="${esc(img)}" />`,
    ]
      .filter(Boolean)
      .join('\n    ')

    html = html
      .replace(/<title>[\s\S]*?<\/title>/i, '')
      .replace(/\s*<meta\s+property="og:[^>]*>/gi, '')
      .replace(/\s*<meta\s+name="twitter:[^>]*>/gi, '')
      .replace(/\s*<meta\s+name="description"[^>]*>/gi, '')
      .replace('</head>', `    ${tags}\n  </head>`)
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400')
  res.status(200).send(html)
}
