import { ICON } from './icons.js'

// The popup window shell every menu uses (Rebirth, My TNT / Pets / Eggs / Boosts,
// Pet Index, Trails, Playtime and Daily Rewards), ported from Clap to Destroy's ui.js:
// a blurred backdrop and a translucent slate frame with its big outlined title over
// the top edge, an icon over the top-left corner and a red X on the top-right corner.
// Around the frame: `side` (tabs down its left edge, outside the frame so the frame
// stays centred) and `foot` (under it); each shows only when filled. One window is
// open at a time; tapping the backdrop or Esc closes it.

const open = new Set()

export function createWindow({ title, icon = '', className = '', onOpen, onClose }) {
  const overlay = document.createElement('div')
  overlay.className = `uiw ${className}`
  overlay.innerHTML = `<div class="uiw-main"><div class="uiw-side"></div><div class="uiw-frame"><div class="uiw-icon">${icon}</div><div class="uiw-title"></div><button class="uiw-x" aria-label="Close">${ICON.x}</button><div class="uiw-body"></div></div><div class="uiw-foot"></div></div>`
  document.body.appendChild(overlay)
  const q = (c) => overlay.querySelector(c)
  const titleEl = q('.uiw-title')
  const api = {
    root: overlay,
    frame: q('.uiw-frame'),
    body: q('.uiw-body'),
    side: q('.uiw-side'),
    foot: q('.uiw-foot'),
    isOpen: () => open.has(api),
    setIcon(html) {
      q('.uiw-icon').innerHTML = html
    },
    setTitle(text) {
      titleEl.textContent = text
    },
    open() {
      if (api.isOpen()) return
      for (const w of [...open]) w.close()
      open.add(api)
      overlay.classList.add('show')
      onOpen?.()
    },
    close() {
      if (!api.isOpen()) return
      open.delete(api)
      overlay.classList.remove('show')
      onClose?.()
    },
  }
  api.setTitle(title)
  q('.uiw-x').addEventListener('click', api.close)
  overlay.addEventListener('pointerdown', (e) => {
    e.stopPropagation() // never reaches the world (no pointer lock grab)
    if (e.target === overlay || e.target.classList.contains('uiw-main')) api.close()
  })
  return api
}

export const anyWindowOpen = () => open.size > 0

// Esc: close the open window; returns whether one was closed.
export function closeTopWindow() {
  const w = [...open].pop()
  if (!w) return false
  w.close()
  return true
}

export function shake(node) {
  node.classList.remove('shake')
  void node.offsetWidth
  node.classList.add('shake')
}

export function el(tag, cls, html = '') {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html) e.innerHTML = html
  return e
}

// A button whose click runs fn; the press never reaches the world.
export function btn(cls, html, fn) {
  const b = el('button', cls, html)
  b.addEventListener('pointerdown', (e) => e.stopPropagation())
  b.addEventListener('click', (e) => {
    e.stopPropagation()
    fn(b)
  })
  return b
}
