import {
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  DoubleSide,
  RepeatWrapping,
} from 'three'
import { LOBBY } from '../config.js'
import { mulberry32, paintWaterfall, toTexture } from '../textures.js'
import { bake } from '../bake.js'
import { solidPole } from '../propkit.js'
import { addBox, canvasTex, plain, studMat, topStuds } from './kit.js'
import { paintHay } from './paint.js'

// Scenery: blocky voxel pines and broadleaf trees, palms, bushes, rocks and hay
// bales round the plaza and along the runway banks; floating sky islands (some
// with waterfalls); the windmill. runScenery.js dresses the lane's far zones with the
// palms, lighthouse and umbrellas exported here.
const C = LOBBY.colors

let mats = null
function materials() {
  if (mats) return mats
  mats = {
    leaf: studMat('#3cc63a', { rough: 0.7 }),
    leafLight: studMat('#59dc45', { rough: 0.7 }),
    leafSide: plain('#34b234', 0.75),
    leafSideLight: plain('#4ccc3c', 0.75),
    trunk: plain('#7a4a24', 0.9),
    trunkDark: plain('#5e3719', 0.9),
    palmTrunk: plain('#b07a43', 0.9),
    frond: plain('#3dcf4a', 0.7),
    bush: plain('#36c03c', 0.8),
    rock: plain('#7f8ea8', 0.85, { flatShading: true }),
    hay: new MeshStandardMaterial({ map: canvasTex(paintHay()), roughness: 1 }),
    hayEnd: plain('#d9b65a', 1),
    grass: studMat(C.grass),
    stone: studMat(C.stone, { rough: 0.8 }),
    stoneDark: studMat('#6f7a88', { rough: 0.85 }),
    dirt: studMat(C.dirt, { rough: 0.85 }),
  }
  return mats
}

// Stepped voxel pine: trunk + 3-4 shrinking studded slabs.
export function pine(parent, x, y, z, s = 1, rand = Math.random) {
  const M = materials()
  const g = new Group()
  addBox(g, 0.9 * s, 3.2 * s, 0.9 * s, M.trunk, 0, 1.6 * s, 0)
  const tiers = 3 + (rand() < 0.5 ? 1 : 0)
  let w = 4.6 * s
  let ty = 2.4 * s
  for (let i = 0; i < tiers; i++) {
    const h = 1.5 * s
    const light = i % 2 === 1
    addBox(g, w, h, w, topStuds(light ? M.leafLight : M.leaf, light ? M.leafSideLight : M.leafSide), 0, ty + h / 2, 0)
    ty += h * 0.85
    w *= 0.72
  }
  addBox(g, w * 0.7, 0.9 * s, w * 0.7, topStuds(M.leafLight, M.leafSideLight), 0, ty + 0.45 * s, 0)
  g.position.set(x, y, z)
  g.rotation.y = rand() * Math.PI
  parent.add(g)
  return g
}

// Broadleaf voxel tree: a leaning trunk with a branch, and a canopy of
// overlapping studded slabs at slight angles (the big trees round the plaza).
export function broadleaf(parent, x, y, z, s = 1, rand = Math.random) {
  const M = materials()
  const g = new Group()
  const lean = (rand() - 0.5) * 0.25
  const trunk = addBox(g, 1.1 * s, 6 * s, 1.1 * s, M.trunk, 0, 3 * s, 0)
  trunk.rotation.z = lean
  const branch = addBox(g, 0.6 * s, 2.6 * s, 0.6 * s, M.trunkDark, 1.1 * s, 4.6 * s, 0)
  branch.rotation.z = -0.8
  const top = 6 * s
  const pieces = 4 + Math.floor(rand() * 3)
  for (let i = 0; i < pieces; i++) {
    const w = (3.2 + rand() * 2.6) * s
    const d = (3 + rand() * 2.4) * s
    const h = (1.4 + rand() * 1.2) * s
    const light = rand() < 0.45
    const m = addBox(
      g,
      w,
      h,
      d,
      topStuds(light ? M.leafLight : M.leaf, light ? M.leafSideLight : M.leafSide),
      (rand() - 0.5) * 3.2 * s - lean * 4 * s,
      top + (rand() - 0.2) * 2.2 * s,
      (rand() - 0.5) * 3 * s,
    )
    m.rotation.set((rand() - 0.5) * 0.25, rand() * 0.6, (rand() - 0.5) * 0.25)
  }
  g.position.set(x, y, z)
  g.rotation.y = rand() * Math.PI * 2
  parent.add(g)
  return g
}

