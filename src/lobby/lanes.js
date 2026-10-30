import {
  AdditiveBlending,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import { LOBBY, TRAIN } from '../config.js'
import { RAPIER, world } from '../physics.js'
import { neon } from '../propkit.js'
import { mulberry32, paintCrate, paintLaneWater, paintPlanks, toTexture } from '../textures.js'
import { addBox, canvasTex, legoBox, localSolid, plain, resign, sign, studMat, topStuds } from './kit.js'
import { paintBullseye, paintHazard, paintLaneMat } from './paint.js'

// The skill training lanes east of spawn (seven side by side, each running
// east to a target wall with a crate pyramid), the red/yellow brick path that
// leads from spawn to lane 1.
const C = LOBBY.colors

const shade = (hex, k) => {
  const c = new Color(hex)
  c.multiplyScalar(k)
  return `#${c.getHexString()}`
}

// Per lane: its bank (startX, length) and centre z. Banks hold `count` lanes each
// (north to south) and every bank restarts at firstZ.
export function laneLayout() {
  const L = LOBBY.lanes
  const out = []
  let i = 0
  for (const bank of L.banks) {
    let z = L.firstZ
    for (let k = 0; k < bank.count; k++, i++) {
      const lane = L.list[i]
      out.push({ bank, zc: z + lane.width / 2 })
      z += lane.width + L.gap
    }
  }
  return out
}

// Rebirths a lane needs (ball lanes), or Infinity (Robux lanes: purchases come later).
export const laneRebirths = (lane) => (lane.icon === 'ball' ? Number(lane.req) : Infinity)
export const laneMultiplier = (lane) => parseFloat(lane.mult)

// Where a lane's pad is (the square a player stands on in front of the start) and where
// its TNT may land, in world metres.
export function lanePads() {
  const L = LOBBY.lanes
  const half = TRAIN.padSize / 2
  return laneLayout().map(({ bank, zc }, index) => {
    const lane = L.list[index]
    const cx = bank.startX - 0.8 - half
    return {
      index,
      lane,
      mul: laneMultiplier(lane),
      cx,
      cz: zc,
      half,
      land: { x0: bank.startX + bank.length * 0.5, x1: bank.startX + bank.length - 3.6, z: lane.width / 2 - 1.8, zc },
      surfaceY: 0.07 + 0.32 + 0.08,
    }
  })
}

// An invisible block nobody walks into (kinematic, so the camera's ray ignores it).
function blocker(hx, hy, hz, x, y, z) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z))
  world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz), body)
}

const signLines = (lane, unlocked) => {
  const lines = []
  if (lane.allWorlds) lines.push({ text: 'ALL WORLDS', px: 34, color: '#ffffff' })
  lines.push({ text: lane.req, px: 54, color: '#ffffff', pill: '#15151f', icon: lane.icon, outline: null })
  lines.push({ text: unlocked ? 'UNLOCKED' : 'LOCKED', px: 34, color: unlocked ? '#4dff5a' : '#ff3434' })
  lines.push({ text: lane.mult, px: 60, color: '#ffffff' })
  return lines
}
const signHeight = (lane) => (lane.allWorlds ? 7.4 : 6.4)

