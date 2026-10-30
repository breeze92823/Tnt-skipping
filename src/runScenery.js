import { ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry, TorusGeometry } from 'three'
import { LOBBY, RUN } from './config.js'
import { bake } from './bake.js'
import { mulberry32 } from './textures.js'
import { addBox, holed, plain, sign, studMat, topStuds } from './lobby/kit.js'
import { lighthouse, palm, rock, umbrella } from './lobby/nature.js'
import { pirateDress } from './lobby/pirate.js'

// The lane past the lobby's green stretch (a world's zones): each zone is its own floor, dirt
// banks with a coloured stripe and props on the banks, baked to a few meshes and only
// shown near the focus (run.js stream). A floating sign announces every zone from before
// its start, with the next one's name under it. The last zone ends at a cliff.

const R = LOBBY.runway
const CX = (R.minX + R.maxX) / 2
const WIDTH = R.maxX - R.minX
const BANK = R.bankWidth
export const laneZ = (d) => RUN.z0 - d

let voxel = null
function voxels() {
  voxel ??= {
    cactus: topStuds(studMat('#2fa83a'), plain('#25902f', 0.7)),
    mesaA: studMat('#d8743a', { rough: 0.8 }),
    mesaB: studMat('#e8924a', { rough: 0.8 }),
    trunk: plain('#5e3719', 0.9),
    maple: [studMat('#e8481c', { rough: 0.7 }), studMat('#ff8a1e', { rough: 0.7 }), studMat('#ffc21a', { rough: 0.7 })],
    pumpkin: plain('#f08a1e', 0.6),
    stem: plain('#3a7a2a', 0.8),
    crate: plain('#b07a43', 0.8),
    tntRed: plain('#d9221a', 0.55),
    rope: plain('#3b2f25', 0.9),
    ice: [plain('#bfeaff', 0.25), plain('#8fd4f6', 0.25), plain('#e8f8ff', 0.3)],
    snow: plain('#ffffff', 0.85),
    pineDark: plain('#2f6a58', 0.8),
    carrot: plain('#ff8a1e', 0.6),
    coal: plain('#22222a', 0.7),
    capRed: plain('#e8324a', 0.6),
    capPurple: plain('#b05ae8', 0.6),
    capBlue: plain('#3ac8e8', 0.6),
    stalk: plain('#f2e8d0', 0.8),
    dot: plain('#fff6e0', 0.7),
    lily: plain('#2fae62', 0.7),
    sweets: [plain('#ff5aa8', 0.35), plain('#5ae0ff', 0.35), plain('#ffe14a', 0.35), plain('#8ae85a', 0.35), plain('#c88aff', 0.35)],
    candyWhite: plain('#fff4f8', 0.35),
    candyRed: plain('#e8324a', 0.35),
    stick: plain('#f4e8d8', 0.6),
    crystals: [plain('#b48aff', 0.15, { emissive: '#6a2ad8', emissiveIntensity: 0.5 }), plain('#6ef0ff', 0.15, { emissive: '#1a8ab8', emissiveIntensity: 0.5 }), plain('#ff8ad8', 0.15, { emissive: '#b82a8a', emissiveIntensity: 0.5 })],
    cave: plain('#3a2878', 0.9, { flatShading: true }),
    grave: plain('#8a8698', 0.9),
    graveDark: plain('#5e5a6c', 0.9),
    deadwood: plain('#2e2630', 0.9),
    ghost: new MeshBasicMaterial({ color: '#e8ffd8' }),
    lantern: new MeshBasicMaterial({ color: '#b8ff6a' }),
    obsidian: plain('#1e1a22', 0.5, { flatShading: true }),
    lava: new MeshBasicMaterial({ color: '#ff6a1a' }),
    lavaHot: new MeshBasicMaterial({ color: '#ffd24a' }),
    iron: plain('#4a4650', 0.5),
    towers: [plain('#20204a', 0.5), plain('#2a1a4a', 0.5), plain('#14304a', 0.5)],
    lights: [new MeshBasicMaterial({ color: '#ff3ad8' }), new MeshBasicMaterial({ color: '#3af0ff' }), new MeshBasicMaterial({ color: '#ffe14a' })],
    cloud: plain('#ffffff', 0.9),
    cloudShade: plain('#dce6ff', 0.9),
    gold: plain('#ffcf3a', 0.3, { metalness: 0.4 }),
    moonrock: plain('#5a5e78', 0.95, { flatShading: true }),
    rocket: plain('#f4f5f7', 0.4),
    rocketRed: plain('#e8323a', 0.4),
    planet: [plain('#ff9a4a', 0.7), plain('#5a8aff', 0.7), plain('#c86aff', 0.7)],
    ring: plain('#ffe9a0', 0.5),
  }
  return voxel
}

