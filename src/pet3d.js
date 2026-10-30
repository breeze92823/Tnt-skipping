import { BoxGeometry, Color, Group, Mesh, MeshStandardMaterial } from 'three'
import { PET_KINDS } from './config.js'

// Pets in the world: the cube critters of the pet portraits (pets.js) as little 3D models that
// hop after their owner. Used for the local player and for every remote player. Geometry and
// materials are shared and cached, so a full room of pets costs a handful of draw calls each
// and no allocations per frame.

const SIZE = 0.62 // body cube, m
const box = (w, h, d) => new BoxGeometry(w, h, d)
const GEO = {
  body: box(SIZE, SIZE * 0.92, SIZE),
  eye: box(0.07, 0.1, 0.04),
  ear: box(0.13, 0.26, 0.1),
  nub: box(0.14, 0.14, 0.14),
  horn: box(0.09, 0.3, 0.09),
  wing: box(0.34, 0.24, 0.05),
  snout: box(0.22, 0.14, 0.12),
  mane: box(SIZE * 1.3, SIZE * 1.3, 0.14),
}
const mats = new Map()
function material(color, variant, glow = 0) {
  const key = `${color}|${variant}|${glow}`
  let m = mats.get(key)
  if (m) return m
  const c = new Color(color)
  m = new MeshStandardMaterial({ color: c, roughness: 0.55, metalness: variant === 'normal' ? 0 : 0.35 })
  if (variant === 'golden') {
    m.color.set('#ffc21a')
    m.emissive.set('#a86a00')
    m.emissiveIntensity = 0.45
  } else if (variant === 'diamond') {
    m.color.set('#9fe8ff')
    m.emissive.set('#2a90d8')
    m.emissiveIntensity = 0.55
  } else if (variant === 'exclusive') {
    m.emissive.set('#c86aff')
    m.emissiveIntensity = 0.4
  } else if (glow) {
    m.emissive.set(c)
    m.emissiveIntensity = glow
  }
  mats.set(key, m)
  return m
}
const INK = material('#16131f', 'normal')

// What stands on / beside the head per `look` (config PET_KINDS): ears, horns, wings...
const TOPPERS = {
  bunny: (g, b) => [part(g, GEO.ear, b, -0.17, 0.5, 0), part(g, GEO.ear, b, 0.17, 0.5, 0)],
  fox: (g, b) => [part(g, GEO.nub, b, -0.22, 0.38, 0), part(g, GEO.nub, b, 0.22, 0.38, 0)],
  goggles: (g, b) => [part(g, GEO.nub, b, -0.22, 0.38, 0), part(g, GEO.nub, b, 0.22, 0.38, 0)],
  raccoon: (g, b) => [part(g, GEO.nub, b, -0.22, 0.38, 0), part(g, GEO.nub, b, 0.22, 0.38, 0)],
  panda: (g, b, a) => [part(g, GEO.nub, a, -0.25, 0.36, 0), part(g, GEO.nub, a, 0.25, 0.36, 0)],
  pig: (g, b, a) => [part(g, GEO.nub, a, -0.2, 0.36, 0), part(g, GEO.nub, a, 0.2, 0.36, 0)],
  frog: (g, b) => [part(g, GEO.nub, b, -0.2, 0.36, 0.05), part(g, GEO.nub, b, 0.2, 0.36, 0.05)],
  rooster: (g, b, a) => [part(g, GEO.nub, a, 0, 0.4, 0)],
  horn: (g, b, a) => [part(g, GEO.horn, material('#ffd23a', 'normal', 0.3), 0, 0.5, 0.04), part(g, GEO.nub, a, -0.22, 0.34, 0)],
  dragon: (g, b, a) => [part(g, GEO.horn, material('#ffd23a', 'normal', 0.3), -0.15, 0.46, 0), part(g, GEO.horn, material('#ffd23a', 'normal', 0.3), 0.15, 0.46, 0), part(g, GEO.wing, a, -0.42, 0.05, -0.12), part(g, GEO.wing, a, 0.42, 0.05, -0.12)],
  phoenix: (g, b, a) => [part(g, GEO.horn, a, 0, 0.5, 0), part(g, GEO.wing, a, -0.44, 0.05, -0.1), part(g, GEO.wing, a, 0.44, 0.05, -0.1)],
  lion: (g, b, a) => [part(g, GEO.mane, a, 0, 0.02, -0.12), part(g, GEO.nub, material('#ffd23a', 'normal', 0.4), 0, 0.42, 0.02)],
  miner: (g) => [part(g, GEO.nub, material('#ffc21a', 'normal', 0.2), 0, 0.4, 0)],
}

