import {
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
} from 'three'
import { LOBBY } from '../config.js'
import { mulberry32 } from '../textures.js'
import { bake } from '../bake.js'
import { addBox, canvasTex, plain } from './kit.js'
import { bush, lighthouse, palm, rock, treeRing } from './nature.js'
import { paintJollyRoger } from './paint.js'

// Pirate Isles' scenery: barrels, crates, treasure, cannons, anchors, ships and wrecks, coral,
// kraken arms, skull rocks, docks and volcanoes. buildPirateNature dresses the lobby (the world's
// answer to nature.js, on the same tree spots); pirateDress holds one entry per zone `props` of the
// lane past it (runScenery.js).

let mats = null
function M() {
  mats ??= {
    wood: plain('#8a5a30', 0.85),
    woodLight: plain('#b98a58', 0.85),
    hull: plain('#6a4024', 0.8),
    hullDark: plain('#3f2716', 0.85),
    ghostHull: plain('#3e4a52', 0.9),
    iron: plain('#34343c', 0.45, { metalness: 0.5 }),
    gold: plain('#ffc21a', 0.3, { metalness: 0.6, emissive: '#5a3a00', emissiveIntensity: 0.3 }),
    sail: plain('#f2e8d0', 0.85, { side: DoubleSide }),
    sailRed: plain('#c8281e', 0.8, { side: DoubleSide }),
    ghostSail: plain('#a8bcc4', 0.9, { side: DoubleSide, transparent: true, opacity: 0.72 }),
    black: plain('#15151a', 0.6),
    bone: plain('#eee6d2', 0.7),
    rock: plain('#8d8a84', 0.9, { flatShading: true }),
    sand: plain('#f3dc96', 0.95),
    red: plain('#c8281e', 0.5),
    coral: [plain('#ff5a7a', 0.5), plain('#ffa03a', 0.5), plain('#c86aff', 0.5), plain('#ffe14a', 0.5)],
    kraken: plain('#8a2a9a', 0.5),
    sucker: plain('#e8b0ee', 0.6),
    weed: plain('#1fa86a', 0.7),
    lamp: new MeshBasicMaterial({ color: '#ffd24a' }),
    ghostLamp: new MeshBasicMaterial({ color: '#7dffd8' }),
    lava: new MeshBasicMaterial({ color: '#ff6a1a' }),
    lavaHot: new MeshBasicMaterial({ color: '#ffd24a' }),
    ash: plain('#2a2024', 0.95, { flatShading: true }),
    wave: plain('#2f7f9e', 0.3),
    foam: plain('#f4fbff', 0.6),
    bubble: plain('#bff0ff', 0.2, { transparent: true, opacity: 0.55 }),
    flag: new MeshStandardMaterial({ map: canvasTex(paintJollyRoger()), roughness: 0.9, side: DoubleSide }),
  }
  return mats
}

// One mesh of a shared geometry (the bakes merge them).
const G = {}
function part(g, kind, mat, x, y, z, sx, sy = sx, sz = sx) {
  G.cyl ??= new CylinderGeometry(1, 1, 1, 10)
  G.ball ??= new SphereGeometry(1, 10, 8)
  G.cone ??= new ConeGeometry(1, 1, 8)
  G.ring ??= new TorusGeometry(1, 0.14, 6, 18)
  G.rock ??= new DodecahedronGeometry(1, 0)
  const m = new Mesh(G[kind], mat)
  m.position.set(x, y, z)
  m.scale.set(sx, sy, sz)
  m.castShadow = true
  g.add(m)
  return m
}

export function barrel(g, x, y, z, s = 1, tipped = false) {
  const m = M()
  const b = new Group()
  part(b, 'cyl', m.wood, 0, 0.95, 0, 0.72, 1.9)
  part(b, 'cyl', m.woodLight, 0, 0.95, 0, 0.8, 0.9)
  for (const h of [0.5, 1.4]) part(b, 'cyl', m.iron, 0, h, 0, 0.83, 0.12)
  part(b, 'cyl', m.hullDark, 0, 1.9, 0, 0.68, 0.04)
  b.position.set(x, y, z)
  b.scale.setScalar(s)
  if (tipped) {
    b.rotation.z = Math.PI / 2
    b.position.y += 0.75 * s
    b.position.x += 0.95 * s
  }
  g.add(b)
}