// One mesh of a shared geometry at a spot, `sx`/`sy` scaling it (the bake merges them).
const geos = {}
function shape(g, kind, mat, x, y, z, sx, sy = sx, tilt = 0) {
  geos.cone ??= new ConeGeometry(1, 1, 6)
  geos.cyl ??= new CylinderGeometry(1, 1, 1, 8)
  geos.ball ??= new SphereGeometry(1, 10, 8)
  geos.ring ??= new TorusGeometry(1, 0.12, 6, 18)
  const m = new Mesh(geos[kind], mat)
  m.position.set(x, y, z)
  m.scale.set(sx, sy, sx)
  m.rotation.z = tilt
  m.castShadow = true
  g.add(m)
  return m
}

function cactus(g, x, y, z, s, rand) {
  const M = voxels()
  addBox(g, 0.9 * s, 4.4 * s, 0.9 * s, M.cactus, x, y + 2.2 * s, z)
  for (const side of [-1, 1]) {
    if (rand() < 0.25) continue
    const h = (1.6 + rand() * 1.6) * s
    const up = (1.6 + rand() * 1.2) * s
    addBox(g, 1.2 * s, 0.7 * s, 0.7 * s, M.cactus, x + side * 0.9 * s, y + up, z)
    addBox(g, 0.7 * s, h, 0.7 * s, M.cactus, x + side * 1.4 * s, y + up + h / 2, z)
  }
}

function mesa(g, x, y, z, s, rand) {
  const M = voxels()
  let w = (9 + rand() * 6) * s
  let d = (8 + rand() * 5) * s
  let yy = y
  const tiers = 3 + Math.floor(rand() * 2)
  for (let i = 0; i < tiers; i++) {
    const h = (2.6 + rand() * 2) * s
    addBox(g, w, h, d, i % 2 ? M.mesaA : M.mesaB, x, yy + h / 2, z)
    yy += h
    w *= 0.72
    d *= 0.72
  }
}

function dynamiteStack(g, x, y, z, rand) {
  const M = voxels()
  addBox(g, 3, 1.6, 3, M.crate, x, y + 0.8, z)
  for (let i = 0; i < 3; i++) addBox(g, 0.5, 1.5, 0.5, M.tntRed, x - 0.7 + i * 0.7, y + 2.3, z + (rand() - 0.5) * 0.6)
  addBox(g, 0.1, 0.5, 0.1, M.rope, x, y + 3.2, z)
}

function maple(g, x, y, z, s, rand) {
  const M = voxels()
  addBox(g, 1 * s, 5.4 * s, 1 * s, M.trunk, x, y + 2.7 * s, z)
  for (let i = 0; i < 5; i++) {
    const w = (3 + rand() * 2.8) * s
    const m = addBox(g, w, (1.3 + rand()) * s, w * 0.9, M.maple[i % 3], x + (rand() - 0.5) * 3.4 * s, y + (5.2 + rand() * 2.6) * s, z + (rand() - 0.5) * 3.2 * s)
    m.rotation.set((rand() - 0.5) * 0.25, rand(), (rand() - 0.5) * 0.25)
  }
}