// Palm: a curved segmented trunk and drooping fronds.
export function palm(parent, x, y, z, s = 1, rand = Math.random) {
  const M = materials()
  const g = new Group()
  const seg = new CylinderGeometry(0.32 * s, 0.4 * s, 1.3 * s, 7)
  let px = 0
  let py = 0
  const bend = 0.06 + rand() * 0.08
  for (let i = 0; i < 7; i++) {
    const m = new Mesh(seg, M.palmTrunk)
    m.position.set(px, py + 0.65 * s, 0)
    m.rotation.z = -bend * i
    m.castShadow = true
    g.add(m)
    px += Math.sin(bend * i) * 1.2 * s
    py += Math.cos(bend * i) * 1.2 * s
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    const f = new Group()
    addBox(f, 3.4 * s, 0.12 * s, 0.9 * s, M.frond, 1.7 * s, 0, 0)
    f.rotation.set(0, a, -0.45 - rand() * 0.2)
    f.position.set(px, py + 0.4 * s, 0)
    g.add(f)
  }
  g.position.set(x, y, z)
  g.rotation.y = rand() * Math.PI * 2
  parent.add(g)
  return g
}

export function bush(parent, x, y, z, s = 1, rand = Math.random) {
  const M = materials()
  const geo = new IcosahedronGeometry(1, 1)
  for (let i = 0; i < 3; i++) {
    const m = new Mesh(geo, M.bush)
    const r = (0.9 + rand() * 0.6) * s
    m.scale.set(r, r * 0.8, r)
    m.position.set(x + (rand() - 0.5) * 1.6 * s, y + r * 0.55, z + (rand() - 0.5) * 1.6 * s)
    m.castShadow = true
    parent.add(m)
  }
}

export function rock(parent, x, y, z, s = 1, rand = Math.random) {
  const m = new Mesh(new DodecahedronGeometry(1, 0), materials().rock)
  m.scale.set(s * (1 + rand() * 0.5), s * (0.7 + rand() * 0.4), s * (1 + rand() * 0.4))
  m.rotation.set(rand(), rand() * 3, rand())
  m.position.set(x, y + s * 0.4, z)
  m.castShadow = true
  parent.add(m)
}

export function hayBale(parent, x, y, z, yaw = 0) {
  const M = materials()
  const g = new Group()
  addBox(g, 3, 1.4, 1.6, [M.hayEnd, M.hayEnd, M.hay, M.hay, M.hay, M.hay], 0, 0.7, 0)
  addBox(g, 2.6, 1.3, 1.5, [M.hayEnd, M.hayEnd, M.hay, M.hay, M.hay, M.hay], 0.3, 2.05, 0.05).rotation.y = 0.08
  g.position.set(x, y, z)
  g.rotation.y = yaw
  parent.add(g)
}

// A floating sky island: studded grass top, stepped stone underneath, a tree.
function floatingIsland(parent, x, y, z, s, rand, waterfalls) {
  const M = materials()
  const g = new Group()
  const w = 9 * s
  const d = 7 * s
  addBox(g, w, 1.4 * s, d, topStuds(M.grass, M.dirt), 0, -0.7 * s, 0)
  addBox(g, w * 0.8, 1.8 * s, d * 0.8, M.stone, 0.3 * s, -2.3 * s, 0.2 * s)
  addBox(g, w * 0.55, 2 * s, d * 0.55, M.stoneDark, -0.4 * s, -4.2 * s, -0.2 * s)
  addBox(g, w * 0.3, 2.2 * s, d * 0.3, M.stone, 0.2 * s, -6.2 * s, 0.1 * s)
  if (rand() < 0.5) pine(g, (rand() - 0.5) * w * 0.4, 0, (rand() - 0.5) * d * 0.4, 0.8 * s, rand)
  else broadleaf(g, (rand() - 0.5) * w * 0.3, 0, (rand() - 0.5) * d * 0.3, 0.6 * s, rand)
  g.position.set(x, y, z)
  g.rotation.y = rand() * Math.PI
  parent.add(g)
  if (waterfalls) {
    const fall = new Mesh(new PlaneGeometry(1.4 * s, 60), waterfalls)
    fall.position.set(x + w * 0.42, y - 30, z)
    fall.rotation.y = Math.PI / 2
    parent.add(fall)
  }
}