function crate(g, x, y, z, s = 1, yaw = 0) {
  const m = M()
  addBox(g, 1.8 * s, 1.5 * s, 1.8 * s, m.woodLight, x, y + 0.75 * s, z, { rotY: yaw })
  addBox(g, 1.9 * s, 0.2 * s, 1.9 * s, m.wood, x, y + 0.2 * s, z, { rotY: yaw })
  addBox(g, 1.9 * s, 0.2 * s, 1.9 * s, m.wood, x, y + 1.3 * s, z, { rotY: yaw })
}

function cargo(g, x, y, z, s, rand) {
  barrel(g, x, y, z, s)
  barrel(g, x + 1.7 * s, y, z + 0.5 * s, s * 0.9)
  barrel(g, x + 0.8 * s, y + 1.9 * s, z + 0.2 * s, s * 0.8)
  crate(g, x - 1.9 * s, y, z - 0.4 * s, s, rand() * 0.5)
}

function goldPile(g, x, y, z, s) {
  const m = M()
  part(g, 'ball', m.gold, x, y + 0.1, z, 1.5 * s, 0.75 * s, 1.5 * s)
  for (const [dx, dz] of [[1.5, 0.4], [-1.3, 0.8], [0.3, -1.5]]) part(g, 'cyl', m.gold, x + dx * s, y + 0.1, z + dz * s, 0.3 * s, 0.1 * s)
}

function chest(g, x, y, z, s = 1, yaw = 0) {
  const m = M()
  const c = new Group()
  addBox(c, 2.4, 1.3, 1.5, m.hull, 0, 0.65, 0)
  const lid = part(c, 'cyl', m.hullDark, 0, 1.3, 0, 0.75, 2.4, 0.75)
  lid.rotation.z = Math.PI / 2
  for (const dx of [-0.8, 0.8]) addBox(c, 0.24, 1.36, 1.58, m.gold, dx, 0.68, 0)
  addBox(c, 0.42, 0.5, 0.1, m.gold, 0, 1, 0.8)
  part(c, 'ball', m.gold, 0, 1.75, 0, 0.8, 0.5, 0.55)
  c.position.set(x, y, z)
  c.rotation.y = yaw
  c.scale.setScalar(s)
  g.add(c)
}

function cannon(g, x, y, z, s = 1, yaw = 0) {
  const m = M()
  const c = new Group()
  addBox(c, 1.5, 0.5, 2.6, m.wood, 0, 0.65, 0)
  for (const [dx, dz] of [[-0.85, 0.8], [0.85, 0.8], [-0.85, -0.8], [0.85, -0.8]]) {
    const w = part(c, 'cyl', m.hullDark, dx, 0.45, dz, 0.45, 0.24)
    w.rotation.z = Math.PI / 2
  }
  const b = part(c, 'cyl', m.iron, 0, 1.25, 0.5, 0.42, 3.2)
  b.rotation.x = Math.PI / 2 - 0.12
  const muzzle = part(c, 'cyl', m.iron, 0, 1.45, 2.05, 0.54, 0.36)
  muzzle.rotation.x = Math.PI / 2 - 0.12
  part(c, 'ball', m.black, 0, 1.45, 2.2, 0.32)
  part(c, 'ball', m.iron, 0, 1.05, -1.15, 0.4)
  c.position.set(x, y, z)
  c.rotation.y = yaw
  c.scale.setScalar(s)
  g.add(c)
}

function anchor(g, x, y, z, s = 1, yaw = 0) {
  const m = M()
  const a = new Group()
  part(a, 'cyl', m.iron, 0, 3, 0, 0.26, 6)
  const ring = part(a, 'ring', m.iron, 0, 6.5, 0, 0.6)
  ring.rotation.y = Math.PI / 2
  addBox(a, 2.6, 0.32, 0.4, m.iron, 0, 5.2, 0)
  for (const side of [-1, 1]) {
    addBox(a, 2.2, 0.42, 0.42, m.iron, side * 1, 0.7, 0).rotation.z = -side * 0.55
    const fluke = part(a, 'cone', m.iron, side * 2, 1.7, 0, 0.5, 1.3, 0.3)
    fluke.rotation.z = -side * 0.35
  }
  a.position.set(x, y, z)
  a.rotation.set(0.14, yaw, 0.16)
  a.scale.setScalar(s)
  g.add(a)
}