function pumpkin(g, x, y, z, s) {
  const M = voxels()
  const body = new Mesh(new SphereGeometry(0.9 * s, 10, 8), M.pumpkin)
  body.scale.y = 0.78
  body.position.set(x, y + 0.7 * s, z)
  body.castShadow = true
  g.add(body)
  const stem = new Mesh(new ConeGeometry(0.16 * s, 0.5 * s, 5), M.stem)
  stem.position.set(x, y + 1.5 * s, z)
  g.add(stem)
}

function iceSpire(g, x, y, z, s, rand) {
  const M = voxels()
  for (let i = 0; i < 3; i++) {
    const h = (5 + rand() * 7) * s
    shape(g, 'cone', M.ice[i], x + (rand() - 0.5) * 3 * s, y + h / 2, z + (rand() - 0.5) * 3 * s, (1 + rand()) * s, h, (rand() - 0.5) * 0.2)
  }
}

function snowPine(g, x, y, z, s) {
  const M = voxels()
  addBox(g, 0.8 * s, 2 * s, 0.8 * s, M.trunk, x, y + s, z)
  for (let i = 0; i < 3; i++) {
    shape(g, 'cone', M.pineDark, x, y + (3 + i * 2) * s, z, (3 - i * 0.7) * s, 3 * s)
    shape(g, 'cone', M.snow, x, y + (3.7 + i * 2) * s, z, (2 - i * 0.5) * s, 1.7 * s)
  }
}

function snowman(g, x, y, z, s) {
  const M = voxels()
  shape(g, 'ball', M.snow, x, y + 1.1 * s, z, 1.3 * s)
  shape(g, 'ball', M.snow, x, y + 2.8 * s, z, 0.95 * s)
  shape(g, 'ball', M.snow, x, y + 4.1 * s, z, 0.7 * s)
  shape(g, 'cone', M.carrot, x, y + 4.1 * s, z + 0.85 * s, 0.14 * s, 0.7 * s).rotation.x = -Math.PI / 2
  addBox(g, 1.5 * s, 0.14 * s, 1.5 * s, M.coal, x, y + 4.7 * s, z)
  addBox(g, 0.9 * s, 0.7 * s, 0.9 * s, M.coal, x, y + 5.1 * s, z)
}

function mushroom(g, x, y, z, s, rand) {
  const M = voxels()
  const h = (3 + rand() * 4) * s
  const cap = [M.capRed, M.capPurple, M.capBlue][Math.floor(rand() * 3)]
  shape(g, 'cyl', M.stalk, x, y + h / 2, z, 0.6 * s, h)
  shape(g, 'ball', cap, x, y + h, z, 3 * s, 1.5 * s)
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2
    shape(g, 'ball', M.dot, x + Math.cos(a) * 1.9 * s, y + h + 0.95 * s, z + Math.sin(a) * 1.9 * s, 0.42 * s, 0.25 * s)
  }
}

function lollipop(g, x, y, z, s, rand) {
  const M = voxels()
  const h = (5 + rand() * 4) * s
  shape(g, 'cyl', M.stick, x, y + h / 2, z, 0.2 * s, h)
  const c = Math.floor(rand() * 5)
  const a = shape(g, 'cyl', M.sweets[c], x, y + h + 1.7 * s, z, 2.2 * s, 0.5 * s)
  a.rotation.x = Math.PI / 2
  const b = shape(g, 'cyl', M.sweets[(c + 2) % 5], x, y + h + 1.7 * s, z + 0.06, 1.3 * s, 0.5 * s)
  b.rotation.x = Math.PI / 2
}

function candyCane(g, x, y, z, s) {
  const M = voxels()
  for (let i = 0; i < 7; i++) shape(g, 'cyl', i % 2 ? M.candyWhite : M.candyRed, x, y + (i + 0.5) * s, z, 0.42 * s, s)
  for (let i = 1; i < 6; i++) {
    const a = (i / 5) * Math.PI
    shape(g, 'ball', i % 2 ? M.candyRed : M.candyWhite, x + (1 - Math.cos(a)) * 0.9 * s, y + (7 + Math.sin(a) * 0.9) * s, z, 0.46 * s)
  }
}