export function buildNature(scene) {
  const rand = mulberry32(4242)
  const M = materials()
  const statics = new Group()
  const I = LOBBY.island
  const R = LOBBY.runway
  const P = LOBBY.plaza

  // Trees beyond the fence on the west, south and east grass.
  const ring = []
  for (let z = P.minZ + 4; z < I.maxZ - 2; z += 7 + rand() * 3) ring.push([I.minX + 3 + rand() * 9, z])
  for (let x = P.minX + 2; x < I.maxX - 4; x += 8 + rand() * 4) ring.push([x, P.maxZ + 6 + rand() * 16])
  for (let z = P.minZ + 3; z < P.maxZ; z += 8 + rand() * 4) ring.push([P.maxX + 4 + rand() * 9, z])
  const tower = LOBBY.tower
  for (const [x, z] of ring) {
    if (Math.hypot(x - tower.x, z - tower.z) < tower.radius + 5) continue
    const s = 1.2 + rand() * 0.5
    if (rand() < 0.55) pine(statics, x, 0, z, s, rand)
    else broadleaf(statics, x, 0, z, s, rand)
  }
  // Bushes along the fences.
  for (let i = 0; i < 26; i++) {
    const side = i % 3
    if (side === 0) bush(statics, P.minX - 2 - rand() * 3, 0, P.minZ + rand() * (P.maxZ - P.minZ), 1, rand)
    else if (side === 1) bush(statics, P.minX + rand() * (P.maxX - P.minX), 0, P.maxZ + 2 + rand() * 3, 1, rand)
    else bush(statics, P.maxX + 2 + rand() * 3, 0, P.minZ + rand() * (P.maxZ - P.minZ), 1, rand)
  }

  // Runway banks: trees, hay bales, rocks, bushes.
  const north = -30 - R.length
  for (let z = -36; z > north + 10; z -= 9 + rand() * 6) {
    const lx = R.minX - 4 - rand() * 8
    if (rand() < 0.5) broadleaf(statics, lx, R.bankHeight, z, 0.9 + rand() * 0.3, rand)
    else hayBale(statics, R.minX - 4 - rand() * 4, R.bankHeight, z - 3, rand() * 0.4)
    pine(statics, R.minX - 20 - rand() * 12, R.upperBankHeight, z + rand() * 4, 0.9 + rand() * 0.4, rand)
    const rx = R.maxX + 5 + rand() * 10
    if (rand() < 0.6) pine(statics, rx, R.bankHeight, z, 0.9 + rand() * 0.4, rand)
    else broadleaf(statics, rx, R.bankHeight, z, 0.9, rand)
    if (rand() < 0.6) rock(statics, R.maxX + 3 + rand() * 3, R.bankHeight, z - 4, 0.9 + rand() * 0.6, rand)
    if (rand() < 0.6) bush(statics, R.minX - 2 - rand() * 2, R.bankHeight, z + 4, 0.9, rand)
    if (rand() < 0.4) hayBale(statics, R.maxX + 6 + rand() * 4, R.bankHeight, z + 3, rand())
  }
  // The bank wall behind the glitch booth: hay bales on top (west view).
  hayBale(statics, -10, R.bankHeight, -33, 0.15)
  hayBale(statics, -24, R.bankHeight, -34, -0.1)
  hayBale(statics, 26, R.bankHeight, -34, 0.2)

  // Windmill on the upper west bank.
  windmillStatic(statics, LOBBY.windmill.x, R.upperBankHeight, LOBBY.windmill.z)

  // Floating islands, every third one with a waterfall.
  const fallTex = toTexture(paintWaterfall(), { srgb: true })
  fallTex.wrapS = fallTex.wrapT = RepeatWrapping
  fallTex.repeat.set(1, 6)
  const fallMat = new MeshStandardMaterial({ map: fallTex, transparent: true, opacity: 0.8, side: DoubleSide, emissive: '#3ab6ff', emissiveIntensity: 0.4, depthWrite: false })
  LOBBY.floatingIslands.forEach(([x, y, z, s], i) => floatingIsland(statics, x, y, z, s, rand, i % 3 === 0 ? fallMat : null))

  // Colliders for tree trunks near walkable areas.
  for (const [x, z] of ring) solidPole(0.6, 6, x, z)

  const baked = bake(statics, true)
  baked.traverse((o) => (o.receiveShadow = true))
  // Waterfall material is transparent: keep it out of shadows.
  baked.traverse((o) => {
    if (o.material === fallMat) o.castShadow = false
  })
  scene.add(baked)
  return {
    update(dt, t) {
      fallTex.offset.y = t * 1.2
    },
  }
}

