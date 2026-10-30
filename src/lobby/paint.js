// Canvas painters for the lego lobby: studded plates, TNT wraps and crates,
// lane mats, eggs, screens and the outlined sign text. Like textures.js,
// everything is drawn once at load (the glitch screen repaints a few times a second).
import { heightToNormal, mulberry32 } from '../textures.js'

function canvas(w, h = w) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}
const FONT = 'Fredoka, "Arial Black", sans-serif'

// Lego plate: a grid of round studs on a flat base. `alt` paints a 2x2 checker
// of two tones under the studs (the pale plaza floor). One tile = `studs` studs.
export function paintStuds({ base = '#c8c8c8', alt = null, studs = 8, size = 256, seed = 11, studShade = 1 } = {}) {
  const rand = mulberry32(seed)
  const c = canvas(size)
  const ctx = c.getContext('2d')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  if (alt) {
    const h = size / 2
    ctx.fillStyle = alt
    ctx.fillRect(0, 0, h, h)
    ctx.fillRect(h, h, h, h)
  }
  // Fine grain so large areas are not flat.
  for (let i = 0; i < size * 6; i++) {
    ctx.fillStyle = rand() < 0.5 ? `rgba(0,0,0,${rand() * 0.035})` : `rgba(255,255,255,${rand() * 0.05})`
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2)
  }
  const cell = size / studs
  const r = cell * 0.31
  for (let j = 0; j < studs; j++) {
    for (let i = 0; i < studs; i++) {
      const cx = (i + 0.5) * cell
      const cy = (j + 0.5) * cell
      ctx.fillStyle = `rgba(0,0,0,${0.16 * studShade})` // cast shadow, down-right
      ctx.beginPath()
      ctx.arc(cx + r * 0.2, cy + r * 0.24, r * 1.04, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = alt && (i < studs / 2) === (j < studs / 2) ? alt : base
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.1, cx, cy, r)
      g.addColorStop(0, `rgba(255,255,255,${0.32 * studShade})`)
      g.addColorStop(0.7, `rgba(255,255,255,${0.08 * studShade})`)
      g.addColorStop(1, `rgba(0,0,0,${0.1 * studShade})`)
      ctx.fillStyle = g
      ctx.fill()
      ctx.strokeStyle = `rgba(255,255,255,${0.35 * studShade})` // rim highlight, top-left
      ctx.lineWidth = Math.max(1, cell * 0.04)
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.86, Math.PI * 0.95, Math.PI * 1.6)
      ctx.stroke()
    }
  }
  const heights = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    const dy = (y % cell) - cell / 2 + 0.5
    for (let x = 0; x < size; x++) {
      const dx = (x % cell) - cell / 2 + 0.5
      const d = Math.hypot(dx, dy)
      heights[y * size + x] = d < r - 1.5 ? 1 : d < r + 0.5 ? (r + 0.5 - d) / 2 : 0
    }
  }
  return { color: c, normal: heightToNormal(heights, size, 1.6) }
}

// Dynamite stick wrap (u around the stick, v along it): red paper with a
// cream label band carrying "TNT" written along the stick.
export function paintTntWrap(base = '#d9221a', size = 128) {
  const c = canvas(size)
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, size, 0)
  g.addColorStop(0, base)
  g.addColorStop(0.5, '#ff5a40')
  g.addColorStop(1, base)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(0, size * 0.06, size, size * 0.04)
  ctx.fillRect(0, size * 0.9, size, size * 0.04)
  ctx.fillStyle = '#f6e7c4'
  ctx.fillRect(size * 0.3, size * 0.22, size * 0.4, size * 0.56)
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.font = `700 ${size * 0.22}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#c21812'
  ctx.fillText('TNT', 0, 2)
  ctx.restore()
  return c
}

// TNT crate face: coloured panel, darker frame, chunky "TNT" letters.
export function paintTntBox(base = '#2f8cff', text = '#ffffff', size = 256) {
  const c = canvas(size)
  const ctx = c.getContext('2d')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  const g = ctx.createLinearGradient(0, 0, 0, size)
  g.addColorStop(0, 'rgba(255,255,255,0.25)')
  g.addColorStop(1, 'rgba(0,0,0,0.25)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = size * 0.06
  ctx.strokeRect(size * 0.03, size * 0.03, size * 0.94, size * 0.94)
  ctx.font = `700 ${size * 0.36}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = size * 0.05
  ctx.strokeStyle = 'rgba(10,20,50,0.85)'
  ctx.strokeText('TNT', size / 2, size * 0.53)
  ctx.fillStyle = text
  ctx.fillText('TNT', size / 2, size * 0.53)
  return c
}

