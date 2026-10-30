// SVG icons for the popup windows (windows.js) and the HUD (hud.js): chunky dark
// outlines and flat bright fills, drawn after the owner's reference screenshots.

const INK = '#16131f'
const OUT = `stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"`
let uid = 0
const id = (p) => `${p}${++uid}`
const lin = (gid, stops, x2 = 0, y2 = 1) => `<linearGradient id="${gid}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map((c, i) => `<stop offset="${stops.length > 1 ? i / (stops.length - 1) : 0}" stop-color="${c}"/>`).join('')}</linearGradient>`
const RAINBOW = ['#ff4a5a', '#ffb83a', '#ffe14a', '#5ae86a', '#3aa8ff', '#b86aff']

// The Rebirth icon (public/ui/rebirth.png: the pink / blue arrows).
export const rebirthIcon = () => `<svg viewBox="0 0 64 64"><image href="${import.meta.env.BASE_URL}ui/rebirth.png" width="64" height="64"/></svg>`

// A burning fuse from (x, y), curling up to a spark.
const fuse = (x, y, dx = 6) => `<path d="M${x} ${y}c0-5 ${dx} -6 ${dx} -11" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M${x} ${y}c0-5 ${dx} -6 ${dx} -11" fill="none" stroke="#c8a070" stroke-width="2.4" stroke-linecap="round"/><circle cx="${x + dx}" cy="${y - 12}" r="3.2" fill="#ffd23a" stroke="#ff7a1a" stroke-width="1.6"/>`
// One upright stick of dynamite (x, y = top-left corner).
const stick = (x, y, w, h, body, dark, label = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.28}" fill="${body}" ${OUT}/>
  <rect x="${x + w * 0.62}" y="${y + 3}" width="${w * 0.22}" height="${h - 6}" rx="2" fill="${dark}" opacity=".55"/>
  <rect x="${x + w * 0.16}" y="${y + 4}" width="${w * 0.18}" height="${h - 10}" rx="2" fill="#fff" opacity=".45"/>${label}`

// TNT (config TNTS) by `look`, coloured by `colors` for the bundles.
export function tntIcon(t) {
  const g = id('tn')
  switch (t.look) {
    case 'stick':
      return `<svg viewBox="0 0 64 64"><g transform="rotate(-14 32 36)">${stick(22, 18, 20, 42, '#ee2a3a', '#a8101e')}<ellipse cx="32" cy="19" rx="9" ry="3" fill="#ff7a7a" stroke="${INK}" stroke-width="2.4"/>${fuse(32, 17, 5)}</g></svg>`
    case 'bomb':
      return `<svg viewBox="0 0 64 64"><defs><radialGradient id="${g}" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#5a7aff"/><stop offset=".6" stop-color="#2236a8"/><stop offset="1" stop-color="#131a5a"/></radialGradient></defs>
        <circle cx="30" cy="38" r="21" fill="url(#${g})" ${OUT}/><rect x="25" y="13" width="12" height="8" rx="2" fill="#6a7088" ${OUT}/>
        <ellipse cx="22" cy="30" rx="6" ry="4" fill="#fff" opacity=".55" transform="rotate(-30 22 30)"/>${fuse(32, 13, 8)}</svg>`
    case 'banded':
      return `<svg viewBox="0 0 64 64"><g transform="rotate(-8 32 36)">${stick(20, 16, 24, 44, '#e8243a', '#a8101e')}
        <rect x="20" y="22" width="24" height="9" fill="#24242c" ${OUT}/><rect x="20" y="44" width="24" height="9" fill="#24242c" ${OUT}/>${fuse(32, 15, 5)}</g></svg>`
    case 'keg':
      return `<svg viewBox="0 0 64 64"><path d="M14 14q18-6 36 0q5 22 0 44q-18 6-36 0q-5-22 0-44z" fill="#8a5428" ${OUT}/>
        <path d="M24 12q-3 24 0 48M40 12q3 24 0 48" stroke="#5a3418" stroke-width="2.4" fill="none"/>
        <path d="M11 24q21 5 42 0M11 48q21 5 42 0" stroke="${INK}" stroke-width="6" fill="none"/><path d="M11 24q21 5 42 0M11 48q21 5 42 0" stroke="#4a4e5a" stroke-width="3" fill="none"/>
        <path d="M32 27l9 4v8c0 6-4 9-9 11-5-2-9-5-9-11v-8z" fill="#ffc21a" ${OUT}/><path d="M32 31v14" stroke="#e8243a" stroke-width="4"/></svg>`
    case 'golden':
      return `<svg viewBox="0 0 64 64"><defs>${lin(g, ['#fff27a', '#ffc21a', '#d88a10'])}</defs>
        ${[10, 22, 34, 46].map((x, i) => `<rect x="${x}" y="${i % 3 ? 18 : 22}" width="12" height="40" rx="4" fill="url(#${g})" ${OUT}/>`).join('')}
        ${stick(22, 12, 20, 44, `url(#${g})`, '#c87a10')}<path d="M32 26l7 7-7 10-7-10z" fill="#e8243a" ${OUT}/><path d="M29 31l3-3 3 3" fill="none" stroke="#ff9aa8" stroke-width="2"/>${fuse(32, 11, 6)}</svg>`
    case 'gift':
      return `<svg viewBox="0 0 64 64"><defs>${lin(g, ['#5aa8ff', '#1a4ac8'])}</defs>
        ${[8, 22, 36].map((x) => stick(x, 22, 18, 36, `url(#${g})`, '#0a2a8a')).join('')}
        <rect x="6" y="34" width="52" height="10" rx="3" fill="#ffd23a" ${OUT}/><text x="32" y="43" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="10" fill="#1a3ab8">TNT</text>
        <rect x="28" y="20" width="8" height="40" fill="#ffd23a" ${OUT}/><path d="M32 20c-10-14-24-6-14 2 4 2 10 0 14-2zM32 20c10-14 24-6 14 2-4 2-10 0-14-2z" fill="#ffc21a" ${OUT}/></svg>`
    case 'royal':
    case 'bundle':
    default: {
      const royal = t.look === 'royal'
      const dragon = t.look === 'dragon'
      const [c0, c1] = royal ? ['#ffffff', '#c8ccd8'] : t.colors ?? ['#e8323a', '#a8141e']
      const band = royal || dragon ? '#ffc21a' : '#f4ead8'
      return `<svg viewBox="0 0 64 64"><defs>${lin(g, [c0, c1])}</defs>
        ${[6, 20, 34].map((x) => `<rect x="${x + 4}" y="12" width="20" height="44" rx="4" fill="url(#${g})" ${OUT}/>`).join('')}
        <rect x="6" y="20" width="52" height="36" rx="5" fill="url(#${g})" ${OUT}/>
        <path d="M6 30h52M6 46h52" stroke="${INK}" stroke-width="2" opacity=".35"/>
        <rect x="9" y="31" width="22" height="13" rx="2" fill="${band}" ${OUT}/><rect x="33" y="31" width="22" height="13" rx="2" fill="${band}" ${OUT}/>
        <text x="20" y="41.5" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="9.5" fill="${INK}">TNT</text><text x="44" y="41.5" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="9.5" fill="${INK}">TNT</text>
        ${royal ? `<path d="M6 22h52" stroke="#ffc21a" stroke-width="4"/><path d="M24 12l4-6 4 5 4-5 4 6z" fill="#ffc21a" ${OUT}/>` : ''}${dragon ? `<path d="M10 22l4-14 8 12zM54 22l-4-14-8 12z" fill="#ffc21a" ${OUT}/>` : ''}${fuse(36, 12, 7)}</svg>`
    }
  }
}

// A paw print; `fill` is a colour or 'gold' / 'diamond' / 'rainbow'.
export function pawIcon(fill) {
  const g = id('pw')
  const grads = {
    gold: lin(g, ['#fff27a', '#ffc21a', '#e08a10']),
    diamond: lin(g, ['#ffffff', '#9ae8ff', '#3aa8ff'], 1, 1),
    rainbow: lin(g, RAINBOW, 1, 1),
  }
  const f = grads[fill] ? `url(#${g})` : fill
  const toe = (cx, cy, rx, ry, r) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${cx} ${cy})" fill="${f}" ${OUT}/>`
  return `<svg viewBox="0 0 64 64"><defs>${grads[fill] ?? ''}</defs>
    ${toe(13, 26, 7, 9, -25)}${toe(25, 13, 7.5, 9.5, -8)}${toe(40, 13, 7.5, 9.5, 8)}${toe(51, 26, 7, 9, 25)}
    <path d="M32 30c-10 0-20 11-20 20 0 7 6 9 11 8 4-1 6-3 9-3s5 2 9 3c5 1 11-1 11-8 0-9-10-20-20-20z" fill="${f}" ${OUT}/>
    <ellipse cx="24" cy="40" rx="4" ry="2.5" fill="#fff" opacity=".6" transform="rotate(-35 24 40)"/></svg>`
}