function gumdrop(g, x, y, z, s, rand) {
  const M = voxels()
  for (let i = 0; i < 3; i++) shape(g, 'cone', M.sweets[Math.floor(rand() * 5)], x + (rand() - 0.5) * 6 * s, y + 1.2 * s, z + (rand() - 0.5) * 6 * s, (1.4 + rand()) * s, 2.4 * s)
}

function crystal(g, x, y, z, s, rand) {
  const M = voxels()
  const n = 3 + Math.floor(rand() * 3)
  const col = M.crystals[Math.floor(rand() * 3)]
  for (let i = 0; i < n; i++) {
    const h = (4 + rand() * 9) * s
    const m = shape(g, 'cone', col, x + (rand() - 0.5) * 3.4 * s, y + h / 2 - 0.4, z + (rand() - 0.5) * 3.4 * s, (0.8 + rand() * 0.9) * s, h, (rand() - 0.5) * 0.5)
    m.rotation.y = rand() * 3
  }
}

function caveRock(g, x, y, z, s, rand) {
  const h = (8 + rand() * 9) * s
  shape(g, 'cone', voxels().cave, x, y + h / 2, z, (5 + rand() * 3) * s, h)
}

function gravestone(g, x, y, z, s, rand) {
  const M = voxels()
  const mat = rand() < 0.5 ? M.grave : M.graveDark
  const tilt = (rand() - 0.5) * 0.25
  const m = addBox(g, 1.6 * s, 2.4 * s, 0.45 * s, mat, x, y + 1.2 * s, z)
  m.rotation.z = tilt
  addBox(g, 1.1 * s, 0.32 * s, 0.5 * s, M.graveDark, x, y + 2.5 * s, z).rotation.z = tilt
  addBox(g, 2.2 * s, 0.3 * s, 1.4 * s, M.graveDark, x, y + 0.15, z + 0.5 * s)
}

function deadTree(g, x, y, z, s, rand) {
  const M = voxels()
  const h = (6 + rand() * 3) * s
  shape(g, 'cyl', M.deadwood, x, y + h / 2, z, 0.5 * s, h)
  for (const side of [-1, 1]) {
    const up = (0.5 + rand() * 0.35) * h
    const len = (2 + rand() * 2) * s
    shape(g, 'cyl', M.deadwood, x + (side * len) / 2.4, y + up + len * 0.28, z, 0.2 * s, len, -side * 0.9)
  }
  if (rand() < 0.45) shape(g, 'ball', M.lantern, x, y + h + 0.3 * s, z, 0.55 * s)
}

function ghost(g, x, y, z, s) {
  const M = voxels()
  shape(g, 'cone', M.ghost, x, y + 4.6 * s, z, 1.2 * s, 3.2 * s)
  shape(g, 'ball', M.ghost, x, y + 6 * s, z, 0.95 * s)
}

function obsidianSpire(g, x, y, z, s, rand) {
  const M = voxels()
  const h = (9 + rand() * 12) * s
  shape(g, 'cone', M.obsidian, x, y + h / 2, z, (3 + rand() * 2) * s, h)
  shape(g, 'cone', M.lava, x, y + h - 1.4 * s, z, 0.9 * s, 3 * s).rotation.x = Math.PI
}

function lavaPool(g, x, y, z, s, rand) {
  const M = voxels()
  const r = (4 + rand() * 3) * s
  shape(g, 'cyl', M.obsidian, x, y + 0.15, z, r + 0.9, 0.5)
  shape(g, 'cyl', M.lava, x, y + 0.3, z, r, 0.5)
  shape(g, 'cyl', M.lavaHot, x + rand() - 0.5, y + 0.34, z, r * 0.45, 0.5)
}