// Yellow/black hazard stripes (repeat along U).
export function paintHazard(w = 128, h = 32) {
  const c = canvas(w, h)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#ffd21a'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#1b1b1b'
  for (let x = -h; x < w + h; x += h * 2) {
    ctx.beginPath()
    ctx.moveTo(x, h)
    ctx.lineTo(x + h, h)
    ctx.lineTo(x + h * 2, 0)
    ctx.lineTo(x + h, 0)
    ctx.closePath()
    ctx.fill()
  }
  return c
}

// Lane start mat: corner brackets and a chevron outline in a lighter tone.
export function paintLaneMat(base = '#2a6cf0', line = '#9fd2ff', size = 256) {
  const c = canvas(size)
  const ctx = c.getContext('2d')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = line
  ctx.lineWidth = size * 0.035
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const m = size * 0.1
  const k = size * 0.18
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [size - m, m, -1, 1], [m, size - m, 1, -1], [size - m, size - m, -1, -1]]) {
    ctx.beginPath()
    ctx.moveTo(x, y + k * sy)
    ctx.lineTo(x, y)
    ctx.lineTo(x + k * sx, y)
    ctx.stroke()
  }
  ctx.beginPath() // chevron pointing along +U
  ctx.moveTo(size * 0.42, size * 0.36)
  ctx.lineTo(size * 0.56, size * 0.5)
  ctx.lineTo(size * 0.42, size * 0.64)
  ctx.stroke()
  return c
}

// The Jolly Roger: a white skull over crossed bones on black.
export function paintJollyRoger(w = 192, h = 128) {
  const c = canvas(w, h)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#14141a'
  ctx.fillRect(0, 0, w, h)
  const x = w / 2
  ctx.strokeStyle = ctx.fillStyle = '#f4efe2'
  ctx.lineWidth = 11
  ctx.lineCap = 'round'
  for (const [a, b] of [[-1, 1], [1, -1]]) {
    ctx.beginPath()
    ctx.moveTo(x + a * 54, h * 0.56)
    ctx.lineTo(x + b * 54, h * 0.92)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(x, h * 0.4, 32, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(x - 18, h * 0.5, 36, 26)
  ctx.fillStyle = '#14141a'
  for (const dx of [-13, 13]) {
    ctx.beginPath()
    ctx.arc(x + dx, h * 0.4, 9, 0, Math.PI * 2)
    ctx.fill()
  }
  for (const dx of [-9, 0, 9]) ctx.fillRect(x + dx - 1.5, h * 0.62, 3, 13)
  return c
}

// Bullseye: red and white rings.
export function paintBullseye(size = 128) {
  const c = canvas(size)
  const ctx = c.getContext('2d')
  const rings = ['#e8231c', '#ffffff', '#e8231c', '#ffffff', '#e8231c']
  rings.forEach((col, i) => {
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, (size / 2) * (1 - i / rings.length), 0, Math.PI * 2)
    ctx.fill()
  })
  return c
}

// Hay bale side: golden straw strokes.
export function paintHay(size = 128) {
  const rand = mulberry32(77)
  const c = canvas(size)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#c9a34a'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 420; i++) {
    const x = rand() * size
    const y = rand() * size
    const len = 6 + rand() * 18
    const a = (rand() - 0.5) * 0.7
    ctx.strokeStyle = rand() < 0.5 ? `rgba(120,85,25,${0.3 + rand() * 0.4})` : `rgba(255,230,140,${0.3 + rand() * 0.5})`
    ctx.lineWidth = 1 + rand()
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
    ctx.stroke()
  }
  return c
}

