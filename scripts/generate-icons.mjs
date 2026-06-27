// Genera los iconos PNG de la PWA.
//   · Si existe  public/logo.svg  → usa TU logo oficial.
//   · Si no existe → usa la marca recreada (círculo verde + estrella).
// Uso: npm run generate-icons   (requiere la devDependency `sharp`)
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'icons')
const CUSTOM = join(ROOT, 'public', 'logo.svg')
const hasCustom = existsSync(CUSTOM)

const MINT = '#3CC489'
const PETAL = 'M50 51 C43 41 42 23 52 8 C61 23 57 42 50 51 Z'

function star(fill) {
  return `<g fill="${fill}">
    <path d="${PETAL}"/>
    <path d="${PETAL}" transform="rotate(90 50 50)"/>
    <path d="${PETAL}" transform="rotate(180 50 50)"/>
    <path d="${PETAL}" transform="rotate(270 50 50)"/>
  </g>`
}

function builtinSvg(scale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${MINT}"/>
  <g transform="translate(50 50) scale(${scale}) translate(-50 -50)">
    ${star('#ffffff')}
  </g>
</svg>`
}

// name, size, builtinScale, customScale (más pequeño en maskable por la zona segura)
const TASKS = [
  ['icon-192.png', 192, 0.7, 0.92],
  ['icon-512.png', 512, 0.7, 0.92],
  ['maskable-512.png', 512, 0.52, 0.78],
  ['apple-touch-icon.png', 180, 0.66, 0.9],
]

await mkdir(OUT, { recursive: true })

for (const [name, size, builtinScale, customScale] of TASKS) {
  let buf
  if (hasCustom) {
    const inner = Math.round(size * customScale)
    const logo = await sharp(CUSTOM, { density: 384 })
      .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    buf = await sharp({
      create: { width: size, height: size, channels: 4, background: '#ffffff' },
    })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toBuffer()
  } else {
    buf = await sharp(Buffer.from(builtinSvg(builtinScale))).resize(size, size).png().toBuffer()
  }
  await writeFile(join(OUT, name), buf)
  console.log('✓', name, `${size}×${size}`, hasCustom ? '· desde logo.svg' : '· marca integrada')
}

// Imagen Open Graph (1200×630) para vistas previas al compartir el enlace.
const ogLogoSrc = hasCustom ? CUSTOM : Buffer.from(builtinSvg(0.7))
const ogLogo = await sharp(ogLogoSrc, { density: 300 })
  .resize(440, 440, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer()
await sharp({
  create: { width: 1200, height: 630, channels: 4, background: '#06251B' },
})
  .composite([{ input: ogLogo, gravity: 'center' }])
  .png()
  .toFile(join(OUT, '..', 'og-image.png'))
console.log('✓ og-image.png 1200×630')

console.log(
  hasCustom
    ? 'Iconos generados desde tu public/logo.svg ✓'
    : 'No hay public/logo.svg: usados los iconos por defecto. (Pega tu logo y vuelve a ejecutar.)',
)