function flagPole(g, x, y, z, s = 1, yaw = 0) {
  const m = M()
  part(g, 'cyl', m.wood, x, y + 5 * s, z, 0.16 * s, 10 * s)
  const f = new Mesh(new PlaneGeometry(3.4 * s, 2.3 * s), m.flag)
  f.position.set(x + Math.cos(yaw) * 1.8 * s, y + 8.7 * s, z - Math.sin(yaw) * 1.8 * s)
  f.rotation.y = yaw
  g.add(f)
}

function lanternPost(g, x, y, z, s = 1, lamp = M().lamp) {
  const m = M()
  part(g, 'cyl', m.hullDark, x, y + 2.2 * s, z, 0.14 * s, 4.4 * s)
  addBox(g, 0.9 * s, 0.12 * s, 0.12 * s, m.hullDark, x + 0.4 * s, y + 4.3 * s, z)
  addBox(g, 0.5 * s, 0.7 * s, 0.5 * s, lamp, x + 0.75 * s, y + 3.85 * s, z, { shadow: false })
}

// A three-masted ship, bow toward +Z, its waterline at y.
function hullSlice(width, length, height, y, mat, g) {
  const s = new Shape()
  const w = width / 2
  const l = length / 2
  s.moveTo(-w, -l)
  s.lineTo(w, -l)
  s.lineTo(w, l * 0.35)
  s.quadraticCurveTo(w * 0.7, l * 0.85, 0, l)
  s.quadraticCurveTo(-w * 0.7, l * 0.85, -w, l * 0.35)
  s.closePath()
  const geo = new ExtrudeGeometry(s, { depth: height, bevelEnabled: false, curveSegments: 6 })
  geo.rotateX(Math.PI / 2)
  const m = new Mesh(geo, mat)
  m.position.y = y + height
  m.castShadow = true
  g.add(m)
}

export function galleon(parent, x, y, z, s = 1, yaw = 0, { ghost = false, tilt = 0 } = {}) {
  const m = M()
  const g = new Group()
  const hull = ghost ? m.ghostHull : m.hull
  const dark = ghost ? m.black : m.hullDark
  const sail = ghost ? m.ghostSail : m.sail
  const stripe = ghost ? m.ghostSail : m.sailRed
  hullSlice(6, 22, 1.6, -0.4, dark, g)
  hullSlice(7.4, 25, 2, 1.2, hull, g)
  hullSlice(8, 26, 0.5, 3.2, dark, g)
  addBox(g, 7.4, 2.4, 6, hull, 0, 4.9, -9.5) // the stern castle
  addBox(g, 7.8, 0.3, 6.3, m.gold, 0, 6.2, -9.5)
  addBox(g, 5.4, 1.2, 4, hull, 0, 4.2, 8)
  addBox(g, 5.8, 0.24, 4.3, m.gold, 0, 4.9, 8)
  for (const side of [-1, 1]) for (let k = -3; k <= 3; k++) addBox(g, 0.1, 0.7, 0.9, m.black, side * 3.73, 2.3, k * 2.6, { shadow: false })
  const masts = [[-4.5, 15], [2.5, 18], [9, 13]]
  masts.forEach(([mz, h], i) => {
    part(g, 'cyl', dark, 0, 3.2 + h / 2, mz, 0.3, h)
    for (const [t, w, d] of [[0.42, 9, 4.6], [0.78, 7, 3.4]]) {
      const sy = 3.2 + h * t
      const yard = part(g, 'cyl', dark, 0, sy + d / 2, mz, 0.13, w + 1)
      yard.rotation.z = Math.PI / 2
      addBox(g, w, d, 0.12, i === 1 && t < 0.5 ? stripe : sail, 0, sy, mz + 0.4).rotation.x = -0.1
    }
    if (ghost) return
    const f = new Mesh(new PlaneGeometry(3, 2), m.flag)
    f.position.set(1.6, 3.4 + h, mz)
    f.rotation.y = -Math.PI / 2
    g.add(f)
  })
  g.position.set(x, y, z)
  g.rotation.set(tilt * 0.5, yaw, tilt)
  g.scale.setScalar(s)
  parent.add(g)
}