function buildLane(root, lane, { bank, zc }, index, waterTexs, glints, signs) {
  const L = LOBBY.lanes
  const g = new Group()
  g.position.set(bank.startX, 0.07, zc)
  const w = lane.width
  const len = bank.length
  const baseH = 0.32
  // Base slab in the rim colour (studs on top), the inset track, side edges.
  const rimTop = studMat(lane.rim, { rough: 0.45 })
  const rimSide = plain(shade(lane.rim, 0.8), 0.5)
  addBox(g, len, baseH, w, topStuds(rimTop, rimSide), len / 2, baseH / 2, 0)
  let trackMat
  if (lane.style === 'wood') {
    const p = paintPlanks(256, 5, 30 + index)
    trackMat = new MeshStandardMaterial({ map: toTexture(p.color, { repeat: 0.25, srgb: true }), normalMap: toTexture(p.normal, { repeat: 0.25 }), color: '#ffc08a', roughness: 0.7 })
  } else if (lane.style === 'water') {
    const tex = toTexture(paintLaneWater('#1f7bff'), { srgb: true })
    tex.repeat.set(0.4, 0.4)
    tex.rotation = Math.PI / 2
    waterTexs.push(tex)
    trackMat = new MeshStandardMaterial({ map: tex, roughness: 0.15, metalness: 0.1, emissive: '#0a3a8a', emissiveIntensity: 0.25 })
  } else if (lane.style === 'glass') {
    trackMat = new MeshStandardMaterial({ map: studMat(lane.track).map, normalMap: studMat(lane.track).normalMap, transparent: true, opacity: 0.82, roughness: 0.15, color: '#ffffff' })
  } else {
    trackMat = studMat(lane.track, { rough: 0.4, emissive: lane.neon ? lane.track : null })
  }
  const track = new Mesh(legoBox(len - 1.4, 0.08, w - 1), trackMat)
  track.position.set(len / 2 + 0.2, baseH + 0.04, 0)
  track.receiveShadow = true
  g.add(track)
  if (lane.edge) {
    const em = lane.neon ? neon(lane.edge, 2.4) : plain(lane.edge, 0.4)
    for (const z of [-w / 2 + 0.12, w / 2 - 0.12]) addBox(g, len, 0.1, 0.18, em, len / 2, baseH + 0.05, z, { shadow: false })
  }
  // Start mat (brackets + chevron, or wooden planks on the robux lanes) and a hazard line.
  const matSize = Math.min(4.4, w - 1.2)
  let startMat
  if (lane.allWorlds && !lane.neon) {
    const p = paintPlanks(256, 6, 50 + index)
    startMat = new MeshStandardMaterial({ map: toTexture(p.color, { srgb: true }), normalMap: toTexture(p.normal), roughness: 0.8 })
  } else {
    startMat = new MeshStandardMaterial({ map: canvasTex(paintLaneMat(shade(lane.track, lane.neon ? 0.9 : 0.85), lane.neon ? '#ffe14a' : '#e6f4ff')), roughness: 0.4 })
    if (lane.neon) {
      startMat.emissive.set('#ffe14a')
      startMat.emissiveMap = startMat.map
      startMat.emissiveIntensity = 0.5
    }
  }
  startMat.map.repeat.set(1 / matSize, 1 / matSize)
  if (startMat.normalMap) startMat.normalMap.repeat.set(1 / matSize, 1 / matSize)
  addBox(g, matSize, 0.04, matSize, [plain('#333'), plain('#333'), startMat, plain('#333'), plain('#333'), plain('#333')], 0.8 + matSize / 2, baseH + 0.1, 0, { shadow: false })
  const haz = new MeshStandardMaterial({ map: canvasTex(paintHazard(), { repeat: [1 / 1.2, 2.5] }), roughness: 0.5 })
  addBox(g, w - 1, 0.05, 0.4, [haz, haz, haz, haz, haz, haz], 1.2 + matSize, baseH + 0.1, 0, { shadow: false }).rotation.y = Math.PI / 2
  // Target wall at the far end with a bullseye, crate pyramid and loose bricks.
  const wallCol = lane.allWorlds ? lane.rim : '#d9dde3'
  addBox(g, 0.6, 4.4, w, topStuds(studMat(wallCol), plain(shade(wallCol, 0.9), 0.5)), len - 0.3, baseH + 2.2, 0)
  const eye = new Mesh(new CircleGeometry(1.4, 32), new MeshBasicMaterial({ map: canvasTex(paintBullseye()) }))
  eye.position.set(len - 0.62, baseH + 3.1, 0)
  eye.rotation.y = -Math.PI / 2
  g.add(eye)
  const stand = new Mesh(new CylinderGeometry(0.06, 0.06, 1.4, 6), plain('#5a5a5a'))
  stand.position.set(len - 0.7, baseH + 1.6, 0)
  g.add(stand)
  const crate = memoCrate()
  const cs = 1.1
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < 3 - row; k++) {
      const m = addBox(g, cs, cs, cs, crate, len - 1.6 - (row % 2) * 0.2, baseH + cs / 2 + row * cs, (k - (2 - row) / 2) * cs)
      m.rotation.y = (k - 1) * 0.08
    }
  }
  const rand = mulberry32(index * 17 + 3)
  for (let k = 0; k < 4; k++) {
    const col = rand() < 0.5 ? '#e8231c' : '#2f6df0'
    addBox(g, 0.5, 0.3, 0.25, topStuds(studMat(col), plain(col)), len - 2.6 - rand() * 1.5, baseH + 0.15, (rand() - 0.5) * (w - 1.5)).rotation.y = rand() * 3
  }
  // Sign over the target end, in front of the wall (as in the reference): [ALL WORLDS]
  // (icon) requirement, LOCKED/UNLOCKED, multiplier. LOCKED flips with the player's rebirths.
  const s = sign(signLines(lane, !!lane.unlocked), signHeight(lane))
  s.position.set(len - 3.4, baseH + 4.4, 0)
  g.add(s)
  signs.push({ sprite: s, lane, unlocked: !!lane.unlocked })
  // Glints on the premium lanes.
  if (lane.neon || lane.style === 'plate') glints.push({ g, len, w, y: baseH + 0.2, weight: lane.neon ? 3 : lane.allWorlds ? 1.5 : 0.6 })

  // Nobody walks onto the lane: a rail across its start, and an invisible block over the
  // whole lane (the gap to its neighbours included). Only TNT goes down it.
  const railTop = studMat(lane.rim, { rough: 0.45 })
  const railSide = plain(shade(lane.rim, 0.8), 0.5)
  const white = studMat('#ffffff', { rough: 0.5 })
  const whiteSide = plain('#e8ecf2', 0.5)
  addBox(g, 0.3, 0.28, w, topStuds(railTop, railSide), -0.2, 0.45, 0)
  addBox(g, 0.3, 0.28, w, topStuds(white, whiteSide), -0.2, 0.95, 0)
  const posts = Math.max(2, Math.round(w / 2.5))
  for (let k = 0; k <= posts; k++) addBox(g, 0.4, 1.3, 0.4, topStuds(railTop, railSide), -0.2, 0.65, -w / 2 + 0.2 + ((w - 0.4) * k) / posts)
  blocker((len + 0.35) / 2, 2.2, w / 2 + L.gap / 2, bank.startX + (len - 0.35) / 2, 2.2, zc)

  // The pad in front of the start (it lights up while training).
  const padCx = -0.8 - TRAIN.padSize / 2
  const padMat = new MeshStandardMaterial({ map: canvasTex(paintLaneMat(shade(lane.track, lane.neon ? 0.9 : 0.85), lane.neon ? '#ffe14a' : '#e6f4ff')), roughness: 0.4 })
  padMat.map.repeat.set(1 / TRAIN.padSize, 1 / TRAIN.padSize)
  const padRim = new Mesh(legoBox(TRAIN.padSize + 0.3, 0.1, TRAIN.padSize + 0.3), plain(lane.rim, 0.5))
  padRim.position.set(padCx, 0.05, 0)
  padRim.receiveShadow = true
  g.add(padRim)
  addBox(g, TRAIN.padSize, 0.04, TRAIN.padSize, [plain('#333'), plain('#333'), padMat, plain('#333'), plain('#333'), plain('#333')], padCx, 0.11, 0, { shadow: false })

  root.add(g)
  localSolid(g, len / 2, baseH / 2 + 0.03, w / 2, len / 2, baseH / 2 + 0.03, 0)
  localSolid(g, 0.3, 2.4, w / 2, len - 0.3, baseH + 2.2, 0)
  return g
}