function anvil(g, x, y, z, s) {
  const M = voxels()
  addBox(g, 2.6 * s, 0.6 * s, 1.5 * s, M.iron, x, y + 0.3 * s, z)
  addBox(g, 1.1 * s, 1.1 * s, 0.9 * s, M.iron, x, y + 1.1 * s, z)
  addBox(g, 3.6 * s, 0.8 * s, 1.3 * s, M.iron, x, y + 2 * s, z)
}

function neonTower(g, x, y, z, s, rand) {
  const M = voxels()
  const w = (5 + rand() * 4) * s
  const h = (16 + rand() * 26) * s
  const glow = M.lights[Math.floor(rand() * 3)]
  addBox(g, w, h, w, M.towers[Math.floor(rand() * 3)], x, y + h / 2, z)
  for (let yy = 3 * s; yy < h - 2; yy += (3 + Math.floor(rand() * 2)) * s) addBox(g, w + 0.16, 0.34 * s, w + 0.16, glow, x, y + yy, z, { shadow: false })
  addBox(g, 0.3 * s, 5 * s, 0.3 * s, M.lights[Math.floor(rand() * 3)], x, y + h + 2.5 * s, z, { shadow: false })
}

function neonArch(g, x, y, z, s, rand) {
  const m = shape(g, 'ring', voxels().lights[Math.floor(rand() * 3)], x, y + 5 * s, z, 4.5 * s)
  m.rotation.y = Math.PI / 2
}

function cloudPuff(g, x, y, z, s, rand) {
  const M = voxels()
  for (let i = 0; i < 5; i++) {
    const r = (1.6 + rand() * 2) * s
    shape(g, 'ball', i % 3 ? M.cloud : M.cloudShade, x + (rand() - 0.5) * 8 * s, y + 0.8 * s + rand() * 1.6 * s, z + (rand() - 0.5) * 6 * s, r, r * 0.72)
  }
}

function goldColumn(g, x, y, z, s) {
  const M = voxels()
  addBox(g, 3.4 * s, 0.8 * s, 3.4 * s, M.gold, x, y + 0.4 * s, z)
  shape(g, 'cyl', M.cloud, x, y + 6 * s, z, 1.05 * s, 10.5 * s)
  addBox(g, 3.4 * s, 0.8 * s, 3.4 * s, M.gold, x, y + 11.6 * s, z)
}

function crater(g, x, y, z, s, rand) {
  const M = voxels()
  const r = (3 + rand() * 4) * s
  const m = shape(g, 'ring', M.moonrock, x, y + 0.2, z, r, r)
  m.rotation.x = Math.PI / 2
  m.scale.z = 3
}

function rocket(g, x, y, z, s) {
  const M = voxels()
  shape(g, 'cyl', M.rocket, x, y + 6 * s, z, 1.7 * s, 10 * s)
  shape(g, 'cone', M.rocketRed, x, y + 12.5 * s, z, 1.7 * s, 3 * s)
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) addBox(g, 1.8 * s, 3 * s, 0.26 * s, M.rocketRed, x + Math.cos(a) * 2 * s, y + 1.8 * s, z + Math.sin(a) * 2 * s, { rotY: -a })
}

function planet(g, x, y, z, s, rand) {
  const M = voxels()
  const r = (5 + rand() * 7) * s
  const h = y + 24 + rand() * 30
  shape(g, 'ball', M.planet[Math.floor(rand() * 3)], x, h, z, r)
  if (rand() < 0.6) {
    const m = shape(g, 'ring', M.ring, x, h, z, r * 1.7, r * 1.7)
    m.rotation.x = 1.25
  }
}