// A broken-up wreck on the sand: half a hull, its ribs and a snapped mast.
function wreck(g, x, y, z, s, rand, ghost = false) {
  const m = M()
  const w = new Group()
  hullSlice(7, 13, 2.4, 0, ghost ? m.ghostHull : m.hull, w)
  for (let k = 0; k < 5; k++) {
    for (const side of [-1, 1]) {
      const rib = part(w, 'cyl', m.hullDark, side * 3.2, 3.2, -7 - k * 1.9, 0.18, 4.2 - k * 0.3)
      rib.rotation.z = -side * 0.22
    }
  }
  const mast = part(w, 'cyl', m.hullDark, 0.5, 5.4, 1, 0.3, 9)
  mast.rotation.z = 0.28
  if (ghost) part(w, 'ball', m.ghostLamp, 2.1, 9.8, 1, 0.4)
  w.position.set(x, y, z)
  w.rotation.set(0.08, rand() * Math.PI * 2, 0.16)
  w.scale.setScalar(s)
  g.add(w)
}

function coral(g, x, y, z, s, rand) {
  const m = M()
  const col = m.coral[Math.floor(rand() * m.coral.length)]
  const n = 4 + Math.floor(rand() * 4)
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2
    const h = (2 + rand() * 3.4) * s
    const tilt = 0.2 + rand() * 0.4
    const b = part(g, 'cyl', col, x + (Math.cos(a) * h * tilt) / 2, y + h / 2, z + (Math.sin(a) * h * tilt) / 2, 0.3 * s, h)
    b.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt)
    part(g, 'ball', col, x + Math.cos(a) * h * tilt, y + h, z + Math.sin(a) * h * tilt, 0.44 * s)
  }
  if (rand() < 0.5) part(g, 'ball', m.coral[Math.floor(rand() * m.coral.length)], x + rand() * 2 * s, y + 0.8 * s, z, 1.3 * s, 0.9 * s, 1.3 * s)
}

// A kraken arm curling out of the ground.
function tentacle(g, x, y, z, s, rand) {
  const m = M()
  const a = rand() * Math.PI * 2
  const bend = 2.4 + rand() * 1.4
  const n = 13
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const r = (1.1 - t * 0.85) * s
    const out = Math.sin(t * Math.PI * 0.9) * bend * s
    const px = x + Math.cos(a) * out
    const pz = z + Math.sin(a) * out
    const py = y + (t * 11 - t * t * 1.5) * s
    part(g, 'ball', m.kraken, px, py, pz, r)
    if (i % 2 === 0 && i < n - 3) part(g, 'ball', m.sucker, px + Math.cos(a + 1.57) * r * 0.86, py, pz + Math.sin(a + 1.57) * r * 0.86, r * 0.3)
  }
}

function skullRock(g, x, y, z, s = 1, yaw = 0) {
  const m = M()
  const r = new Group()
  part(r, 'ball', m.rock, 0, 7.5, 0, 8, 7.4, 7.6)
  addBox(r, 8.6, 3.6, 8, m.rock, 0, 1.9, 2)
  for (const side of [-1, 1]) {
    part(r, 'ball', m.black, side * 3.2, 8.2, 6.2, 2.1, 2.4, 1.6)
    part(r, 'cone', m.black, side * 0.7, 5, 7, 0.7, 1.8, 0.6)
  }
  for (let k = -2; k <= 2; k++) addBox(r, 1.1, 1.5, 0.5, m.bone, k * 1.45, 2.8, 6)
  r.position.set(x, y, z)
  r.rotation.y = yaw
  r.scale.setScalar(s)
  g.add(r)
}

// A plank dock on posts with a little cargo.
function dock(g, x, y, z, s, rand) {
  const m = M()
  const d = new Group()
  addBox(d, 13, 0.3, 5, m.woodLight, 0, 1.7, 0)
  for (let k = -6; k <= 6; k += 1.6) addBox(d, 0.1, 0.34, 5.04, m.hullDark, k, 1.7, 0, { shadow: false })
  for (const px of [-6, -2, 2, 6]) for (const pz of [-2.2, 2.2]) part(d, 'cyl', m.hullDark, px, 1, pz, 0.24, 2.4)
  lanternPost(d, 5.5, 1.85, 2, 0.9)
  if (rand() < 0.6) barrel(d, -3, 1.85, 1, 0.8)
  if (rand() < 0.6) crate(d, 0, 1.85, -1, 0.8, rand())
  d.position.set(x, y, z)
  d.rotation.y = rand() < 0.5 ? 0 : Math.PI / 2
  d.scale.setScalar(s)
  g.add(d)
}