// Leaderboard screen: title strip and rows of rank / name / value. `entries` is the server's
// [{ name, value }] (net.js `leaderboard`); without it the rows read "--" until it arrives.
// `format(value)` prints a value; `canvasOut` repaints an existing canvas.
const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']
export function compact(n) {
  if (!(n >= 1000)) return `${Math.floor(n || 0)}`
  const tier = Math.min(SUFFIX.length - 1, Math.floor(Math.log10(n) / 3))
  const v = n / 1000 ** tier
  return `${v >= 100 ? Math.floor(v) : v >= 10 ? v.toFixed(1).replace(/\.0$/, '') : v.toFixed(2).replace(/0$/, '').replace(/\.0$/, '')}${SUFFIX[tier]}`
}
export const hoursMinutes = (s) => (s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m` : `${Math.floor(s / 60)}m`)
export function paintLeaderboard(title, rows = 10, entries = null, format = compact, w = 256, h = 320, canvasOut = null) {
  const c = canvasOut ?? canvas(w, h)
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#0f6a30'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#0a4a22'
  ctx.fillRect(0, 0, w, h * 0.12)
  ctx.font = `700 ${h * 0.06}px ${FONT}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(title, w / 2, h * 0.06)
  const rowH = (h * 0.86) / rows
  ctx.font = `600 ${rowH * 0.5}px ${FONT}`
  for (let i = 0; i < rows; i++) {
    const y = h * 0.13 + rowH * (i + 0.5)
    const e = entries?.[i]
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)'
    ctx.fillRect(4, y - rowH / 2, w - 8, rowH)
    ctx.textAlign = 'left'
    ctx.fillStyle = ['#ffd84a', '#d8e4ee', '#e39b55'][i] ?? '#c8f5d0'
    ctx.fillText(`${i + 1}`, 10, y)
    ctx.fillStyle = '#e8ffe9'
    ctx.fillText(e ? String(e.name).slice(0, 14) : '--', 34, y)
    if (!e) continue
    ctx.textAlign = 'right'
    ctx.fillStyle = '#9dffa8'
    ctx.fillText(format(e.value), w - 10, y)
  }
  return c
}