// Props in one lane-side strip at metre d. side -1 = west bank, 1 = east bank.
const dress = {
  cove(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.62) palm(g, x, y, z, 1 + rand() * 0.5, rand)
    else if (r < 0.82) umbrella(g, x + side * 2, y, z)
    else rock(g, x, y, z, 1.2 + rand() * 1.2, rand)
    if (rand() < 0.5) rock(g, x + side * (10 + rand() * 12), y, z + rand() * 6, 1.4 + rand() * 2, rand)
  },
  dunes(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.5) cactus(g, x, y, z, 0.9 + rand() * 0.5, rand)
    else if (r < 0.72) dynamiteStack(g, x, y, z, rand)
    else rock(g, x, y, z, 1 + rand(), rand)
    if (rand() < 0.3) mesa(g, x + side * (20 + rand() * 12), y, z, 1 + rand() * 0.6, rand)
  },
  maple(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.7) maple(g, x, y, z, 1 + rand() * 0.5, rand)
    else if (r < 0.88) pumpkin(g, x, y, z, 0.9 + rand() * 0.7)
    else rock(g, x, y, z, 1 + rand(), rand)
    if (rand() < 0.5) maple(g, x + side * (12 + rand() * 16), y, z, 1.2 + rand() * 0.6, rand)
  },
  frost(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.45) snowPine(g, x, y, z, 1 + rand() * 0.5)
    else if (r < 0.8) iceSpire(g, x, y, z, 1 + rand() * 0.6, rand)
    else snowman(g, x, y, z, 0.9 + rand() * 0.4)
    if (rand() < 0.5) iceSpire(g, x + side * (14 + rand() * 16), y, z, 1.8 + rand(), rand)
  },
  marsh(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.7) mushroom(g, x, y, z, 1 + rand() * 0.7, rand)
    else if (r < 0.88) shape(g, 'cyl', voxels().lily, x, y + 0.1, z, 2 + rand() * 2.4, 0.2)
    else rock(g, x, y, z, 1 + rand(), rand)
    if (rand() < 0.5) mushroom(g, x + side * (13 + rand() * 16), y, z, 1.8 + rand(), rand)
  },
  candy(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.42) lollipop(g, x, y, z, 1 + rand() * 0.6, rand)
    else if (r < 0.72) candyCane(g, x, y, z, 0.9 + rand() * 0.6)
    else gumdrop(g, x, y, z, 1 + rand() * 0.7, rand)
    if (rand() < 0.45) gumdrop(g, x + side * (14 + rand() * 14), y, z, 2 + rand(), rand)
  },
  crystal(g, x, y, z, side, rand) {
    if (rand() < 0.7) crystal(g, x, y, z, 0.9 + rand() * 0.6, rand)
    else caveRock(g, x, y, z, 0.8 + rand() * 0.4, rand)
    if (rand() < 0.55) caveRock(g, x + side * (15 + rand() * 15), y, z, 1.3 + rand() * 0.7, rand)
    if (rand() < 0.4) crystal(g, x + side * (11 + rand() * 10), y, z + rand() * 6, 1.5 + rand(), rand)
  },
  graves(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.55) for (let i = 0; i < 3; i++) gravestone(g, x + (i - 1) * 3.4, y, z + (rand() - 0.5) * 5, 0.9 + rand() * 0.4, rand)
    else if (r < 0.85) deadTree(g, x, y, z, 1 + rand() * 0.5, rand)
    else pumpkin(g, x, y, z, 1 + rand())
    if (rand() < 0.35) ghost(g, x + side * (6 + rand() * 12), y, z + rand() * 5, 1 + rand() * 0.4)
    if (rand() < 0.45) deadTree(g, x + side * (13 + rand() * 15), y, z, 1.5 + rand() * 0.6, rand)
  },
  ember(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.5) obsidianSpire(g, x, y, z, 0.9 + rand() * 0.5, rand)
    else if (r < 0.82) lavaPool(g, x, y, z, 1 + rand() * 0.6, rand)
    else anvil(g, x, y, z, 1 + rand() * 0.4)
    if (rand() < 0.5) obsidianSpire(g, x + side * (15 + rand() * 15), y, z, 1.5 + rand() * 0.8, rand)
  },
  neon(g, x, y, z, side, rand) {
    if (rand() < 0.68) neonTower(g, x + side * 4, y, z, 0.8 + rand() * 0.5, rand)
    else neonArch(g, x, y, z, 0.8 + rand() * 0.5, rand)
    if (rand() < 0.75) neonTower(g, x + side * (18 + rand() * 12), y, z, 1.1 + rand() * 0.7, rand)
  },
  cloud(g, x, y, z, side, rand) {
    if (rand() < 0.68) cloudPuff(g, x, y, z, 1 + rand() * 0.7, rand)
    else goldColumn(g, x, y, z, 0.9 + rand() * 0.4)
    if (rand() < 0.6) cloudPuff(g, x + side * (14 + rand() * 14), y + rand() * 3, z, 1.7 + rand(), rand)
  },
  moon(g, x, y, z, side, rand) {
    const r = rand()
    if (r < 0.5) crater(g, x, y, z, 1 + rand() * 0.7, rand)
    else if (r < 0.78) rock(g, x, y, z, 1.2 + rand() * 1.4, rand)
    else rocket(g, x, y, z, 0.8 + rand() * 0.4)
    if (rand() < 0.3) planet(g, x + side * (20 + rand() * 40), y, z, 1 + rand() * 0.8, rand)
  },
  ...pirateDress,
}