function volcano(g, x, y, z, s, rand) {
  const m = M()
  const h = (20 + rand() * 12) * s
  const r = (15 + rand() * 7) * s
  part(g, 'cone', m.ash, x, y + h / 2, z, r, h)
  part(g, 'cyl', m.ash, x, y + h - 1.2 * s, z, r * 0.2, 2.4 * s)
  part(g, 'cyl', m.lavaHot, x, y + h + 0.05 * s, z, r * 0.15, 0.3 * s)
  for (let i = 0; i < 3; i++) {
    const a = rand() * Math.PI * 2
    const flow = addBox(g, 1 * s, h * 1.04, 0.3 * s, m.lava, x + (Math.cos(a) * r) / 2, y + h / 2, z + (Math.sin(a) * r) / 2, { shadow: false })
    flow.rotation.set(Math.sin(a) * 0.62, 0, -Math.cos(a) * 0.62)
  }
}

function wave(g, x, y, z, s, rand) {
  const m = M()
  const w = (5 + rand() * 4) * s
  part(g, 'ball', m.wave, x, y + 1.1 * s, z, w, 2.4 * s, 2.4 * s)
  part(g, 'ball', m.foam, x, y + 3 * s, z, w * 0.7, 0.6 * s, 0.9 * s)
}

function seaweed(g, x, y, z, s, rand) {
  const m = M()
  const n = 3 + Math.floor(rand() * 3)
  for (let i = 0; i < n; i++) {
    const h = (4 + rand() * 6) * s
    const b = addBox(g, 0.5 * s, h, 0.14 * s, m.weed, x + (rand() - 0.5) * 3 * s, y + h / 2, z + (rand() - 0.5) * 3 * s)
    b.rotation.z = (rand() - 0.5) * 0.3
  }
}

function bubbles(g, x, y, z, s, rand) {
  const m = M()
  for (let i = 0; i < 4; i++) {
    const r = (0.3 + rand() * 0.6) * s
    part(g, 'ball', m.bubble, x + (rand() - 0.5) * 3 * s, y + (3 + i * 3 + rand() * 2) * s, z + (rand() - 0.5) * 3 * s, r)
  }
}