let crateMat = null
function memoCrate() {
  crateMat ??= new MeshStandardMaterial({ map: canvasTex(paintCrate(128).color), roughness: 0.8 })
  return crateMat
}

export function buildLanes(scene) {
  const L = LOBBY.lanes
  const root = new Group()
  const waterTexs = []
  const glints = []
  const signs = []
  const layout = laneLayout()
  const centers = layout.map((l) => l.zc)
  L.list.forEach((lane, i) => buildLane(root, lane, layout[i], i, waterTexs, glints, signs))
  // A walkway strip of yellow studs along the start of each bank (the second one
  // doubles as the path between the banks), running south to the plaza.
  let first = 0
  for (const bank of L.banks) {
    const last = first + bank.count - 1
    const zMax = centers[last] + L.list[last].width / 2 + 4
    addBox(root, 0.5, 0.1, zMax - L.firstZ, studMat(C.trim), bank.startX - 0.6, 0.12, (L.firstZ + zMax) / 2, { shadow: false })
    first += bank.count
  }

  // Lane 1 tutorial highlight: a translucent glowing box over the start.
  const lane1 = L.list[0]
  const bank1 = L.banks[0]
  const hl = new Mesh(
    legoBox(3.6, 1.6, lane1.width - 0.4),
    new MeshBasicMaterial({ color: '#ffb02a', transparent: true, opacity: 0.22, depthWrite: false, blending: AdditiveBlending }),
  )
  hl.position.set(bank1.startX + bank1.length - 3.6, 0.4 + 0.8, centers[0])
  root.add(hl)

  // Red brick path from spawn to lane 1 (yellow bricks near the lanes).
  const curve = new CatmullRomCurve3([
    new Vector3(1.6, 0, 0.2),
    new Vector3(6.2, 0, -1.4),
    new Vector3(11, 0, -4.5),
    new Vector3(12.2, 0, -12),
    new Vector3(12.3, 0, -20),
    new Vector3(bank1.startX - 0.8 - TRAIN.padSize / 2, 0, centers[0]),
  ])
  const pathLen = curve.getLength()
  const count = Math.floor(pathLen / 1.55)
  const white = studMat('#ffffff', { rough: 0.4 })
  const bricks = new InstancedMesh(legoBox(1, 0.36, 0.5), [plain('#ffffff', 0.4), plain('#ffffff', 0.4), white, plain('#ffffff', 0.4), plain('#ffffff', 0.4), plain('#ffffff', 0.4)], count)
  bricks.castShadow = true
  bricks.receiveShadow = true
  const dummy = new Object3D()
  const p = new Vector3()
  const tan = new Vector3()
  const base = []
  for (let i = 0; i < count; i++) {
    const u = (i + 0.5) / count
    curve.getPointAt(u, p)
    curve.getTangentAt(u, tan)
    dummy.position.set(p.x, Math.max(p.y, 0) + 0.2, p.z)
    dummy.rotation.set(0, -Math.atan2(tan.z, tan.x), 0)
    dummy.updateMatrix()
    bricks.setMatrixAt(i, dummy.matrix)
    const yellow = i > count - 9 && i % 3 === 1
    base.push(new Color(yellow ? '#ffd21a' : '#e8231c'))
    bricks.setColorAt(i, base[i])
  }
  root.add(bricks)
  // Loose yellow bricks by the lane starts (east view).
  for (const [x, z, r] of [[8.4, centers[2] + 1.6, 0.3], [9, centers[2] + 2.2, 1.4], [8.2, centers[3] - 1.8, 0.9]]) {
    addBox(root, 1.6, 0.4, 0.8, topStuds(studMat('#ffd21a'), plain('#f2c30f')), x, 0.27, z).rotation.y = r
  }

  scene.add(root)

  const tint = new Color()
  const pulse = new Color('#ffe14a')
  return {
    glints,
    // Flips each sign's LOCKED / UNLOCKED to the player's rebirths.
    setRebirths(n) {
      for (const sg of signs) {
        const open = laneRebirths(sg.lane) <= n
        if (open === sg.unlocked) continue
        sg.unlocked = open
        resign(sg.sprite, signLines(sg.lane, open), signHeight(sg.lane))
      }
    },
    update(dt, t, camera) {
      for (const tex of waterTexs) tex.offset.y = t * 0.35
      hl.material.opacity = 0.16 + Math.sin(t * 3) * 0.08
      // A bright pulse running along the path toward the lane.
      const head = (t * 9) % (count + 10)
      for (let i = 0; i < count; i++) {
        const d = Math.abs(i - head)
        tint.copy(base[i]).lerp(pulse, d < 2.5 ? (1 - d / 2.5) * 0.7 : 0)
        bricks.setColorAt(i, tint)
      }
      bricks.instanceColor.needsUpdate = true
    },
  }
}
