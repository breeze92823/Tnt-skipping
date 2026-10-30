import { Vector3 } from 'three'
import { ICON } from './icons.js'
import { fmt } from './hud.js'
import './game.css'

// DOM feedback for a throw (Bowling Roll's fx.js): "bolt +N" popups anchored to world
// points, the zone banner, the +N WINS reward with its trophies. All are short-lived
// elements animated by game.css; nothing per-frame in JS except the world anchoring.

let camera = null
let layer = null
const anchored = [] // { el, pos, born, life }
const v = new Vector3()

export function installFx(cam) {
  camera = cam
  layer = document.createElement('div')
  layer.className = 'fx-layer'
  document.body.appendChild(layer)
}

function spawn(cls, html, life) {
  const el = document.createElement('div')
  el.className = cls
  el.innerHTML = html
  layer.appendChild(el)
  setTimeout(() => el.remove(), life)
  return el
}

// "bolt +N" rising from a world point; `big` for the blast's own payout.
export function skillPopup(amount, worldPos, big = false) {
  const life = big ? 1800 : 1000
  const el = spawn(`fx-skill${big ? ' big' : ''}`, `<span class="bolt">${ICON.bolt}</span><span class="stroke">+${fmt(amount)}</span>`, life)
  anchored.push({ el, pos: new Vector3(worldPos.x + (Math.random() - 0.5) * 0.8, worldPos.y, worldPos.z), born: performance.now(), life })
}

// A fast TNT crosses zones quicker than a banner lasts: the newest replaces the last.
let banner = null
export function zoneBanner(label, title) {
  banner?.remove()
  banner = spawn('fx-zone', `<span class="name" style="color:${title.color};--ink:${title.outline}">${label}</span>`, 2200)
  banner.firstChild.classList.add('stroke')
}

// The end of a throw: the trophy pair up top and +N WINS over the level bar.
export function winsReward(n) {
  spawn('fx-trophy', `<span class="small">${ICON.trophy}</span><b class="stroke">+${fmt(n)}</b><span>${ICON.trophy}</span>`, 2600)
  spawn('fx-wins stroke', `+${fmt(n)} WINS`, 2400)
}

export function updateFx() {
  if (!camera) return
  const now = performance.now()
  for (let i = anchored.length - 1; i >= 0; i--) {
    const a = anchored[i]
    const k = (now - a.born) / a.life
    if (k >= 1) {
      anchored.splice(i, 1)
      continue
    }
    v.copy(a.pos)
    v.y += k * 1.6
    v.project(camera)
    a.el.style.transform = `translate(${((v.x + 1) / 2) * window.innerWidth}px, ${((1 - v.y) / 2) * window.innerHeight}px) translate(-50%, -50%) scale(${1 + Math.sin(Math.min(1, k * 5) * Math.PI) * 0.35})`
    a.el.style.visibility = v.z > 1 ? 'hidden' : 'visible'
  }
}