// Props in one lane-side strip (runScenery.js dress): side -1 = west bank, 1 = east bank.
export const pirateDress = {
  lagoon(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.6) palm(g, x, y, z, 1 + rand() * 0.5, rand)
    else if (r < 0.8) cargo(g, x, y, z, 0.9, rand)
    else rock(g, x, y, z, 1.2 + rand() * 1.2, rand)
    if (rand() < 0.45) palm(g, x + side * (10 + rand() * 14), y, z + rand() * 6, 1.3 + rand() * 0.5, rand)
    if (rand() < 0.12) flagPole(g, x + side * 6, y, z + 3, 1, -side * 0.4)
  },
  treasure(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.34) chest(g, x, y, z, 1 + rand() * 0.5, rand() * 3)
    else if (r < 0.66) goldPile(g, x, y, z, 1 + rand() * 0.9)
    else palm(g, x, y, z, 1 + rand() * 0.4, rand)
    if (rand() < 0.3) cannon(g, x + side * (9 + rand() * 12), y, z, 1.2, side > 0 ? -Math.PI / 2 : Math.PI / 2)
  },
  docks(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.5) dock(g, x + side * 3, y, z, 1 + rand() * 0.3, rand)
    else if (r < 0.8) cargo(g, x, y, z, 1, rand)
    else lanternPost(g, x, y, z, 1.2)
    if (rand() < 0.3) galleon(g, x + side * (22 + rand() * 8), y, z, 0.7, rand() * 0.6 - 0.3)
  },
  coral(g, x, y, z, side, rand) {
    coral(g, x, y, z, 1 + rand() * 0.7, rand)
    if (rand() < 0.55) coral(g, x + side * (11 + rand() * 14), y, z + rand() * 6, 1.6 + rand(), rand)
    if (rand() < 0.3) seaweed(g, x + side * 4, y, z - 3, 1, rand)
  },
  kraken(g, x, y, z, side, rand) {
    if (rand() < 0.62) tentacle(g, x, y, z, 0.9 + rand() * 0.6, rand)
    else rock(g, x, y, z, 1.4 + rand() * 1.6, rand)
    if (rand() < 0.5) tentacle(g, x + side * (12 + rand() * 14), y, z, 1.6 + rand() * 0.8, rand)
    if (rand() < 0.15) wreck(g, x + side * 20, y, z, 0.7, rand)
  },
  bluffs(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.4) cannon(g, x, y, z, 1.2 + rand() * 0.4, side > 0 ? -Math.PI / 2 : Math.PI / 2)
    else if (r < 0.75) palm(g, x, y, z, 1.1 + rand() * 0.5, rand)
    else flagPole(g, x, y, z, 1.1, -side * 0.4)
    if (rand() < 0.6) rock(g, x + side * (14 + rand() * 14), y, z, 3 + rand() * 3, rand)
  },
  skull(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.22) skullRock(g, x + side * 8, y, z, 0.8 + rand() * 0.5, side > 0 ? -Math.PI / 2 : Math.PI / 2)
    else if (r < 0.62) rock(g, x, y, z, 1.4 + rand() * 1.8, rand)
    else chest(g, x, y, z, 1, rand() * 3)
    if (rand() < 0.4) rock(g, x + side * (16 + rand() * 12), y, z, 3 + rand() * 3, rand)
  },
  ghost(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.5) wreck(g, x + side * 3, y, z, 0.7 + rand() * 0.3, rand, true)
    else if (r < 0.8) lanternPost(g, x, y, z, 1.2, M().ghostLamp)
    else anchor(g, x, y, z, 1, rand() * 3)
    if (rand() < 0.28) galleon(g, x + side * (20 + rand() * 8), y, z, 0.7, rand() - 0.5, { ghost: true, tilt: (rand() - 0.5) * 0.25 })
  },
  keg(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.55) cargo(g, x, y, z, 1 + rand() * 0.3, rand)
    else if (r < 0.82) barrel(g, x, y, z, 1.4 + rand() * 0.8, rand() < 0.5)
    else cannon(g, x, y, z, 1.3, side > 0 ? -Math.PI / 2 : Math.PI / 2)
    if (rand() < 0.4) cargo(g, x + side * (11 + rand() * 12), y, z + rand() * 5, 1.5, rand)
  },
  volcano(g, x, y, z, side, rand) {
    if (rand() < 0.6) rock(g, x, y, z, 1.6 + rand() * 2, rand)
    else anchor(g, x, y, z, 0.9, rand() * 3)
    if (rand() < 0.22) volcano(g, x + side * (20 + rand() * 6), y, z, 0.7 + rand() * 0.4, rand)
  },
  storm(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.6) wave(g, x, y, z, 1 + rand() * 0.7, rand)
    else if (r < 0.82) wreck(g, x + side * 3, y, z, 0.6 + rand() * 0.2, rand)
    else barrel(g, x, y, z, 1.2, true)
    if (rand() < 0.6) wave(g, x + side * (12 + rand() * 14), y, z, 1.8 + rand(), rand)
  },
  locker(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.4) seaweed(g, x, y, z, 1 + rand() * 0.6, rand)
    else if (r < 0.65) chest(g, x, y, z, 1.1, rand() * 3)
    else if (r < 0.85) anchor(g, x, y, z, 1, rand() * 3)
    else wreck(g, x + side * 3, y, z, 0.7, rand, true)
    if (rand() < 0.5) bubbles(g, x + side * (4 + rand() * 10), y, z, 1 + rand() * 0.6, rand)
    if (rand() < 0.15) skullRock(g, x + side * 18, y, z, 1, side > 0 ? -Math.PI / 2 : Math.PI / 2)
  },
}