function windmillStatic(parent, x, y, z) {
  const g = new Group()
  const white = plain('#f4f4f2', 0.6)
  const red = plain('#e8231c', 0.5)
  const body = new Mesh(new CylinderGeometry(2.2, 3.4, 12, 8), white)
  body.position.y = 6
  body.castShadow = true
  g.add(body)
  const roof = new Mesh(new CylinderGeometry(0.2, 3, 3.4, 8), red)
  roof.position.y = 13.7
  g.add(roof)
  // Sails (static here; the hub spins a copy in lobby.js? kept static to bake).
  const hub = new Group()
  hub.position.set(0, 11.5, 2.6)
  for (let i = 0; i < 4; i++) {
    const arm = new Group()
    addBox(arm, 0.3, 7, 0.2, plain('#8a5a2e', 0.8), 0, 3.5, 0)
    addBox(arm, 1.8, 5.6, 0.1, red, 0.9, 4.2, 0.05)
    arm.rotation.z = (i / 4) * Math.PI * 2 + 0.4
    hub.add(arm)
  }
  g.add(hub)
  g.position.set(x, y, z)
  g.rotation.y = 0.6
  parent.add(g)
}

export function lighthouse(parent, x, y, z) {
  const g = new Group()
  const red = plain('#e8231c', 0.5)
  const white = plain('#fafafa', 0.5)
  for (let i = 0; i < 6; i++) {
    const m = new Mesh(new CylinderGeometry(1.6 - i * 0.12, 1.72 - i * 0.12, 2, 12), i % 2 ? white : red)
    m.position.y = 1 + i * 2
    m.castShadow = true
    g.add(m)
  }
  const lamp = new Mesh(new CylinderGeometry(1.1, 1.1, 1.4, 10), plain('#ffe680', 0.3, { emissive: '#ffd84a', emissiveIntensity: 0.8 }))
  lamp.position.y = 12.7
  g.add(lamp)
  const cap = new Mesh(new CylinderGeometry(0.2, 1.5, 1.6, 10), red)
  cap.position.y = 14.2
  g.add(cap)
  g.position.set(x, y, z)
  parent.add(g)
}

export function umbrella(parent, x, y, z) {
  const g = new Group()
  const pole = new Mesh(new CylinderGeometry(0.08, 0.08, 3, 6), plain('#ffffff'))
  pole.position.y = 1.5
  g.add(pole)
  const cols = ['#ff4a4a', '#ffd23a', '#3ab0ff', '#ffffff', '#ff4a4a', '#ffd23a', '#3ab0ff', '#ffffff']
  cols.forEach((col, i) => {
    const m = new Mesh(new CylinderGeometry(0.05, 2.2, 0.8, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), plain(col, 0.5, { side: DoubleSide }))
    m.position.y = 3.1
    g.add(m)
  })
  g.position.set(x, y, z)
  parent.add(g)
}
