import { PET_KINDS, PET_VARIANTS, PETS } from './config.js'
import { sfx } from './audio.js'
import { eggIcon } from './icons.js'

// Pets: cube-critter portraits for the windows (petSvg) and the hatch overlay (the egg
// rattles, a white flash, the pet card pops in). Adapted from Clap to Destroy's pets.js.

export const RARITY_NAME = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', mythical: 'Mythical' }

const INK = '#16131f'
const L = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`
let uid = 0

// Variant recolours: a gradient id the body / accent use instead of the kind's colours.
const VARIANT_FILL = {
  golden: [['#fff27a', '#ffc21a', '#e08a10'], ['#ffb21a', '#c87a10']],
  diamond: [['#ffffff', '#bff0ff', '#6ad0ff'], ['#9ae8ff', '#3aa8ff']],
  exclusive: [['#ff6a8a', '#ffd23a', '#5ae86a', '#3aa8ff', '#c86aff'], ['#ff5fd0', '#7a3ad8']],
}
const grad = (gid, stops) => `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">${stops.map((c, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>`

// What sits on / around the head, drawn behind the face cube (b = body, a = accent).
function behind(look, b, a) {
  switch (look) {
    case 'bunny':
      return `<rect x="25" y="0" width="15" height="40" rx="7" fill="${b}" ${L}/><rect x="29" y="5" width="7" height="27" rx="3.5" fill="${a}"/><rect x="60" y="0" width="15" height="40" rx="7" fill="${b}" ${L}/><rect x="64" y="5" width="7" height="27" rx="3.5" fill="${a}"/>`
    case 'goggles':
    case 'fox':
      return `<path d="M17 42L22 14 42 32z" fill="${look === 'fox' ? b : a}" ${L}/><path d="M24 22l3 9 6-2z" fill="#ffd0b0"/><path d="M83 42L78 14 58 32z" fill="${look === 'fox' ? b : a}" ${L}/><path d="M76 22l-3 9-6-2z" fill="#ffd0b0"/>`
    case 'raccoon':
      return `<path d="M18 40l4-18 14 12z" fill="${b}" ${L}/><path d="M82 40l-4-18-14 12z" fill="${b}" ${L}/><path d="M50 24c0-8 4-14 10-18" fill="none" stroke="#2a8a2a" stroke-width="3" stroke-linecap="round"/><circle cx="62" cy="10" r="7" fill="#e8243a" ${L}/><circle cx="60" cy="8" r="2" fill="#fff" opacity=".7"/>`
    case 'panda':
      return `<circle cx="24" cy="32" r="10" fill="${a}" ${L}/><circle cx="76" cy="32" r="10" fill="${a}" ${L}/>`
    case 'pig':
      return `<path d="M20 40l4-16 14 10z" fill="${a}" ${L}/><path d="M80 40l-4-16-14 10z" fill="${a}" ${L}/>`
    case 'frog':
      return `<circle cx="32" cy="32" r="12" fill="${b}" ${L}/><circle cx="68" cy="32" r="12" fill="${b}" ${L}/>`
    case 'rooster':
      return `<path d="M36 34c-4-12 4-18 8-14 0-10 10-12 12-4 4-8 14-4 10 6 6 0 6 10-2 12z" fill="${a}" ${L}/><path d="M14 66c-12-8-10-24 2-26l4 26z" fill="#ffb21a" ${L}/>`
    case 'horn':
      return `<path d="M44 36l6-32 6 32z" fill="#ffd23a" ${L}/><path d="M47 26h6M46 32h8" stroke="#e0a010" stroke-width="2.5"/><path d="M22 38c-6-10 0-18 8-16 4 6 2 12-2 16z" fill="${a}" ${L}/>`
    case 'dragon':
      return `<path d="M6 46C2 32 10 24 20 28l2 20z" fill="${a}" ${L}/><path d="M94 46c4-14-4-22-14-18l-2 20z" fill="${a}" ${L}/><path d="M30 36l4-18 8 16zM70 36l-4-18-8 16z" fill="#ffd23a" ${L}/>`
    case 'lion':
      return `<circle cx="50" cy="58" r="47" fill="${a}" ${L}/><circle cx="20" cy="34" r="8" fill="${b}" ${L}/><circle cx="80" cy="34" r="8" fill="${b}" ${L}/><path d="M38 10l5 12 7-9 7 9 5-12-3 18H41z" fill="#ffd23a" ${L}/>`
    case 'phoenix':
      return `<path d="M50 36C40 26 42 12 50 4c0 10 6 12 8 20 2-8 8-10 12-14-2 10-4 18-12 26z" fill="${a}" ${L}/><path d="M50 36c-6-8-4-16 0-22 2 8 4 12 2 22z" fill="#ff3a1a"/><path d="M8 58c-6-14 4-24 14-20l0 22zM92 58c6-14-4-24-14-20l0 22z" fill="${a}" ${L}/>`
    default:
      return ''
  }
}