// A sandy islet in the sea with a palm or two.
function islet(parent, x, y, z, s, rand) {
  const m = M()
  part(parent, 'cyl', m.sand, x, y - 2, z, 9 * s, 4, 7 * s)
  part(parent, 'ball', m.sand, x, y, z, 8 * s, 1.5 * s, 6 * s)
  palm(parent, x, y + 1, z, 1.1 * s, rand)
  if (rand() < 0.6) palm(parent, x + 3 * s, y + 0.8, z + 2 * s, 0.9 * s, rand)
  if (rand() < 0.5) chest(parent, x - 3 * s, y + 1, z - 1 * s, 0.8, rand() * 3)
}

// The lobby's scenery: palms on the tree spots, cargo and cannons along the banks, a wreck where
// the first world has its windmill, and islets, ships and a skull rock out at sea.
export function buildPirateNature(scene) {
  const rand = mulberry32(4242)
  const g = new Group()
  const I = LOBBY.island
  const R = LOBBY.runway
  const P = LOBBY.plaza
  const tower = LOBBY.tower

  for (const [x, z] of treeRing(rand)) {
    if (Math.hypot(x - tower.x, z - tower.z) < tower.radius + 5) continue
    palm(g, x, 0, z, 1.2 + rand() * 0.6, rand)
  }
  for (let i = 0; i < 18; i++) {
    const side = i % 3
    if (side === 0) bush(g, P.minX - 2 - rand() * 3, 0, P.minZ + rand() * (P.maxZ - P.minZ), 1, rand)
    else if (side === 1) barrel(g, P.minX + rand() * (P.maxX - P.minX), 0, P.maxZ + 2 + rand() * 3, 0.9, rand() < 0.4)
    else bush(g, P.maxX + 2 + rand() * 3, 0, P.minZ + rand() * (P.maxZ - P.minZ), 1, rand)
  }

  const north = -30 - R.length
  for (let z = -36; z > north + 10; z -= 9 + rand() * 6) {
    const lx = R.minX - 4 - rand() * 8
    if (rand() < 0.5) palm(g, lx, R.bankHeight, z, 1 + rand() * 0.4, rand)
    else cargo(g, R.minX - 5 - rand() * 3, R.bankHeight, z - 3, 0.9, rand)
    palm(g, R.minX - 20 - rand() * 12, R.upperBankHeight, z + rand() * 4, 1.1 + rand() * 0.4, rand)
    const rx = R.maxX + 5 + rand() * 10
    if (rand() < 0.6) palm(g, rx, R.bankHeight, z, 1 + rand() * 0.4, rand)
    else cannon(g, rx, R.bankHeight, z, 1.2, -Math.PI / 2)
    if (rand() < 0.5) rock(g, R.maxX + 3 + rand() * 3, R.bankHeight, z - 4, 0.9 + rand() * 0.6, rand)
    if (rand() < 0.3) chest(g, R.minX - 3 - rand() * 2, R.bankHeight, z + 4, 0.9, rand() * 3)
  }
  // The bank wall behind the glitch booth, where the first world has its hay.
  cargo(g, -10, R.bankHeight, -33, 0.9, rand)
  cargo(g, -24, R.bankHeight, -34, 0.9, rand)
  cargo(g, 26, R.bankHeight, -34, 0.9, rand)
  flagPole(g, -30, R.bankHeight, -36, 1.2, 0.4)
  flagPole(g, 30, R.bankHeight, -36, 1.2, -0.4)

  galleon(g, LOBBY.windmill.x, R.upperBankHeight - 0.8, LOBBY.windmill.z, 0.8, 0.5, { tilt: 0.1 })
  anchor(g, I.minX + 8, 0, 48, 1, 0.8)

  const sea = -2.4
  LOBBY.floatingIslands.forEach(([x, , z, s], i) => {
    islet(g, x, 0, z, s * 1.6, rand)
    if (i % 3 === 0) galleon(g, x + Math.sign(x) * 26, sea, z + 8, 1.1, rand() * 6)
  })
  lighthouse(g, LOBBY.floatingIslands[2][0], 0.6, LOBBY.floatingIslands[2][2] + 4)
  skullRock(g, -128, sea, -40, 2.2, Math.PI / 2)
  skullRock(g, 138, sea, 70, 1.8, -Math.PI / 2)

  const baked = bake(g, true)
  baked.traverse((o) => (o.receiveShadow = true))
  scene.add(baked)
  return { update() {} }
}