// Eggs: a zigzag band (common / uncommon), a starry band (rare) or rainbow stripes.
export function eggIcon(egg) {
  const { color, band, look } = egg
  const g = id('eg')
  const shell = 'M32 4C16 4 6 30 6 48a26 26 0 0 0 52 0C58 30 48 4 32 4z'
  const deco = look === 'rainbow'
    ? ['#ff3b3b', '#ff9a1f', '#ffe11f', '#3bdc4a', '#2fa8ff', '#9a4dff'].map((c, i) => `<rect x="0" y="${24 + i * 6}" width="64" height="6" fill="${c}"/>`).join('')
    : look === 'stars'
      ? `<rect x="0" y="44" width="64" height="11" fill="${band}" stroke="${INK}" stroke-width="2"/>${[[20, 28, 4.5], [40, 22, 3.5], [44, 68, 4], [22, 66, 3]].map(([x, y, r]) => `<path d="M${x} ${y - r}l${r * 0.35} ${r * 0.65} ${r * 0.65} ${r * 0.35}-${r * 0.65} ${r * 0.35}-${r * 0.35} ${r * 0.65}-${r * 0.35}-${r * 0.65}-${r * 0.65}-${r * 0.35} ${r * 0.65}-${r * 0.35}z" fill="#fff36a" stroke="${INK}" stroke-width="1.4"/>`).join('')}`
      : `<path d="M0 46l8-8 8 8 8-8 8 8 8-8 8 8 8-8 8 8v10l-8-8-8 8-8-8-8 8-8-8-8 8-8-8-8 8z" fill="${band}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
  return `<svg viewBox="0 0 64 80"><defs><clipPath id="${g}"><path d="${shell}"/></clipPath></defs>
    <path d="${shell}" fill="${color}"/><g clip-path="url(#${g})">${deco}<path d="M44 10c10 14 12 34 8 56" stroke="#000" stroke-width="12" opacity=".08" fill="none"/></g>
    <path d="${shell}" fill="none" ${OUT}/>
    <path d="M17 38c0-10 4-20 9-26" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/></svg>`
}

const emblems = {
  bolt: `<path d="M35 26l-11 15h8l-3 12 12-16h-8l3-11z" fill="#ffd23a" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`,
  trophy: `<path d="M26 29h12v6a6 6 0 0 1-12 0z" fill="#ffd23a" stroke="${INK}" stroke-width="2"/><path d="M26 31h-3a3 3 0 0 0 4 5M38 31h3a3 3 0 0 1-4 5" fill="none" stroke="${INK}" stroke-width="2"/><path d="M30 41h4v4h-4zM27 45h10v4H27z" fill="#ffd23a" stroke="${INK}" stroke-width="2"/>`,
  clover: `${[[28, 34], [36, 34], [28, 42], [36, 42]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#5aee4a" stroke="${INK}" stroke-width="1.8"/>`).join('')}<path d="M32 44l3 7" stroke="#1a6a24" stroke-width="2.4" stroke-linecap="round"/>`,
}
// A round potion flask in the boost's colour with its emblem (config BOOSTS).
export function potionIcon(b) {
  const g = id('po')
  return `<svg viewBox="0 0 64 64"><defs><radialGradient id="${g}" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".35" stop-color="${b.color}"/><stop offset="1" stop-color="${b.color}" stop-opacity=".85"/></radialGradient></defs>
    <rect x="25" y="4" width="14" height="9" rx="3" fill="#c98a4a" ${OUT}/><path d="M26 12h12v10h-12z" fill="#dfe8f2" ${OUT}/>
    <circle cx="32" cy="40" r="21" fill="url(#${g})" ${OUT}/><path d="M14 42a18 18 0 0 0 36 0" fill="none" stroke="#000" stroke-width="4" opacity=".12"/>
    ${emblems[b.emblem] ?? ''}<path d="M19 33a14 14 0 0 1 7-9" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".85"/></svg>`
}

// A firecracker shooting up-right with a smoke / flame trail in `colors`.
export function trailIcon(colors) {
  const g = id('tr')
  const puffs = [[44, 44, 13], [30, 50, 11], [18, 54, 9], [9, 57, 6]]
  return `<svg viewBox="0 0 120 72"><defs>${lin(g, [...colors].reverse(), 1, 0)}</defs>
    <path d="M70 32C56 34 44 40 30 46 18 51 6 58 4 60c8-10 16-18 28-24-8 2-14 6-20 10 10-12 26-20 44-22z" fill="url(#${g})" ${OUT}/>
    ${puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})" ${OUT}/>`).join('')}
    ${puffs.map(([x, y, r]) => `<circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.35}" fill="#fff" opacity=".45"/>`).join('')}
    <g transform="rotate(-32 84 30)"><rect x="66" y="20" width="40" height="20" rx="6" fill="#fff" ${OUT}/>
      <path d="M76 20v20M86 20v20M96 20v20" stroke="#e8243a" stroke-width="6"/><rect x="66" y="20" width="40" height="20" rx="6" fill="none" ${OUT}/>
      <rect x="62" y="22" width="8" height="16" rx="3" fill="#ffd23a" ${OUT}/><path d="M106 30c6 0 8-6 12-6" fill="none" stroke="${INK}" stroke-width="3"/></g>
    <path d="M110 6l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffe14a" stroke="#ff7a1a" stroke-width="1.4"/></svg>`
}

// The premium coin price badge (Skip Rebirth).
export const coinIcon = `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="#ffc21a" stroke="${INK}" stroke-width="2.6"/><circle cx="16" cy="16" r="7.5" fill="none" stroke="#c88a10" stroke-width="3.5"/><circle cx="16" cy="16" r="7.5" fill="none" stroke="#fff27a" stroke-width="1.4"/></svg>`

export const ICON = {
  // window title icons
  tnt: tntIcon({ look: 'bundle', colors: ['#e8323a', '#a8141e'] }),
  paw: pawIcon('#ffc21a'),
  pawBlue: pawIcon('#3aa8ff'),
  egg: eggIcon({ color: '#fff6e8', band: '#ff9a2a', look: 'zigzag' }),
  potion: potionIcon({ color: '#3aa8ff', emblem: 'bolt' }),
  gift: `<svg viewBox="0 0 64 64"><rect x="8" y="28" width="48" height="32" rx="4" fill="#e8243a" ${OUT}/><path d="M8 34h48" stroke="#a8101e" stroke-width="3"/><rect x="4" y="18" width="56" height="13" rx="3" fill="#ff4a5a" ${OUT}/><rect x="27" y="18" width="10" height="42" fill="#ffc21a" ${OUT}/><path d="M32 18C24 2 8 6 14 15c3 4 12 3 18 3zM32 18c8-16 24-12 18-3-3 4-12 3-18 3z" fill="#ffc21a" ${OUT}/><path d="M12 24h14" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/></svg>`,
  calendar: `<svg viewBox="0 0 64 64"><rect x="6" y="10" width="52" height="50" rx="9" fill="#fff" ${OUT}/><path d="M6 19a9 9 0 0 1 9-9h34a9 9 0 0 1 9 9v6H6z" fill="#e8324a" ${OUT}/><rect x="17" y="3" width="7" height="14" rx="3.5" fill="#fff" ${OUT}/><rect x="40" y="3" width="7" height="14" rx="3.5" fill="#fff" ${OUT}/>${[[14, 30], [34, 30], [14, 44], [34, 44]].map(([x, y]) => `<rect x="${x}" y="${y}" width="16" height="10" rx="3" fill="#5aa8f0" stroke="#2a6ac8" stroke-width="1.6"/>`).join('')}</svg>`,
  cloud: `<svg viewBox="0 0 72 64"><path d="M14 54c-10 0-12-14-3-17-3-10 8-17 15-11 3-12 21-13 25-1 9-3 17 6 13 14 8 3 7 15-2 15z" fill="#fff" ${OUT}/><path d="M18 50c10 3 30 3 44-1" stroke="#9ad0ff" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M20 30c2-4 6-5 9-3" stroke="#cfe8ff" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  // reward / label icons
  bolt: `<svg viewBox="0 0 24 32"><path d="M15 1 L3 18 h8 l-3 13 L21 12 h-8 l3-11z" fill="#ffc21a" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M13 5l-6 10" stroke="#fff6a0" stroke-width="2" stroke-linecap="round"/></svg>`,
  trophy: `<svg viewBox="0 0 48 48"><path d="M12 10H6v6a8 8 0 0 0 8 8M36 10h6v6a8 8 0 0 1-8 8" fill="none" stroke="${INK}" stroke-width="6"/><path d="M12 10H6v6a8 8 0 0 0 8 8M36 10h6v6a8 8 0 0 1-8 8" fill="none" stroke="#ffc21a" stroke-width="3"/><path d="M11 6h26v10a13 13 0 0 1-26 0z" fill="#ffc21a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M15 9v6a9 9 0 0 0 4 8" fill="none" stroke="#fff3b0" stroke-width="2.5" stroke-linecap="round"/><rect x="21" y="28" width="6" height="8" fill="#e8a410" stroke="${INK}" stroke-width="2"/><rect x="13" y="36" width="22" height="7" rx="2" fill="#ffc21a" stroke="${INK}" stroke-width="2.5"/></svg>`,
  clover: `<svg viewBox="0 0 40 40">${[[14, 14], [26, 14], [14, 26], [26, 26]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="#4ad84a" stroke="${INK}" stroke-width="2.4"/>`).join('')}<circle cx="20" cy="20" r="3" fill="#2a9a2a"/><path d="M22 28l4 9" stroke="#1a6a24" stroke-width="3" stroke-linecap="round"/></svg>`,
  backpack: `<svg viewBox="0 0 64 64"><path d="M22 16c0-9 20-9 20 0" fill="none" stroke="${INK}" stroke-width="7"/><path d="M22 16c0-9 20-9 20 0" fill="none" stroke="#7a3a18" stroke-width="3.5"/><rect x="10" y="14" width="44" height="46" rx="14" fill="#b8642a" ${OUT}/><rect x="18" y="36" width="28" height="16" rx="5" fill="#8a4418" ${OUT}/><path d="M16 22q16-6 32 0" fill="none" stroke="#fff" stroke-width="3" opacity=".4" stroke-linecap="round"/></svg>`,
  arrow: `<svg viewBox="0 0 64 64"><path d="M6 24h26V8l26 24-26 24V40H6z" fill="#fff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></svg>`,
  // buttons
  check: `<svg viewBox="0 0 64 64"><path d="M10 34l15 15L54 16" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  plus: `<svg viewBox="0 0 64 64"><path d="M32 10v44M10 32h44" stroke="${INK}" stroke-width="17" stroke-linecap="round"/><path d="M32 10v44M10 32h44" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg>`,
  lock: `<svg viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="12" fill="#ffc21a" ${OUT}/><path d="M22 30v-6a10 10 0 0 1 20 0v6" fill="none" stroke="${INK}" stroke-width="5"/><rect x="16" y="29" width="32" height="24" rx="5" fill="#2a2b31"/></svg>`,
  x: `<svg viewBox="0 0 32 32"><path d="M8 8l16 16M24 8L8 24" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M8 8l16 16M24 8L8 24" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/></svg>`,
}