// What sits over the face cube.
function front(look, b, a) {
  switch (look) {
    case 'miner':
      return `<path d="M14 44c0-20 72-20 72 0z" fill="#ffc21a" ${L}/><rect x="10" y="40" width="80" height="8" rx="4" fill="#f0a010" ${L}/><path d="M50 26v14" stroke="#e08a10" stroke-width="3"/><rect x="42" y="27" width="16" height="12" rx="4" fill="#fff6a0" ${L}/><path d="M74 66l12-6M78 72l12 0" stroke="#7a4a24" stroke-width="3" stroke-linecap="round"/>`
    case 'goggles':
      return `<rect x="14" y="44" width="72" height="8" fill="#3a6ad8" ${L}/><circle cx="36" cy="48" r="10" fill="#bfe8ff" ${L}/><circle cx="64" cy="48" r="10" fill="#bfe8ff" ${L}/><circle cx="33" cy="45" r="3" fill="#fff"/><circle cx="61" cy="45" r="3" fill="#fff"/>`
    case 'raccoon':
      return `<path d="M20 54c8-6 22-6 26 2-4 8-18 10-26-2zM80 54c-8-6-22-6-26 2 4 8 18 10 26-2z" fill="${a}"/>`
    case 'rooster':
      return `<path d="M44 66l12 0-6 10z" fill="#ffb21a" ${L}/><path d="M48 76c0 8 6 10 6 2" fill="${a}" ${L}/>`
    case 'panda':
      return `<ellipse cx="37" cy="62" rx="8" ry="9" fill="${a}"/><ellipse cx="63" cy="62" rx="8" ry="9" fill="${a}"/>`
    case 'fox':
      return `<path d="M30 92c4-14 36-14 40 0z" fill="${a}"/>`
    case 'phoenix':
    case 'dragon':
      return `<path d="M42 40h16" stroke="${a}" stroke-width="5" stroke-linecap="round"/>`
    default:
      return ''
  }
}

// A 100x100 portrait: a rounded cube face with its topper, eyes, blush and mouth.
export function petSvg(kind, variant = 'normal') {
  const k = PET_KINDS[kind] ?? PET_KINDS.minerHamster
  let b = k.body
  let a = k.accent
  let defs = ''
  const vf = VARIANT_FILL[variant]
  if (vf) {
    const gb = `pb${++uid}`
    const ga = `pa${uid}`
    defs = `<defs>${grad(gb, vf[0])}${grad(ga, vf[1])}</defs>`
    b = `url(#${gb})`
    a = `url(#${ga})`
  }
  const look = k.look
  const mouth = look === 'pig'
    ? `<ellipse cx="50" cy="73" rx="9" ry="6" fill="${a}" ${L}/><circle cx="47" cy="73" r="1.8" fill="${INK}"/><circle cx="53" cy="73" r="1.8" fill="${INK}"/>`
    : look === 'rooster' ? '' : `<path d="M44 73q3 4 6 0q3 4 6 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
  const eyes = look === 'goggles' ? '' : `<ellipse cx="37" cy="62" rx="5" ry="6.2" fill="${INK}"/><circle cx="38.6" cy="59.6" r="1.9" fill="#fff"/><ellipse cx="63" cy="62" rx="5" ry="6.2" fill="${INK}"/><circle cx="64.6" cy="59.6" r="1.9" fill="#fff"/>`
  const sparkle = variant === 'normal' ? '' : `<path d="M86 12l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>`
  return `<svg viewBox="0 0 100 100" class="pet-svg">${defs}${behind(look, b, a)}
    <rect x="16" y="32" width="68" height="60" rx="14" fill="${b}" stroke="${INK}" stroke-width="3.6"/>
    <path d="M24 40h30" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/>
    <path d="M72 36v52" stroke="#000" stroke-width="10" opacity=".07"/>
    ${front(look, b, a)}${eyes}
    <ellipse cx="27" cy="73" rx="5" ry="3" fill="#ff8aa8" opacity=".75"/><ellipse cx="73" cy="73" rx="5" ry="3" fill="#ff8aa8" opacity=".75"/>
    ${mouth}${sparkle}</svg>`
}

export const petName = (kind, variant = 'normal') => `${variant === 'normal' ? '' : `${PET_VARIANTS[variant].label} `}${PET_KINDS[kind].name}`

// --- Hatch overlay ----------------------------------------------------------------------
// show(egg, results): the egg rattles, the screen flashes, the pet cards pop in
// (`egg` null: a reward pet, straight to the reveal). Tap anywhere to close it.
export function createHatchOverlay(eggs) {
  const root = document.createElement('div')
  root.className = 'hatch'
  document.body.appendChild(root)
  let timer = 0
  root.addEventListener('pointerdown', (e) => {
    e.stopPropagation()
    if (root.classList.contains('reveal')) root.classList.remove('show')
  })
  const reveal = (auto) => {
    root.classList.add('reveal')
    sfx.reveal()
    timer = setTimeout(() => root.classList.remove('show'), PETS.reveal * 1000 * (auto ? 1.5 : 1))
  }
  return (egg, results) => {
    clearTimeout(timer)
    const slots = results.map(({ kind, variant, isNew }) => {
      const k = PET_KINDS[kind]
      const mult = k.mult * PET_VARIANTS[variant].mult
      return `<div class="hatch-slot">${egg ? `<div class="hatch-egg">${eggIcon(eggs[egg])}</div>` : ''}
        <div class="hatch-card r-${k.rarity}">${isNew ? '<span class="new stroke">NEW!</span>' : ''}<span class="hatch-pet">${petSvg(kind, variant)}</span>
        <span class="name stroke">${petName(kind, variant)}</span><span class="rarity stroke">${RARITY_NAME[k.rarity]}</span><span class="mult stroke">x${mult} SKILL</span></div></div>`
    })
    const many = results.length > 1 ? ` many" style="--cols:${Math.min(results.length, 4)}` : ''
    root.innerHTML = `<div class="hatch-flash"></div><div class="hatch-row${many}">${slots.join('')}</div>`
    root.className = 'hatch show'
    if (!egg) return reveal(true)
    sfx.rattle()
    timer = setTimeout(() => reveal(results.length > 1), PETS.shake * 1000) // a pack stays up longer
  }
}
