import {
  Box3,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { LOBBY, RUN, TNTS } from '../config.js'
import { addBox, canvasTex, dynamic, localSolid, plain, sign, studMat, topStuds } from './kit.js'
import { paintHazard, paintTntBox, paintTntWrap, paintWoven } from './paint.js'

// TNT models (single stick, bomb, trio, bundle, barrel, crates, royal crowned
// bundles, the big Dragon TNT) and the shop that shows them on coloured pads
// in two rows. Every model records its fuse tip so the sparks can find it.
const C = LOBBY.colors

const cache = new Map()
const memo = (key, make) => cache.get(key) ?? (cache.set(key, make()), cache.get(key))
const wrapMat = (color) => memo(`wrap${color}`, () => new MeshStandardMaterial({ map: canvasTex(paintTntWrap(color)), roughness: 0.55 }))
const capMat = (color) => memo(`cap${color}`, () => plain(color, 0.6))
const boxFace = (color, text = '#ffffff') => memo(`box${color}${text}`, () => new MeshStandardMaterial({ map: canvasTex(paintTntBox(color, text)), roughness: 0.5 }))
const gold = () => memo('gold', () => new MeshStandardMaterial({ color: '#ffc21a', roughness: 0.28, metalness: 0.75, emissive: '#5a3a00', emissiveIntensity: 0.25 }))
const fuseMat = () => memo('fuse', () => plain('#3b2f25', 0.9))
const bandMat = () => memo('band', () => plain('#232323', 0.7))

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16)
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `#${((f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0')}`
}

// A curly fuse from `from` going up; returns the tip (local).
function fuse(g, from, fuses, bend = 0.25) {
  const pts = [from.clone(), from.clone().add(new Vector3(bend * 0.4, 0.25, 0)), from.clone().add(new Vector3(bend, 0.45, bend * 0.3)), from.clone().add(new Vector3(bend * 1.4, 0.55, bend * 0.2))]
  const m = new Mesh(new TubeGeometry(new CatmullRomCurve3(pts), 10, 0.045, 5), fuseMat())
  m.castShadow = true
  g.add(m)
  fuses.push({ obj: g, local: pts[3] })
}

function stickMesh(g, x, y, z, { r = 0.17, h = 1.1, color = '#d9221a', tilt = 0, yaw = 0 } = {}) {
  const body = new Mesh(new CylinderGeometry(r, r, h, 14), [wrapMat(color), capMat(shade(color, 0.75)), capMat(shade(color, 0.75))])
  body.position.set(x, y + h / 2, z)
  body.rotation.set(tilt * Math.cos(yaw), 0, tilt * Math.sin(yaw))
  body.castShadow = true
  body.receiveShadow = true
  g.add(body)
  return body
}

// Hex-packed bundle of `n` sticks (1, 3 or 7) with two bands.
function packed(g, n, { r = 0.17, h = 1.1, color = '#d9221a', bands = true } = {}) {
  const offs = n === 1 ? [[0, 0]] : n === 3 ? [[-r, -r * 0.6], [r, -r * 0.6], [0, r * 1.1]] : [[0, 0], ...Array.from({ length: 6 }, (_, i) => [Math.cos((i / 6) * Math.PI * 2) * r * 2, Math.sin((i / 6) * Math.PI * 2) * r * 2])]
  for (const [x, z] of offs) stickMesh(g, x, 0, z, { r, h, color })
  if (bands && n > 1) {
    const R = n === 3 ? r * 2.05 : r * 3.05
    for (const y of [h * 0.25, h * 0.75]) {
      const band = new Mesh(new CylinderGeometry(R, R, h * 0.09, 18, 1, true), bandMat())
      band.position.y = y
      g.add(band)
    }
  }
  return h
}