// Glitch booth screen. draw(t) repaints it with a jittering RGB-split title,
// a pixel creature and scanlines (call it a few times a second).
export function paintGlitchScreen(size = 256) {
  const c = canvas(size)
  const ctx = c.getContext('2d')
  const rand = mulberry32(99)
  const body = ['0000111111110000', '0001111111111000', '0011111111111100', '0011221111221100', '0011221111221100', '0011111111111100', '0011113333111100', '0001111111111000', '0000110000110000']
  const draw = (t) => {
    ctx.fillStyle = '#120a2e'
    ctx.fillRect(0, 0, size, size)
    const px = size / 16
    const wob = Math.sin(t * 3) * px * 0.3
    body.forEach((row, j) => {
      for (let i = 0; i < 16; i++) {
        const v = row[i]
        if (v === '0') continue
        ctx.fillStyle = v === '1' ? '#25f0d0' : v === '2' ? '#0b0b1e' : '#ff3fb4'
        ctx.fillRect(i * px, size * 0.32 + j * px + wob, px, px)
      }
    })
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = ['#ff2bd6', '#2bffea', '#7a2bff'][i % 3]
      ctx.globalAlpha = 0.25 + rand() * 0.4
      ctx.fillRect(rand() * size, rand() * size, rand() * size * 0.3, 2 + rand() * 6)
    }
    ctx.globalAlpha = 1
    ctx.font = `700 ${size * 0.17}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const jx = (rand() - 0.5) * 6
    ctx.fillStyle = '#ff2bd6'
    ctx.fillText('GLITCH', size / 2 - 3 + jx, size * 0.15)
    ctx.fillStyle = '#2bffea'
    ctx.fillText('GLITCH', size / 2 + 3 + jx, size * 0.15 + 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillText('GLITCH', size / 2 + jx * 0.3, size * 0.15)
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    for (let y = 0; y < size; y += 4) ctx.fillRect(0, y, size, 2)
  }
  draw(0)
  return { canvas: c, draw }
}

// Egg shells, blocky "voxel" look (u around, v from top to bottom).
export function paintEgg(kind, size = 256) {
  const rand = mulberry32(kind.length * 31 + 5)
  const c = canvas(size)
  const ctx = c.getContext('2d')
  const s = size / 16
  const blocks = (cols, rowsFrom, rowsTo, n) => {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = cols[Math.floor(rand() * cols.length)]
      ctx.fillRect(Math.floor(rand() * 16) * s, Math.floor(rowsFrom + rand() * (rowsTo - rowsFrom)) * s, s * (1 + Math.floor(rand() * 2)), s)
    }
  }
  const fill = (col) => {
    ctx.fillStyle = col
    ctx.fillRect(0, 0, size, size)
  }
  if (kind === 'common') {
    fill('#f4f1ea')
    blocks(['#ffffff', '#e2ded6', '#d6d2ca'], 0, 16, 90)
    ctx.fillStyle = '#ef8a1f'
    ctx.fillRect(0, size * 0.62, size, size * 0.38)
    blocks(['#ef8a1f', '#f6a33a', '#d9701a'], 8, 11, 70)
    blocks(['#f6a33a', '#d9701a', '#c75f12'], 10, 16, 60)
  } else if (kind === 'uncommon') {
    fill('#47c93a')
    blocks(['#7fe35a', '#2fa62a', '#9cf06a', '#3dbb30'], 0, 16, 170)
    ctx.fillStyle = '#e8f24a'
    for (let i = 0; i < 8; i++) ctx.fillRect((i * size) / 8, size * 0.45, s, s)
  } else if (kind === 'rare') {
    fill('#2f9cf0')
    blocks(['#6cc8ff', '#1f7fe0', '#9de0ff', '#2f9cf0'], 0, 16, 160)
    ctx.fillStyle = '#ffd23a'
    ctx.fillRect(0, size * 0.36, size, size * 0.07)
    ctx.fillRect(0, size * 0.62, size, size * 0.05)
  } else if (kind === 'rainbow') {
    fill('#fffaf0')
    blocks(['#ffffff', '#f2ece0'], 0, 16, 60)
    ;['#ff3b3b', '#ff9a1f', '#ffe11f', '#3bdc4a', '#2fa8ff', '#9a4dff'].forEach((col, i) => {
      ctx.fillStyle = col
      ctx.fillRect(0, size * (0.24 + i * 0.045), size, size * 0.035)
    })
    blocks(['#ffd23a', '#ffe680', '#f5c400'], 11, 16, 70)
  } else if (kind === 'glitch') {
    fill('#3a1478')
    blocks(['#ff2bd6', '#2bffea', '#7a2bff', '#120a2e', '#b04dff'], 0, 16, 230)
  }
  return c
}

// Woven basket (gold): over-under weave cells.
export function paintWoven(base = '#f2b51e', size = 128) {
  const c = canvas(size)
  const ctx = c.getContext('2d')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  const n = 8
  const s = size / n
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const horiz = (i + j) % 2 === 0
      const g = horiz ? ctx.createLinearGradient(0, j * s, 0, j * s + s) : ctx.createLinearGradient(i * s, 0, i * s + s, 0)
      g.addColorStop(0, 'rgba(120,60,0,0.45)')
      g.addColorStop(0.5, 'rgba(255,240,170,0.35)')
      g.addColorStop(1, 'rgba(120,60,0,0.45)')
      ctx.fillStyle = g
      ctx.fillRect(i * s + 1, j * s + 1, s - 2, s - 2)
    }
  }
  return c
}

// Small sign icons: the rebirth ball (pink/blue) and the robux hexagon.
function drawIcon(ctx, kind, x, y, r) {
  ctx.save()
  if (kind === 'ball') {
    ctx.beginPath()
    ctx.arc(x, y, r, Math.PI, 0)
    ctx.fillStyle = '#ff3d8a'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI)
    ctx.fillStyle = '#3aa8ff'
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x - r, y - r * 0.12, r * 2, r * 0.24)
    ctx.beginPath()
    ctx.arc(x, y, r * 0.32, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = r * 0.14
    ctx.strokeStyle = '#1a1a2e'
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
  } else {
    ctx.lineWidth = r * 0.28
    ctx.strokeStyle = '#ffffff'
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6
      const px = x + Math.cos(a) * r * 0.85
      const py = y + Math.sin(a) * r * 0.85
      if (i) ctx.lineTo(px, py)
      else ctx.moveTo(px, py)
    }
    ctx.closePath()
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x - r * 0.22, y - r * 0.22, r * 0.44, r * 0.44)
  }
  ctx.restore()
}

// A stack of outlined text lines, each with its own size, colour (or a
// left-to-right gradient), outline and an optional pill background. draw()
// repaints in place (after the web font loads).
// line: { text, px, color?, gradient?: [colors], outline?, outlineWidth?, weight?, italic?, pill? }
export function paintTextStack(lines, { pad = 18, gap = 0.06 } = {}) {
  const c = canvas(4)
  const draw = () => {
    const ctx = c.getContext('2d')
    const fontOf = (l) => `${l.italic ? 'italic ' : ''}${l.weight ?? 700} ${l.px}px ${FONT}`
    let width = 0
    let height = pad
    const metrics = lines.map((l) => {
      ctx.font = fontOf(l)
      const w = ctx.measureText(l.text).width + (l.pill ? l.px * 1.6 : 0) + (l.icon ? l.px * 1.25 : 0)
      width = Math.max(width, w)
      const h = l.px * (l.pill ? 1.45 : 1.12)
      const m = { y: height + h / 2, w, h }
      height += h + l.px * gap
      return m
    })
    c.width = Math.ceil(width + pad * 2)
    c.height = Math.ceil(height + pad)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    lines.forEach((l, i) => {
      const { y, w, h } = metrics[i]
      const cx = c.width / 2
      if (l.pill) {
        ctx.fillStyle = l.pill
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(cx - w / 2, y - h / 2, w, h, h / 2)
        ctx.fill()
        ctx.stroke()
      }
      ctx.font = fontOf(l)
      const ty = y + l.px * 0.04
      let tx = cx
      if (l.icon) {
        const tw = ctx.measureText(l.text).width
        const ir = l.px * 0.48
        const ix = cx - (tw + l.px * 1.25) / 2 + ir
        tx = ix + ir + l.px * 0.25 + tw / 2
        drawIcon(ctx, l.icon, ix, y, ir)
      }
      if (l.outline !== null) {
        ctx.lineWidth = l.outlineWidth ?? Math.max(4, l.px * 0.2)
        ctx.strokeStyle = l.outline ?? '#14142a'
        ctx.strokeText(l.text, tx, ty)
      }
      if (l.gradient) {
        const tw = ctx.measureText(l.text).width
        const g = ctx.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0)
        l.gradient.forEach((col, k) => g.addColorStop(k / (l.gradient.length - 1), col))
        ctx.fillStyle = g
      } else ctx.fillStyle = l.color ?? '#ffffff'
      ctx.fillText(l.text, tx, ty)
    })
  }
  draw()
  return { canvas: c, draw }
}