function buildZone(zone, d0, d1, rand) {
  const g = new Group()
  const len = d1 - d0
  const spread = Math.max(1, len / (13.5 * RUN.propsPerBank)) // 13.5 m = the mean gap between props
  const cz = laneZ((d0 + d1) / 2)
  const wall = studMat(zone.wall, { rough: 0.85 })
  const H = R.bankHeight
  addBox(g, WIDTH, 6, len, topStuds(holed(studMat(zone.floor)), wall), CX, -3, cz, { shadow: false })
  const trim = studMat(zone.trim, { rough: 0.45 })
  const bankTop = studMat(zone.bank, { rough: 0.7 })
  for (const side of [-1, 1]) {
    const edge = side < 0 ? R.minX : R.maxX
    addBox(g, BANK, H + 6, len, topStuds(bankTop, wall), edge + (side * BANK) / 2, H - (H + 6) / 2, cz, { shadow: false })
    addBox(g, 0.24, 0.8, len, trim, edge, H * 0.62, cz, { shadow: false })
    for (let d = d0 + 4 + rand() * 6; d < d1 - 4; d += (9 + rand() * 9) * spread) dress[zone.props](g, edge + side * (5 + rand() * 13), H, laneZ(d), side, rand)
  }
  return g
}

export function buildZones(scene, Z = RUN.zones) {
  const zones = []
  for (let i = 1; i < Z.length; i++) {
    const zone = Z[i]
    const d0 = zone.start
    const d1 = Z[i + 1]?.start ?? RUN.length
    const built = buildZone(zone, d0, d1, mulberry32(310 + i))
    if (zone.props === 'cove') for (const side of [-1, 1]) lighthouse(built, side < 0 ? R.minX - 10 : R.maxX + 12, R.bankHeight, laneZ(d0 + (side < 0 ? 66 : 24)))
    if (!Z[i + 1]) addBox(built, WIDTH + BANK * 2, 34, 14, studMat(zone.wall, { rough: 0.85 }), CX, 11, laneZ(RUN.length + 7), { shadow: false })
    const group = bake(built, true)
    group.traverse((o) => {
      if (o.isMesh) o.receiveShadow = true
    })
    scene.add(group)

    const next = Z[i + 1]
    const lines = [{ text: zone.label, px: 120, color: zone.title.color, outline: zone.title.outline, outlineWidth: 18 }]
    if (next) lines.push({ text: next.label, px: 40, color: zone.sub, outline: zone.title.outline, outlineWidth: 8 })
    const label = sign(lines, next ? 11 : 8.5)
    label.position.set(CX, 7, laneZ(d0 - 34))
    scene.add(label)
    zones.push({ group, label, d0, d1 })
  }
  return zones
}