export const models = {
  stick(fuses) {
    const g = new Group()
    stickMesh(g, 0, 0, 0, { r: 0.22, h: 1.4 })
    fuse(g, new Vector3(0, 1.4, 0), fuses)
    return g
  },
  bomb(fuses) {
    const g = new Group()
    const ball = new Mesh(new SphereGeometry(0.62, 24, 18), new MeshStandardMaterial({ color: '#1f3fd8', roughness: 0.18, metalness: 0.3 }))
    ball.position.y = 0.62
    ball.castShadow = true
    g.add(ball)
    const cap = new Mesh(new CylinderGeometry(0.2, 0.24, 0.22, 12), plain('#2a2a35', 0.4, { metalness: 0.6 }))
    cap.position.y = 1.28
    g.add(cap)
    const shine = new Mesh(new SphereGeometry(0.14, 10, 8), plain('#ffffff', 0.1, { emissive: '#ffffff', emissiveIntensity: 0.6 }))
    shine.position.set(-0.28, 0.98, 0.32)
    g.add(shine)
    fuse(g, new Vector3(0, 1.38, 0), fuses)
    return g
  },
  trio(fuses) {
    const g = new Group()
    const h = packed(g, 3, { r: 0.2, h: 1.3 })
    fuse(g, new Vector3(0, h, 0), fuses)
    return g
  },
  bundle(fuses) {
    const g = new Group()
    const h = packed(g, 7, { r: 0.17, h: 1.25 })
    const plaque = new Mesh(new CylinderGeometry(0.56, 0.56, 0.42, 18, 1, true, -0.7, 1.4), boxFace('#f6e7c4', '#d9221a'))
    plaque.position.y = h * 0.5
    g.add(plaque)
    fuse(g, new Vector3(0, h, 0), fuses)
    return g
  },
  barrel(fuses) {
    const g = new Group()
    const pts = []
    for (let i = 0; i <= 10; i++) {
      const t = i / 10
      pts.push(new Vector2(0.62 + Math.sin(t * Math.PI) * 0.14, t * 1.5))
    }
    const wood = memo('barrelWood', () => plain('#9a5a2a', 0.8))
    const body = new Mesh(new LatheGeometry(pts, 16), wood)
    body.castShadow = true
    g.add(body)
    for (const y of [0.18, 0.75, 1.32]) {
      const hoop = new Mesh(new TorusGeometry(0.62 + Math.sin((y / 1.5) * Math.PI) * 0.14 + 0.02, 0.04, 6, 24), plain('#3a3a42', 0.4, { metalness: 0.7 }))
      hoop.rotation.x = Math.PI / 2
      hoop.position.y = y
      g.add(hoop)
    }
    const lid = new Mesh(new CylinderGeometry(0.6, 0.6, 0.06, 16), plain('#7a4520', 0.8))
    lid.position.y = 1.5
    g.add(lid)
    const label = new Mesh(new CylinderGeometry(0.78, 0.78, 0.38, 16, 1, true, -0.6, 1.2), boxFace('#d9221a', '#ffd21a'))
    label.position.y = 0.75
    g.add(label)
    for (const [x, z] of [[-0.2, 0.1], [0.18, -0.12], [0.05, 0.25]]) stickMesh(g, x, 1.3, z, { r: 0.13, h: 0.7 })
    fuse(g, new Vector3(0.05, 2, 0.25), fuses)
    return g
  },
  crate(fuses, tint) {
    const g = new Group()
    const face = boxFace(tint)
    addBox(g, 1.5, 1.2, 1.5, [face, face, studMat(tint), face, face, face], 0, 0.6, 0)
    const sticks = new Group()
    packed(sticks, 7, { r: 0.15, h: 0.9, color: shade(tint, 1.05) })
    sticks.position.y = 0.9
    g.add(sticks)
    fuse(g, new Vector3(0, 1.8, 0), fuses)
    return g
  },
  royal(fuses, tint) {
    const g = new Group()
    const h = packed(g, 7, { r: 0.18, h: 1.3, color: tint })
    for (const y of [h * 0.25, h * 0.75]) {
      const band = new Mesh(new TorusGeometry(0.56, 0.05, 6, 24), gold())
      band.rotation.x = Math.PI / 2
      band.position.y = y
      g.add(band)
    }
    crown(g, h, 0.5)
    fuse(g, new Vector3(0, h + 0.55, 0), fuses, 0.18)
    return g
  },
}