function part(group, geo, mat, x, y, z) {
  const m = new Mesh(geo, mat)
  m.position.set(x, y, z)
  group.add(m)
  return m
}

const cache = new Map()
// A pet's model; `kind` is a PET_KINDS key, `variant` normal / golden / diamond / exclusive.
export function buildPet(kind, variant = 'normal') {
  const k = PET_KINDS[kind] ?? PET_KINDS.minerHamster
  const body = material(k.body, variant)
  const accent = material(k.accent, variant)
  const g = new Group()
  const inner = new Group() // the hop squashes this, the owner-facing yaw turns the outer one
  g.add(inner)
  part(inner, GEO.body, body, 0, 0, 0)
  part(inner, GEO.eye, INK, -0.14, 0.04, SIZE / 2)
  part(inner, GEO.eye, INK, 0.14, 0.04, SIZE / 2)
  part(inner, GEO.snout, k.look === 'pig' ? accent : body, 0, -0.1, SIZE / 2 + 0.02)
  TOPPERS[k.look]?.(inner, body, accent)
  inner.position.y = SIZE * 0.46
  g.userData.inner = inner
  return g
}

// "foxy:golden,panda:normal" (the roster's `pets`) -> [{ kind, variant }]
export function parsePets(s) {
  if (!s) return []
  return s.split(',').map((x) => {
    const [kind, variant] = x.split(':')
    return { kind, variant: variant || 'normal' }
  })
}

const SPREAD = 0.95 // m between pets in the trailing arc
// Pets that follow an owner: setPets([{ kind, variant }]) rebuilds only on change; update() eases
// each toward its slot behind the owner and hops it. Models are cached per kind+variant, so
// several owners (or several pets of one kind) share nothing but geometry and materials.
export function createPetFollowers(scene, { max = 3 } = {}) {
  const root = new Group()
  scene.add(root)
  let key = ''
  let pets = [] // { group, x, y, z, phase }
  const clear = () => {
    for (const p of pets) root.remove(p.group)
    pets = []
  }
  return {
    get count() {
      return pets.length
    },
    setPets(list) {
      const next = list.slice(0, max)
      const k = next.map((p) => `${p.kind}:${p.variant}`).join(',')
      if (k === key) return
      key = k
      clear()
      next.forEach((p, i) => {
        const group = buildPet(p.kind, p.variant)
        group.visible = false
        root.add(group)
        pets.push({ group, x: 0, y: 0, z: 0, phase: i * 1.7, placed: false })
      })
    },
    setVisible(on) {
      root.visible = on
    },
    // Owner feet position + heading (yaw: facing = sin, cos).
    update(dt, t, x, y, z, yaw, moving = 0) {
      if (!root.visible || !pets.length) return
      const n = pets.length
      const sx = Math.sin(yaw)
      const sz = Math.cos(yaw)
      for (let i = 0; i < n; i++) {
        const p = pets[i]
        // Slots in an arc behind the owner: back 1.5 m, spread to either side.
        const side = (i - (n - 1) / 2) * SPREAD
        const tx = x - sx * 1.5 + sz * side
        const tz = z - sz * 1.5 - sx * side
        const far = Math.hypot(tx - p.x, tz - p.z) > 14
        const k = p.placed && !far ? 1 - Math.exp(-6 * dt) : 1
        const px = p.x
        const pz = p.z
        p.x += (tx - p.x) * k
        p.z += (tz - p.z) * k
        p.y += (y - p.y) * (p.placed ? 1 - Math.exp(-10 * dt) : 1)
        p.placed = true
        const speed = dt > 0 ? Math.hypot(p.x - px, p.z - pz) / dt : 0
        const hop = Math.max(0, Math.sin(t * (speed > 0.5 ? 9 : 2.4) + p.phase)) * (speed > 0.5 ? 0.32 : 0.06)
        const g = p.group
        g.visible = true
        g.position.set(p.x, p.y + hop, p.z)
        g.rotation.y = Math.atan2(x - p.x + sx * 2, z - p.z + sz * 2) // looks where the owner looks
        const squash = 1 + (hop > 0.05 ? 0.12 : -Math.sin(t * 2.4 + p.phase) * 0.03)
        g.userData.inner.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash))
      }
    },
    dispose() {
      clear()
      scene.remove(root)
    },
  }
}
