/**
 * 生成：
 * 1) 推广卡手机图：窄档（最多 320w）+ 源宽档 的 WebP + AVIF（不放大）
 * 2) Lottie 占位海报：从 dotLottie 内 JSON 提取填充色 → 渐变 WebP
 *
 * 运行：node scripts/build-promo-and-lottie-posters.mjs
 * 依赖：sharp（Next 自带）、fflate（devDependency）
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { unzipSync } from 'fflate'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')

function collectFillRgb01(obj, out, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 40) return
  if (obj.ty === 'fl' && obj.c && obj.c.k && Array.isArray(obj.c.k)) {
    const k = obj.c.k
    if (
      k.length >= 3 &&
      typeof k[0] === 'number' &&
      typeof k[1] === 'number' &&
      typeof k[2] === 'number'
    ) {
      const a = k.length >= 4 && typeof k[3] === 'number' ? k[3] : 1
      if (a > 0.15) out.push([k[0], k[1], k[2]])
    }
  }
  if (Array.isArray(obj)) {
    for (const x of obj) collectFillRgb01(x, out, depth + 1)
    return
  }
  for (const v of Object.values(obj)) collectFillRgb01(v, out, depth + 1)
}

function rgb01ToSharpColor([r, g, b]) {
  return {
    r: Math.round(Math.min(1, Math.max(0, r)) * 255),
    g: Math.round(Math.min(1, Math.max(0, g)) * 255),
    b: Math.round(Math.min(1, Math.max(0, b)) * 255),
  }
}

function averageColors(colors01) {
  if (colors01.length === 0) return [0.05, 0.08, 0.12]
  let r = 0,
    g = 0,
    b = 0
  const n = Math.min(colors01.length, 48)
  for (let i = 0; i < n; i++) {
    r += colors01[i][0]
    g += colors01[i][1]
    b += colors01[i][2]
  }
  return [r / n, g / n, b / n]
}

async function buildPromoPhones() {
  const outDir = path.join(publicDir, 'images', 'promo-phones')
  fs.mkdirSync(outDir, { recursive: true })
  const pairs = [
    { src: '苹果.png', base: 'apple' },
    { src: '三星.png', base: 'samsung' },
  ]
  for (const { src, base } of pairs) {
    const input = path.join(publicDir, src)
    if (!fs.existsSync(input)) {
      console.warn('[promo] skip missing', input)
      continue
    }
    const meta = await sharp(input).metadata()
    const fullW = meta.width || 720
    const narrow = Math.min(320, fullW)
    const widths =
      narrow >= fullW
        ? [fullW]
        : Array.from(new Set([narrow, fullW])).sort((a, b) => a - b)
    for (const w of widths) {
      await sharp(input)
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 82, effort: 5 })
        .toFile(path.join(outDir, `${base}-${w}.webp`))
      await sharp(input)
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .avif({ quality: 52, effort: 4 })
        .toFile(path.join(outDir, `${base}-${w}.avif`))
      console.log('[promo]', `${base}-${w}.{webp,avif}`)
    }
  }
}

function dotLottieJsonFromFile(dotPath) {
  const buf = fs.readFileSync(dotPath)
  const entries = unzipSync(new Uint8Array(buf))
  for (const [name, data] of Object.entries(entries)) {
    if (name.startsWith('animations/') && name.endsWith('.json')) {
      return JSON.parse(new TextDecoder().decode(data))
    }
  }
  return null
}

async function buildLottiePosters(relFiles) {
  const outDir = path.join(publicDir, 'lottie-posters')
  fs.mkdirSync(outDir, { recursive: true })

  for (const rel of relFiles) {
    const dotPath = path.join(publicDir, rel)
    if (!fs.existsSync(dotPath)) {
      console.warn('[lottie-posters] skip missing', dotPath)
      continue
    }
    let json
    try {
      json = dotLottieJsonFromFile(dotPath)
    } catch (e) {
      console.warn('[lottie-posters] parse fail', rel, e.message)
      continue
    }
    if (!json) {
      console.warn('[lottie-posters] no animation json', rel)
      continue
    }
    const fills = []
    collectFillRgb01(json, fills)
    const avg = averageColors(fills)
    const c1 = rgb01ToSharpColor(avg)
    const c2 = {
      r: Math.max(0, Math.floor(c1.r * 0.35)),
      g: Math.max(0, Math.floor(c1.g * 0.35)),
      b: Math.max(0, Math.floor(c1.b * 0.45)),
    }
    const baseName = path.basename(rel, '.lottie')
    const outBase = path.join(outDir, baseName)
    const w = 800
    const h = 520
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
<defs>
<linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" style="stop-color:rgb(${c1.r},${c1.g},${c1.b})"/>
<stop offset="100%" style="stop-color:rgb(${c2.r},${c2.g},${c2.b})"/>
</linearGradient>
</defs>
<rect width="100%" height="100%" fill="url(#g)"/>
</svg>`
    await sharp(Buffer.from(svg))
      .webp({ quality: 78, effort: 5 })
      .toFile(`${outBase}.webp`)
    console.log('[lottie-poster]', `${baseName}.webp`)
  }
}

const DOTLOTTIE_LIST = [
  'network.lottie',
  '稳定币0.lottie',
  'shouyes.lottie',
  'QIANBAO.lottie',
  'Book Idea.lottie',
  '推荐.lottie',
  '查看.lottie',
]

async function main() {
  await buildPromoPhones()
  await buildLottiePosters(DOTLOTTIE_LIST)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