// The model each TNT of the Inventory throws as: `look` -> a model above (tinted bundles
// and rewards are crates / royals). Built once per id and use; spun about its centre, with
// the fuse tip and the height its centre rests at when it lies on the lane.
const LOOKS = { stick: 'stick', bomb: 'bomb', banded: 'trio', keg: 'barrel', golden: ['royal', '#ffcc22'], royal: ['royal', '#ff7ad9'], gift: ['crate', '#ff5a8a'] }
const built = new Map()
export function tntModel(id, use) {
  const key = `${id}|${use}`
  if (built.has(key)) return built.get(key)
  const t = TNTS.find((x) => x.id === id)
  const look = t.look === 'bundle' ? (t.colors[0] === '#e8323a' ? 'bundle' : ['crate', t.colors[0]]) : LOOKS[t.look] ?? 'stick'
  const [kind, tint] = Array.isArray(look) ? look : [look]
  const fuses = []
  const model = models[kind](fuses, tint)
  const box = new Box3().setFromObject(model)
  const size = box.getSize(new Vector3())
  model.position.y = -box.getCenter(new Vector3()).y
  const spinner = new Group()
  spinner.add(model)
  const group = new Group()
  group.add(spinner)
  const out = { group, spinner, fuse: fuses[0], rest: (Math.min(size.x, size.y, size.z) / 2) * RUN.flightScale }
  built.set(key, out)
  return out
}

function crown(g, y, r) {
  const ring = new Mesh(new CylinderGeometry(r, r * 0.95, 0.3, 16, 1, true), gold())
  ring.position.y = y + 0.15
  g.add(ring)
  const gem = memo('gem', () => plain('#ff2a5a', 0.1, { emissive: '#ff1a4a', emissiveIntensity: 0.5 }))
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const spike = new Mesh(new ConeGeometry(0.1, 0.32, 5), gold())
    spike.position.set(Math.cos(a) * r, y + 0.45, Math.sin(a) * r)
    g.add(spike)
    const ball = new Mesh(new SphereGeometry(0.06, 8, 6), gem)
    ball.position.set(Math.cos(a) * r, y + 0.64, Math.sin(a) * r)
    g.add(ball)
  }
}

// The Dragon TNT: a red TNT block in a gold tray, a woven gold basket of
// sticks above it, gold flame spikes on top.
export function dragonTnt(fuses) {
  const g = new Group()
  const red = boxFace('#e3201a', '#ffd21a')
  addBox(g, 2.6, 0.25, 2.2, gold(), 0, 0.12, 0)
  addBox(g, 2.3, 1.5, 1.9, [red, red, studMat('#e3201a'), red, red, red], 0, 1, 0)
  for (const x of [-1.16, 1.16]) addBox(g, 0.1, 1.5, 1.95, gold(), x, 1, 0)
  const basket = new Mesh(new CylinderGeometry(1.15, 0.9, 1.1, 20), [new MeshStandardMaterial({ map: canvasTex(paintWoven(), { repeat: [4, 1] }), roughness: 0.4, metalness: 0.35 }), gold(), gold()])
  basket.position.y = 2.3
  basket.castShadow = true
  g.add(basket)
  const rim = new Mesh(new TorusGeometry(1.15, 0.09, 8, 28), gold())
  rim.rotation.x = Math.PI / 2
  rim.position.y = 2.85
  g.add(rim)
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const r = i === 0 ? 0 : 0.6
    stickMesh(g, Math.cos(a) * r, 2.2, Math.sin(a) * r, { r: 0.2, h: 1.5, tilt: r ? 0.18 : 0, yaw: a })
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    const flame = new Mesh(new ConeGeometry(0.22, 0.9 + (i % 2) * 0.4, 6), gold())
    flame.position.set(Math.cos(a) * 0.95, 3.4, Math.sin(a) * 0.95)
    flame.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3)
    g.add(flame)
  }
  const gem = new Mesh(new OctahedronGeometry(0.35, 0), plain('#ff3a2a', 0.1, { emissive: '#ff2a10', emissiveIntensity: 0.8 }))
  gem.position.set(0, 1.1, 0.98)
  g.add(gem)
  fuse(g, new Vector3(0, 3.7, 0), fuses, 0.3)
  return g
}

function pad(parent, x, y, z, color, size = 2.7) {
  addBox(parent, size, 0.22, size, plain(shade(color, 0.75), 0.5), x, y + 0.11, z)
  addBox(parent, size - 0.3, 0.08, size - 0.3, topStuds(studMat(color, { rough: 0.35 }), plain(color)), x, y + 0.26, z)
}

const label = (status, skill, cost, height = 2.3) =>
  sign(
    [
      { text: status ?? 'LOCKED', px: 40, color: status ? '#ffe14a' : '#ff3434' },
      { text: skill, px: 76, color: '#ffffff' },
      { text: cost, px: 46, color: '#ffd21a' },
    ],
    height,
  )

