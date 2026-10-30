import './hud.css'
import { COARSE_POINTER } from './config.js'
import { ICON, pawIcon, rebirthIcon, trailIcon } from './icons.js'

// The on-screen HUD: the menu tiles on the left (Rebirth, Pets, Trails, Inventory, Gifts),
// the Daily Rewards calendar top-right, Rebirths / Wins / Friend Boost bottom-left, SKILL,
// the multiplier and the level bar bottom-centre, THROW and the
// toasts. While a throw runs the menus go, cinema bars close in and the distance shows
// (`.running`). Plain DOM; main.js pushes numbers in, windows.js listens for presses with
// on(name, fn). Ported in spirit from Clap to Destroy's hud.js.

function el(tag, cls, html = '') {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  e.innerHTML = html
  return e
}

export const fmt = (n) => {
  n = Math.floor(n)
  if (n < 1000) return `${n}`
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx']
  let u = -1
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000
    u++
  }
  return `${n >= 100 ? Math.floor(n) : +n.toFixed(n >= 10 ? 1 : 2)}${units[u]}`
}

export function createHud() {
  const root = el('div', 'hud')
  const handlers = new Map()
  const press = (node, name) => {
    node.addEventListener('pointerdown', (e) => {
      e.stopPropagation()
      e.preventDefault()
      node.classList.add('pressed')
      handlers.get(name)?.()
    })
    const up = () => node.classList.remove('pressed')
    node.addEventListener('pointerup', up)
    node.addEventListener('pointerleave', up)
    return node
  }

  // --- Top right: Daily Rewards ---
  const calendar = press(el('button', 'hud-round', `${ICON.calendar}<span class="badge stroke">!</span>`), 'calendar')
  root.append(el('div', 'hud-topright'))
  root.lastChild.append(calendar)

  // --- Left column: Wave Height Surf's slate menu grid (no Shop tile) ---
  const grid = el('div', 'hud-grid')
  const tile = (name, label, icon, extra = '') => press(el('button', `hud-tile ${name}`, `<span class="tile-icon">${icon}</span><span class="tile-label stroke">${label}</span>${extra}`), name)
  const rebirthTile = tile('rebirth', 'Rebirth', rebirthIcon(), '<span class="tile-pct stroke">0%</span>')
  const giftTile = tile('gifts', 'Gifts', ICON.gift, '<span class="tile-timer stroke">00:00</span>')
  grid.append(rebirthTile, tile('pets', 'Pets', pawIcon('#ffc21a')), tile('trails', 'Trails', trailIcon(['#d48bff', '#6a1fd8'])), tile('tnt', 'Inventory', ICON.backpack), giftTile)
  root.append(grid)

  // --- Bottom left: Rebirths and Wins like Wave Height Surf's counters, Friend Boost ---
  const cur = el('div', 'hud-currency')
  const row = (cls, icon) => {
    const r = el('div', `cur-row ${cls}`, `<span class="cur-icon">${icon}</span><span class="cur-val stroke">0</span>`)
    cur.append(r)
    return r.querySelector('.cur-val')
  }
  const rebirthVal = row('rebirths', rebirthIcon())
  const winsVal = row('wins', ICON.trophy)
  const winsRow = winsVal.parentElement
  const friends = el('div', 'cur-friends', `<span class="stroke">Friend Boost +0%</span>`)
  friends.append(press(el('button', 'friends-add', ICON.plus), 'friends'))
  cur.append(friends)
  root.append(cur)

  // --- Top centre: the distance during a throw ---
  const distance = el('div', 'hud-distance stroke')
  root.append(distance)

  // --- Bottom centre: THROW over SKILL, the multiplier and the level bar ---
  const dock = el('div', 'hud-dock')
  const throwWrap = el('div', 'hud-throw')
  const throwBtn = press(el('button', 'throw-btn', '<span class="stroke">THROW</span>'), 'throw')
  throwWrap.append(throwBtn, el('span', 'throw-hint stroke', COARSE_POINTER ? 'TAP TO THROW' : 'CLICK TO THROW'))
  const level = el(
    'div',
    'hud-level',
    `<div class="lv-row"><span class="lv-skill"><span class="lv-bolt">${ICON.bolt}</span><span class="stroke">0 SKILL</span></span><span class="lv-up stroke">Level Up!</span><span class="lv-mult stroke">x1 Multiplier</span></div><div class="lv-bar"><div class="lv-fill"></div><span class="lv-name stroke">Level 1</span><span class="lv-count stroke">0 / 40</span></div>`,
  )
  const skillVal = level.querySelector('.lv-skill .stroke')
  const multVal = level.querySelector('.lv-mult')
  const lvName = level.querySelector('.lv-name')
  const lvCount = level.querySelector('.lv-count')
  const lvFill = level.querySelector('.lv-fill')
  const lvUp = level.querySelector('.lv-up')
  dock.append(throwWrap, level)
  root.append(dock)

  // The cinema bars and the blast's white-out sit under the HUD's numbers.
  const bars = el('div', 'hud-bars', '<i></i><i></i>')
  const flash = el('div', 'hud-flash')
  document.body.append(bars, flash)

  // Toasts get their own layer over the windows (the HUD sits under them).
  const toasts = el('div', 'hud-toasts')
  const top = el('div', 'hud hud-top')
  top.append(toasts)
  document.body.append(root, top)

  return {
    on(name, fn) {
      handlers.set(name, fn)
    },
    // Keeps the left column under the platform's reserved top-left rectangles.
    setReservedTop(px) {
      root.style.setProperty('--res-top', `${Math.round(px)}px`)
    },
    setStats({ skill, wins, rebirths }) {
      skillVal.textContent = `${fmt(skill)} SKILL`
      winsVal.textContent = fmt(wins)
      rebirthVal.textContent = fmt(rebirths)
    },
    setLevel({ level: n, have, need, max }) {
      lvName.textContent = max ? 'MAX LEVEL' : `Level ${n}`
      lvCount.textContent = max ? 'REBIRTH!' : `${fmt(have)} / ${fmt(need)}`
      lvFill.style.width = `${(have / need) * 100}%`
    },
    setMultiplier(x) {
      multVal.textContent = `x${fmt(x)} Multiplier`
    },
    levelUp() {
      lvUp.classList.remove('show')
      void lvUp.offsetWidth // restarts the animation
      lvUp.classList.add('show')
    },
    popWins() {
      winsRow.classList.remove('pop')
      void winsRow.offsetWidth
      winsRow.classList.add('pop')
    },
    // The white-out of the blast.
    flash() {
      flash.classList.remove('go')
      void flash.offsetWidth
      flash.classList.add('go')
    },
    // THROW shows on the yellow band.
    setThrow(show) {
      throwWrap.classList.toggle('show', show)
    },
    setRunning(on) {
      root.classList.toggle('running', on)
      bars.classList.toggle('show', on)
    },
    setDistance(m) {
      const text = `${Math.floor(m).toLocaleString('en-US')} m`
      if (distance.textContent !== text) distance.textContent = text
    },
    // t: 0..1 along the rebirth level bar.
    setRebirthProgress(t) {
      rebirthTile.querySelector('.tile-pct').textContent = `${Math.floor(t * 100)}%`
    },
    setCalendarBadge(show) {
      calendar.querySelector('.badge').hidden = !show
    },
    // The next Playtime Reward: seconds left, 0 = ready, -1 = all claimed.
    setGift(secondsLeft) {
      const t = giftTile.querySelector('.tile-timer')
      t.hidden = secondsLeft < 0
      t.classList.toggle('ready', secondsLeft === 0)
      if (secondsLeft === 0) t.textContent = 'READY'
      else if (secondsLeft > 0) {
        const m = Math.floor(secondsLeft / 60)
        t.textContent = `${m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` : String(m).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`
      }
    },
    toast(text, kind = '') {
      const t = el('div', `hud-toast stroke ${kind}`, text)
      toasts.append(t)
      while (toasts.childElementCount > 3) toasts.firstChild.remove()
      setTimeout(() => t.classList.add('out'), 1800)
      setTimeout(() => t.remove(), 2300)
    },
  }
}