// The TNT shop west of spawn: front row on the checker floor, back row on a
// raised step, the Dragon TNT on its own pad in front. Returns fuse tips and
// the spinning displays.
export function buildShop(scene, fuses) {
  const S = LOBBY.shop
  const root = new Group()
  const spinners = []
  const checker = studMat(C.checkB, { alt: C.checkA })
  const sideWhite = plain('#e9eaee', 0.6)

  // Raised step for the back row (with stairs down to the front row).
  const minZ = -10.5
  const maxZ = 12
  const depth = maxZ - minZ
  const backEdge = S.backX + 2.6
  addBox(root, 6, S.stepHeight, depth, topStuds(checker, sideWhite), backEdge - 3, S.stepHeight / 2, (minZ + maxZ) / 2)
  localSolid(root, 3, S.stepHeight / 2, depth / 2, backEdge - 3, S.stepHeight / 2, (minZ + maxZ) / 2)
  for (let i = 1; i <= 2; i++) {
    const h = (S.stepHeight * i) / 3
    addBox(root, 0.8, h, depth, topStuds(checker, sideWhite), backEdge + 0.8 * (3 - i) - 0.4, h / 2, (minZ + maxZ) / 2)
    localSolid(root, 0.4, h / 2, depth / 2, backEdge + 0.8 * (3 - i) - 0.4, h / 2, (minZ + maxZ) / 2)
  }

  const show = (item, x, y, z) => {
    pad(root, x, y, z, item.pad)
    const model = item.kind === 'crate' || item.kind === 'royal' ? models[item.kind](fuses, item.tint) : models[item.kind](fuses)
    model.position.set(x, y + 0.32, z)
    model.scale.setScalar(1.15)
    root.add(dynamic(model))
    spinners.push(model)
    const l = label(item.status, item.skill, item.cost)
    l.position.set(x, y + 2.9, z)
    root.add(l)
    localSolid(root, 1.35, 0.15, 1.35, x, y + 0.15, z)
  }
  for (const item of S.front) show(item, S.frontX, 0.06, item.z)
  for (const item of S.back) show(item, S.backX, S.stepHeight, item.z)

  // Dragon TNT on its black pad with gold trim and hazard stripes.
  const D = S.dragon
  const dpad = new Group()
  addBox(dpad, 3.6, 0.3, 3.6, plain('#16161c', 0.4), 0, 0.15, 0)
  const haz = new MeshStandardMaterial({ map: canvasTex(paintHazard(), { repeat: [1 / 0.9, 5] }), roughness: 0.5 })
  for (const [x, z, w, d] of [[0, 1.7, 3.6, 0.2], [0, -1.7, 3.6, 0.2], [1.7, 0, 0.2, 3.6], [-1.7, 0, 0.2, 3.6]]) addBox(dpad, w, 0.34, d, d > w ? plain(C.red, 0.4) : haz, x, 0.17, z)
  addBox(dpad, 2.9, 0.08, 2.9, plain(C.red, 0.35, { emissive: '#7a0000', emissiveIntensity: 0.4 }), 0, 0.32, 0)
  dpad.position.set(D.x, 0.06, D.z)
  root.add(dpad)
  const dragon = dynamic(dragonTnt(fuses))
  dragon.position.set(D.x, 0.42, D.z)
  dragon.rotation.y = Math.PI / 2
  root.add(dragon)
  localSolid(root, 1.8, 1.8, 1.8, D.x, 1.8, D.z)
  const dl = sign(
    [
      { text: D.stock, px: 40, color: '#ffffff' },
      { text: D.name, px: 66, color: '#ffd21a', outline: '#b3120c' },
      { text: D.perk, px: 40, gradient: ['#ff3b3b', '#ffd21a', '#3bdc4a', '#2fa8ff', '#c04dff'] },
      { text: D.price, px: 40, color: '#ffffff' },
    ],
    3.2,
  )
  dl.position.set(D.x, 4.7, D.z)
  root.add(dl)

  scene.add(root)
  return {
    root,
    dragon,
    update(dt, t) {
      for (let i = 0; i < spinners.length; i++) spinners[i].rotation.y = t * 0.6 + i
      dragon.position.y = 0.42 + Math.sin(t * 2) * 0.05
    },
  }
}
