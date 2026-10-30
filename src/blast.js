import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DataTexture,
  DoubleSide,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  Object3D,
  PlaneGeometry,
  Quaternion,
  RGBAFormat,
  RingGeometry,
  Sprite,
  SpriteMaterial,
  UnsignedByteType,
  Vector3,
} from 'three'
import { BLAST, LOBBY } from './config.js'
import { legoBox, laneHole, plain, studMat } from './lobby/kit.js'
import { burster, setRGB, textures } from './lobby/fx.js'
import { mulberry32 } from './textures.js'
import { sfx } from './audio.js'

// Everything the lane does when TNT hits it. skipPuff: the dust, clods and scuff of one
// skip. explode: the crater (a mask cut out of the lane floor, kit.js holed, over a stepped
// pit built from the same cells), the flash, shockwave, fireball, the white pixel cloud,
// lego bricks that fly out and settle round the hole, paper petals, sparks, smoke and the
// fire left burning in it. Aftershocks pop along the rim. reset() puts the lane back.

const HOLE_CELLS = 40 // m across the mask covers, one cell per metre
const R = LOBBY.runway
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]

// Flying pieces: instanced, own ballistic motion, bounce and settle on the lane or in the
// crater (`groundAt`). Slots are reused round-robin; a parked slot has scale 0.
function pieces(scene, geo, material, count, { gravity = -32, bounce = 0.34, drag = 0, flutter = 0, restOn = 0, shadows = false, onHit = null, groundAt = () => 0 }) {
  const n = count
  const mesh = new InstancedMesh(geo, material, n)
  mesh.frustumCulled = false
  mesh.castShadow = shadows
  mesh.receiveShadow = true
  mesh.visible = false
  scene.add(mesh)
  const zero = new Matrix4().makeScale(0, 0, 0)
  for (let i = 0; i < n; i++) mesh.setMatrixAt(i, zero)
  const S = Array.from({ length: n }, () => ({ on: false, rest: false, p: new Vector3(), v: new Vector3(), q: new Quaternion(), axis: new Vector3(1, 0, 0), spin: 0, s: 1, hits: 0 }))
  const m = new Matrix4()
  const qd = new Quaternion()
  const sv = new Vector3()
  let next = 0
  let dirty = false
  return {
    mesh,
    spawn(x, y, z, vx, vy, vz, s) {
      const o = S[next]
      next = (next + 1) % n
      o.on = true
      o.rest = false
      o.hits = 0
      o.p.set(x, y, z)
      o.v.set(vx, vy, vz)
      o.s = s
      o.q.setFromEuler(new Euler(rand(0, 6), rand(0, 6), rand(0, 6)))
      o.axis.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize()
      o.spin = rand(3, 13)
      mesh.visible = true
      dirty = true
    },
    update(dt) {
      if (!dirty) return
      dirty = false
      for (let i = 0; i < n; i++) {
        const o = S[i]
        if (!o.on || o.rest) continue
        dirty = true
        o.v.y += gravity * dt
        if (drag) o.v.multiplyScalar(Math.max(0, 1 - drag * dt))
        if (flutter) {
          o.v.x += Math.sin(o.p.y * 1.7 + i) * flutter * dt
          o.v.z += Math.cos(o.p.y * 1.3 + i) * flutter * dt
        }
        o.p.addScaledVector(o.v, dt)
        const floor = groundAt(o.p.x, o.p.z) + restOn * o.s
        if (o.p.y < floor) {
          o.p.y = floor
          const impact = -o.v.y
          if (impact > 2.5) onHit?.(Math.min(1, impact / 26), o.hits++)
          o.v.y = impact * bounce
          o.v.x *= 0.58
          o.v.z *= 0.58
          o.spin *= 0.55
          if (Math.abs(o.v.y) < 2 && o.v.lengthSq() < 7) {
            o.rest = true
            o.v.set(0, 0, 0)
            // Lands flat: keep the yaw it happened to have.
            o.q.set(0, o.q.y, 0, o.q.w).normalize()
          }
        }
        qd.setFromAxisAngle(o.axis, o.spin * dt)
        o.q.premultiply(qd)
        m.compose(o.p, o.q, sv.setScalar(o.s))
        mesh.setMatrixAt(i, m)
      }
      mesh.instanceMatrix.needsUpdate = true
    },
    reset() {
      for (let i = 0; i < n; i++) {
        S[i].on = false
        mesh.setMatrixAt(i, zero)
      }
      mesh.instanceMatrix.needsUpdate = true
      mesh.visible = false
      dirty = false
    },
  }
}

function paintScorch() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(128, 128, 30, 128, 128, 128)
  g.addColorStop(0, 'rgba(14,10,8,0.85)')
  g.addColorStop(0.55, 'rgba(18,12,8,0.72)')
  g.addColorStop(0.8, 'rgba(20,14,10,0.28)')
  g.addColorStop(1, 'rgba(20,14,10,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  // Soot flecks break the edge up.
  const r = mulberry32(9)
  ctx.fillStyle = 'rgba(14,10,8,0.5)'
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2
    const d = 70 + r() * 56
    const s = 2 + r() * 7
    ctx.fillRect(128 + Math.cos(a) * d - s / 2, 128 + Math.sin(a) * d - s / 2, s, s)
  }
  return new CanvasTexture(c)
}

function paintFlame() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 192
  const ctx = c.getContext('2d')
  const blob = (w, h, a, b) => {
    const g = ctx.createLinearGradient(0, 192, 0, 192 - h)
    g.addColorStop(0, a)
    g.addColorStop(1, b)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(64, 192 - h)
    ctx.bezierCurveTo(64 + w * 0.25, 192 - h * 0.62, 64 + w, 192 - h * 0.46, 64 + w * 0.82, 192 - h * 0.14)
    ctx.quadraticCurveTo(64 + w * 0.5, 190, 64, 190)
    ctx.quadraticCurveTo(64 - w * 0.5, 190, 64 - w * 0.82, 192 - h * 0.14)
    ctx.bezierCurveTo(64 - w, 192 - h * 0.46, 64 - w * 0.25, 192 - h * 0.62, 64, 192 - h)
    ctx.fill()
  }
  blob(60, 186, '#ff7a14', '#ffb21a')
  blob(42, 136, '#ffc21a', '#ffe14a')
  blob(24, 86, '#fff3a0', '#ffffff')
  return new CanvasTexture(c)
}

export function createBlast(scene, { shadows = true } = {}) {
  // --- Particles ---
  const fire = burster(scene, { count: 300, texture: 'dot', drag: 3.4, shrink: 0.2, grow: 1.3 })
  const sparks = burster(scene, { count: 320, texture: 'dot', gravity: -20, drag: 0.5, shrink: 0.5 })
  const smoke = burster(scene, { count: 220, texture: 'dot', additive: false, gravity: 2.4, drag: 1.5, grow: 2.2 })
  const pixels = burster(scene, { count: 520, texture: 'square', additive: false, gravity: -4, drag: 3, shrink: 0.35 })
  const dust = burster(scene, { count: 260, texture: 'square', additive: false, gravity: -14, drag: 1.6, shrink: 0.4 })
  const trail = burster(scene, { count: 180, texture: 'dot', additive: false, drag: 2, grow: 1.6 })

  // --- The hole ---
  const mask = new Uint8Array(HOLE_CELLS * HOLE_CELLS * 4)
  const maskTex = new DataTexture(mask, HOLE_CELLS, HOLE_CELLS, RGBAFormat, UnsignedByteType)
  maskTex.magFilter = maskTex.minFilter = NearestFilter
  maskTex.needsUpdate = true
  laneHole.map.value = maskTex
  const level = new Uint8Array(HOLE_CELLS * HOLE_CELLS) // crater step of each cell
  let holeX = 0
  let holeZ = 0
  let holeOn = false
  const groundAt = (x, z) => {
    if (!holeOn) return 0
    const i = Math.floor(x - holeX)
    const j = Math.floor(z - holeZ)
    if (i < 0 || j < 0 || i >= HOLE_CELLS || j >= HOLE_CELLS) return 0
    return BLAST.levels[level[j * HOLE_CELLS + i]]
  }
  const pitTop = new Mesh(new BufferGeometry(), plain('#ffffff'))
  const pitDirt = new Mesh(new BufferGeometry(), plain('#ffffff'))
  pitTop.visible = pitDirt.visible = false
  pitTop.receiveShadow = pitDirt.receiveShadow = true
  scene.add(pitTop, pitDirt)

  // One flat quad; wound so it faces `n`. UVs in metres keep the studs their size.
  const quad = (out, a, b, c, d, n, uv) => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const cross = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const front = cross[0] * n[0] + cross[1] * n[1] + cross[2] * n[2] > 0
    const order = front ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
    const pts = [a, b, c, d]
    for (const k of order) {
      out.pos.push(...pts[k])
      out.nor.push(...n)
      out.uv.push(...uv[k])
    }
  }
  const toGeo = (out, mesh) => {
    mesh.geometry.dispose()
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(out.pos), 3))
    g.setAttribute('normal', new BufferAttribute(new Float32Array(out.nor), 3))
    g.setAttribute('uv', new BufferAttribute(new Float32Array(out.uv), 2))
    mesh.geometry = g
  }

  // Marks the cells of a chunky, roughly square crater and builds its stepped pit.
  function carve(cx, cz, radius, zone) {
    holeX = Math.round(cx) - HOLE_CELLS / 2
    holeZ = Math.round(cz) - HOLE_CELLS / 2
    level.fill(0)
    mask.fill(0)
    const seed = Math.random() * 1000
    const blockNoise = (i, j) => {
      const s = Math.sin(Math.floor(i / 2) * 12.9898 + Math.floor(j) * 78.233 + seed) * 43758.5453
      return s - Math.floor(s) - 0.5
    }
    const half = HOLE_CELLS / 2
    for (let j = 0; j < HOLE_CELLS; j++) {
      for (let i = 0; i < HOLE_CELLS; i++) {
        const x = Math.abs(i + 0.5 - half)
        const z = Math.abs(j + 0.5 - half) * 1.12
        const d = (x ** 3 + z ** 3) ** (1 / 3) + blockNoise(i, j) * 1.9
        const L = d < radius * 0.56 ? 2 : d < radius ? 1 : 0
        level[j * HOLE_CELLS + i] = L
        mask[(j * HOLE_CELLS + i) * 4] = L ? 255 : 0
      }
    }
    maskTex.needsUpdate = true
    laneHole.rect.value.set(holeX, holeZ, HOLE_CELLS, HOLE_CELLS)
    holeOn = true

    const top = { pos: [], nor: [], uv: [] }
    const dirt = { pos: [], nor: [], uv: [] }
    const [, y1] = BLAST.levels
    const at = (i, j) => (i < 0 || j < 0 || i >= HOLE_CELLS || j >= HOLE_CELLS ? 0 : level[j * HOLE_CELLS + i])
    // A wall from height a down to b, on the shared edge of a cell and a shallower neighbour.
    const wall = (out, ax, az, bx, bz, a, b, n) => {
      const len = Math.hypot(bx - ax, bz - az)
      quad(out, [ax, b, az], [bx, b, bz], [bx, a, bz], [ax, a, az], n, [[0, b], [len, b], [len, a], [0, a]])
    }
    for (let j = 0; j < HOLE_CELLS; j++) {
      for (let i = 0; i < HOLE_CELLS; i++) {
        const L = at(i, j)
        if (!L) continue
        const x0 = holeX + i
        const z0 = holeZ + j
        const x1 = x0 + 1
        const z1 = z0 + 1
        const y = BLAST.levels[L]
        quad(dirt, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, 1, 0], [[x0, z0], [x1, z0], [x1, z1], [x0, z1]])
        for (const [di, dj, ax, az, bx, bz, n] of [
          [1, 0, x1, z0, x1, z1, [-1, 0, 0]],
          [-1, 0, x0, z0, x0, z1, [1, 0, 0]],
          [0, 1, x0, z1, x1, z1, [0, 0, -1]],
          [0, -1, x0, z0, x1, z0, [0, 0, 1]],
        ]) {
          const N = at(i + di, j + dj)
          if (N >= L) continue
          const from = BLAST.levels[N]
          if (from > y1) {
            wall(top, ax, az, bx, bz, from, Math.max(y1, y), n)
            if (y < y1) wall(dirt, ax, az, bx, bz, y1, y, n)
          } else wall(dirt, ax, az, bx, bz, from, y, n)
        }
      }
    }
    toGeo(top, pitTop)
    toGeo(dirt, pitDirt)
    pitTop.material = studMat(zone.floor)
    pitDirt.material = studMat(zone.dirt, { rough: 0.85 })
    pitTop.visible = pitDirt.visible = true
  }

  // --- Flying pieces ---
  const brickGeo = legoBox(2, 1.1, 2)
  let clackBudget = 0
  const clack = (v, hits) => {
    if (hits > 1 || clackBudget <= 0) return
    clackBudget -= 1
    sfx.clack(v)
  }
  const shadowOpts = { restOn: 0.5, shadows, onHit: clack, groundAt }
  const bricksA = pieces(scene, brickGeo, plain('#ffffff'), Math.ceil(BLAST.bricks * 0.55), shadowOpts)
  const bricksB = pieces(scene, brickGeo, plain('#ffffff'), Math.ceil(BLAST.bricks * 0.45), shadowOpts)
  const chipGeo = legoBox(0.5, 0.3, 0.5)
  const chips = pieces(scene, chipGeo, plain('#ffffff'), BLAST.chips, { restOn: 0.15, groundAt })
  const shredGeo = new PlaneGeometry(0.9, 0.55)
  const shredOpts = { gravity: -7, bounce: 0, drag: 1.1, flutter: 16, restOn: 0.04, groundAt }
  const shredsRed = pieces(scene, shredGeo, plain('#e8231c', 0.7, { side: DoubleSide }), Math.ceil(BLAST.shreds * 0.65), shredOpts)
  const shredsWhite = pieces(scene, shredGeo, plain('#f6f2e8', 0.7, { side: DoubleSide }), Math.ceil(BLAST.shreds * 0.35), shredOpts)

  // --- Ground marks, flash, shockwave, flames ---
  const flat = (w, mat) => {
    const m = new Mesh(new PlaneGeometry(w, w), mat)
    m.rotation.x = -Math.PI / 2
    m.visible = false
    scene.add(m)
    return m
  }
  const scorchTex = paintScorch()
  const scorch = flat(1, new MeshBasicMaterial({ map: scorchTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }))
  scorch.renderOrder = 1
  scorch.position.y = 0.03
  const scuffs = new InstancedMesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: scorchTex, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 44)
  scuffs.frustumCulled = false
  scuffs.visible = false
  scuffs.renderOrder = 1
  scene.add(scuffs)
  const scuffDummy = new Object3D()
  scuffDummy.rotation.x = -Math.PI / 2
  let scuffN = 0

  const ringMat = new MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: 0, side: DoubleSide, blending: AdditiveBlending, depthWrite: false })
  const ring = new Mesh(new RingGeometry(0.8, 1, 56), ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.25
  ring.visible = false
  scene.add(ring)
  const glowMat = new SpriteMaterial({ map: textures.dot(), color: '#ffb84a', transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, depthTest: false, fog: false })
  const glow = new Sprite(glowMat)
  glow.visible = false
  glow.renderOrder = 8
  scene.add(glow)
  // Other players' blasts (remoteBoom): a small pool of their own flash + shockwave pairs, so a
  // remote blast never cuts short the local one. No crater, bricks or flames: particles only.
  const waves = Array.from({ length: 3 }, () => {
    const r = new Mesh(ring.geometry, ringMat.clone())
    r.rotation.x = -Math.PI / 2
    r.position.y = 0.25
    r.visible = false
    const g = new Sprite(glowMat.clone())
    g.visible = false
    g.renderOrder = 8
    scene.add(r, g)
    return { ring: r, glow: g, ringT: 1, glowT: 1, ringSize: 20, glowSize: 40 }
  })
  let nextWave = 0

  // The lit fuse: a hot glow that follows the tip.
  const fuseGlow = new Sprite(new SpriteMaterial({ map: textures.dot(), color: '#ffd24a', transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false, fog: false }))
  fuseGlow.visible = false
  fuseGlow.renderOrder = 8
  scene.add(fuseGlow)
  const flameTex = paintFlame()
  const flames = new Group()
  flames.visible = false
  const flameSprites = [0, 1, 2].map(() => {
    const s = new Sprite(new SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, fog: false }))
    s.center.set(0.5, 0)
    flames.add(s)
    return s
  })
  scene.add(flames)

  let time = 0
  let ringT = 1
  let glowT = 1
  let ringSize = 20
  let glowSize = 40
  let flameT = 0
  let flameOn = false
  let embers = 0
  const shocks = [] // { at, x, z, s } aftershocks waiting their time
  const spot = { x: 0, z: 0, radius: 5 }

  function fireball(x, y, z, count, speed, size) {
    fire.emit(count, (p) => {
      const a = Math.random() * Math.PI * 2
      const u = Math.random()
      const s = speed * rand(0.25, 1)
      const h = Math.sqrt(1 - u * u)
      p.x = x + Math.cos(a) * h * 0.8
      p.y = y + u * 0.8
      p.z = z + Math.sin(a) * h * 0.8
      p.vx = Math.cos(a) * h * s
      p.vy = u * s
      p.vz = Math.sin(a) * h * s
      p.life = rand(0.32, 0.8)
      p.size = size * rand(0.7, 1.5)
      setRGB(p, pick(['#ffffff', '#fff0a0', '#ffc23a', '#ff8a1a', '#ff5a14']))
    })
  }

  function burstPixels(x, y, z, count, speed, colors) {
    pixels.emit(count, (p) => {
      const a = Math.random() * Math.PI * 2
      const u = Math.random() ** 0.7
      const s = speed * rand(0.2, 1)
      const h = Math.sqrt(1 - u * u)
      p.x = x + rand(-1, 1)
      p.y = y + rand(0, 1)
      p.z = z + rand(-1, 1)
      p.vx = Math.cos(a) * h * s
      p.vy = u * s * 1.15
      p.vz = Math.sin(a) * h * s
      p.life = rand(0.8, 1.9)
      p.size = rand(0.38, 0.95)
      setRGB(p, Math.random() < 0.72 ? '#ffffff' : pick(colors))
    })
  }

  function scatter(x, z, radius, zone) {
    const kick = (list, n) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const r = rand(0.2, 1) * radius
        const s = rand(7, 25)
        // A share flies back at the camera: the ones that fill the screen.
        const toward = i % 5 === 0 ? 0.55 : 0
        list.spawn(x + Math.cos(a) * r, rand(0.2, 1.4), z + Math.sin(a) * r, Math.cos(a) * s, rand(11, 31), Math.sin(a) * s * (1 - toward) + toward * rand(10, 18), rand(0.55, 1.45))
      }
    }
    bricksA.mesh.material = studMat(zone.floor)
    bricksB.mesh.material = studMat(zone.dirt, { rough: 0.85 })
    kick(bricksA, Math.ceil(BLAST.bricks * 0.55))
    kick(bricksB, Math.ceil(BLAST.bricks * 0.45))
    for (const [list, count] of [[shredsRed, Math.ceil(BLAST.shreds * 0.65)], [shredsWhite, Math.ceil(BLAST.shreds * 0.35)]]) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const s = rand(4, 19)
        list.spawn(x + rand(-1, 1), rand(0.6, 2.4), z + rand(-1, 1), Math.cos(a) * s, rand(9, 25), Math.sin(a) * s, rand(0.7, 1.5))
      }
    }
  }

  return {
    // A lit fuse at world point v; `hot` 0..1 fattens it toward the blast.
    fuse(v, hot) {
      fuseGlow.visible = true
      fuseGlow.position.copy(v)
      fuseGlow.scale.setScalar(1.1 + hot * 1.8 + Math.random() * 0.5)
      sparks.emit(1 + Math.round(hot * 2), (p) => {
        const a = Math.random() * Math.PI * 2
        const s = rand(1.5, 5 + hot * 5)
        p.x = v.x
        p.y = v.y
        p.z = v.z
        p.vx = Math.cos(a) * s
        p.vy = rand(1, 6)
        p.vz = Math.sin(a) * s
        p.life = rand(0.18, 0.5)
        p.size = rand(0.14, 0.3)
        setRGB(p, pick(['#fff3a0', '#ffd23a', '#ff8a1a']))
      })
    },
    fuseOut() {
      fuseGlow.visible = false
    },
    // A puff of the equipped trail's colours behind the flying TNT.
    puff(x, y, z, colors) {
      trail.emit(1, (p) => {
        p.x = x + rand(-0.15, 0.15)
        p.y = y + rand(-0.15, 0.15)
        p.z = z
        p.vx = rand(-0.5, 0.5)
        p.vy = rand(0.2, 1.2)
        p.vz = rand(-1, 1)
        p.life = rand(0.5, 1)
        p.size = rand(0.5, 0.95)
        setRGB(p, pick(colors))
      })
    },
    // One skip: k 0..1 = how hard it hit.
    skipPuff(x, z, zone, k) {
      dust.emit(Math.round(8 + 22 * k), (p) => {
        const a = Math.random() * Math.PI * 2
        const s = rand(2, 7 + 9 * k)
        p.x = x + rand(-0.4, 0.4)
        p.y = 0.2
        p.z = z + rand(-0.4, 0.4)
        p.vx = Math.cos(a) * s
        p.vy = rand(2.5, 6 + 8 * k)
        p.vz = Math.sin(a) * s * 0.7 + 3
        p.life = rand(0.35, 0.8)
        p.size = rand(0.16, 0.42)
        setRGB(p, pick(zone.dust))
      })
      chips.mesh.material = studMat(zone.floor)
      for (let i = 0, n = Math.round(1 + 4 * k); i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const s = rand(2, 9)
        chips.spawn(x, 0.2, z, Math.cos(a) * s, rand(5, 11), Math.sin(a) * s, rand(0.7, 1.5))
      }
      const size = 1 + 2.4 * k
      scuffDummy.position.set(x, 0.025, z)
      scuffDummy.scale.set(size, size * 1.7, 1)
      scuffDummy.updateMatrix()
      scuffs.setMatrixAt(scuffN % 44, scuffDummy.matrix)
      scuffs.count = Math.min(44, ++scuffN)
      scuffs.instanceMatrix.needsUpdate = true
      scuffs.visible = true
    },
    // `index` = the TNT's place in TNTS, the better ones blow a bigger hole. Returns the radius.
    explode(x, z, zone, index) {
      const radius = Math.min(BLAST.radiusMax, BLAST.radius + index * BLAST.radiusStep)
      const margin = radius + 2.5
      x = Math.max(R.minX + margin, Math.min(R.maxX - margin, x))
      spot.x = x
      spot.z = z
      spot.radius = radius
      carve(x, z, radius, zone)
      scorch.position.x = Math.round(x)
      scorch.position.z = Math.round(z)
      scorch.scale.setScalar(radius * 3.3)
      scorch.visible = true

      ringT = 0
      ringSize = radius * 5.5
      ring.position.x = x
      ring.position.z = z
      ring.visible = true
      glowT = 0
      glowSize = radius * 10
      glow.position.set(x, 3, z)
      glow.visible = true

      fireball(x, 0.6, z, 130, 34, 3.4)
      burstPixels(x, 0.6, z, 300, 33, [zone.floor, zone.dirt, '#e8231c'])
      smoke.emit(70, (p) => {
        const a = Math.random() * Math.PI * 2
        const r = rand(0, radius)
        const s = rand(1, 11)
        p.x = x + Math.cos(a) * r
        p.y = rand(0.4, 3)
        p.z = z + Math.sin(a) * r
        p.vx = Math.cos(a) * s
        p.vy = rand(4, 20)
        p.vz = Math.sin(a) * s
        p.life = rand(1.4, 3)
        p.size = rand(2.2, 4.6)
        setRGB(p, pick(['#2b2826', '#4a4642', '#6a6560', '#e8e4dc']))
      })
      sparks.emit(170, (p) => {
        const a = Math.random() * Math.PI * 2
        const s = rand(9, 44)
        const u = rand(0.15, 1)
        p.x = x
        p.y = 0.6
        p.z = z
        p.vx = Math.cos(a) * s * (1 - u * 0.6)
        p.vy = s * u
        p.vz = Math.sin(a) * s * (1 - u * 0.6)
        p.life = rand(0.9, 2.4)
        p.size = rand(0.2, 0.46)
        setRGB(p, pick(['#ffe48a', '#ffb02a', '#ff7a1a', '#ff4a14']))
      })
      // The dust wall running out along the ground with the shockwave.
      dust.emit(120, (p) => {
        const a = Math.random() * Math.PI * 2
        const s = rand(12, 30)
        p.x = x + Math.cos(a) * radius * 0.6
        p.y = 0.3
        p.z = z + Math.sin(a) * radius * 0.6
        p.vx = Math.cos(a) * s
        p.vy = rand(1.5, 9)
        p.vz = Math.sin(a) * s
        p.life = rand(0.5, 1.2)
        p.size = rand(0.25, 0.6)
        setRGB(p, pick(zone.dust))
      })
      scatter(x, z, radius, zone)
      clackBudget = 24

      shocks.length = 0
      for (let i = 0; i < BLAST.aftershocks; i++) {
        const a = Math.random() * Math.PI * 2
        shocks.push({ at: 0.16 + i * 0.17, x: x + Math.cos(a) * radius * 0.85, z: z + Math.sin(a) * radius * 0.85 })
      }
      flameOn = true
      flameT = 0
      embers = 0
      flames.position.set(x, BLAST.levels[2], z)
      flames.visible = true
      flameSprites.forEach((s, i) => s.position.set((i - 1) * radius * 0.22, 0, (i === 1 ? -0.3 : 0.3)))
      return radius
    },
    // A spark at the fuse tip of another player's flying TNT.
    remoteFuse(v) {
      sparks.emit(1, (p) => {
        const a = Math.random() * Math.PI * 2
        const s = rand(1.5, 5)
        p.x = v.x
        p.y = v.y
        p.z = v.z
        p.vx = Math.cos(a) * s
        p.vy = rand(1, 6)
        p.vz = Math.sin(a) * s
        p.life = rand(0.18, 0.4)
        p.size = rand(0.14, 0.26)
        setRGB(p, pick(['#fff3a0', '#ffd23a', '#ff8a1a']))
      })
    },
    // Another player's blast, drawn lighter than explode(): flash, shockwave ring, fireball, pixel
    // cloud, smoke, sparks and the dust wall (about half the particles), no crater. `index` = the
    // TNT's place in TNTS, as for explode().
    remoteBoom(x, z, zone, index) {
      const radius = Math.min(BLAST.radiusMax, BLAST.radius + index * BLAST.radiusStep)
      const w = waves[nextWave]
      nextWave = (nextWave + 1) % waves.length
      w.ringT = w.glowT = 0
      w.ringSize = radius * 5.5
      w.glowSize = radius * 10
      w.ring.position.x = x
      w.ring.position.z = z
      w.ring.visible = true
      w.glow.position.set(x, 3, z)
      w.glow.visible = true
      fireball(x, 0.6, z, 60, 30, 3.2)
      burstPixels(x, 0.6, z, 130, 30, [zone.floor, zone.dirt, '#e8231c'])
      smoke.emit(26, (p) => {
        const a = Math.random() * Math.PI * 2
        const r = rand(0, radius)
        const s = rand(1, 9)
        p.x = x + Math.cos(a) * r
        p.y = rand(0.4, 3)
        p.z = z + Math.sin(a) * r
        p.vx = Math.cos(a) * s
        p.vy = rand(4, 16)
        p.vz = Math.sin(a) * s
        p.life = rand(1.2, 2.4)
        p.size = rand(2.2, 4.2)
        setRGB(p, pick(['#2b2826', '#4a4642', '#6a6560', '#e8e4dc']))
      })
      sparks.emit(70, (p) => {
        const a = Math.random() * Math.PI * 2
        const s = rand(9, 38)
        const u = rand(0.15, 1)
        p.x = x
        p.y = 0.6
        p.z = z
        p.vx = Math.cos(a) * s * (1 - u * 0.6)
        p.vy = s * u
        p.vz = Math.sin(a) * s * (1 - u * 0.6)
        p.life = rand(0.8, 2)
        p.size = rand(0.2, 0.42)
        setRGB(p, pick(['#ffe48a', '#ffb02a', '#ff7a1a', '#ff4a14']))
      })
      dust.emit(50, (p) => {
        const a = Math.random() * Math.PI * 2
        const s = rand(12, 28)
        p.x = x + Math.cos(a) * radius * 0.6
        p.y = 0.3
        p.z = z + Math.sin(a) * radius * 0.6
        p.vx = Math.cos(a) * s
        p.vy = rand(1.5, 8)
        p.vz = Math.sin(a) * s
        p.life = rand(0.5, 1.1)
        p.size = rand(0.25, 0.55)
        setRGB(p, pick(zone.dust))
      })
    },
    // `dt` is the blast's own (slow-motion) time.
    update(dt, elapsed) {
      time = elapsed
      fire.update(dt)
      sparks.update(dt)
      smoke.update(dt)
      pixels.update(dt)
      dust.update(dt)
      trail.update(dt)
      bricksA.update(dt)
      bricksB.update(dt)
      chips.update(dt)
      shredsRed.update(dt)
      shredsWhite.update(dt)
      for (const w of waves) {
        if (w.ringT < 1) {
          w.ringT = Math.min(1, w.ringT + dt / 0.55)
          const k = 1 - (1 - w.ringT) ** 3
          w.ring.scale.setScalar(2 + w.ringSize * k)
          w.ring.material.opacity = (1 - w.ringT) ** 1.5 * 0.95
          if (w.ringT >= 1) w.ring.visible = false
        }
        if (w.glowT < 1) {
          w.glowT = Math.min(1, w.glowT + dt / 0.5)
          w.glow.scale.setScalar(w.glowSize * (0.45 + 0.55 * (1 - (1 - w.glowT) ** 3)))
          w.glow.material.opacity = (1 - w.glowT) ** 2
          if (w.glowT >= 1) w.glow.visible = false
        }
      }
      if (ringT < 1) {
        ringT = Math.min(1, ringT + dt / 0.55)
        const k = 1 - (1 - ringT) ** 3
        ring.scale.setScalar(2 + ringSize * k)
        ringMat.opacity = (1 - ringT) ** 1.5 * 0.95
        if (ringT >= 1) ring.visible = false
      }
      if (glowT < 1) {
        glowT = Math.min(1, glowT + dt / 0.5)
        glow.scale.setScalar(glowSize * (0.45 + 0.55 * (1 - (1 - glowT) ** 3)))
        glowMat.opacity = (1 - glowT) ** 2
        if (glowT >= 1) glow.visible = false
      }
      for (let i = shocks.length - 1; i >= 0; i--) {
        const s = shocks[i]
        s.at -= dt
        if (s.at > 0) continue
        shocks.splice(i, 1)
        fireball(s.x, 0.4, s.z, 34, 16, 2)
        burstPixels(s.x, 0.4, s.z, 46, 16, ['#ffb02a', '#ffffff'])
        sfx.pop()
      }
      if (flameOn) {
        flameT += dt
        const grow = Math.min(1, flameT / 0.5)
        flameSprites.forEach((s, i) => {
          const f = 1 + Math.sin(time * (14 + i * 5) + i * 2) * 0.13 + Math.sin(time * 31 + i) * 0.07
          const h = (i === 1 ? 4.2 : 2.8) * spot.radius * 0.32 * grow * f
          s.scale.set(h * 0.68 * (2 - f), h, 1)
        })
        embers += dt
        while (embers > 0.05) {
          embers -= 0.05
          sparks.emit(1, (p) => {
            const a = Math.random() * Math.PI * 2
            const r = rand(0, spot.radius * 0.4)
            p.x = spot.x + Math.cos(a) * r
            p.y = -0.6
            p.z = spot.z + Math.sin(a) * r
            p.vx = rand(-1.5, 1.5)
            p.vy = rand(5, 13)
            p.vz = rand(-1.5, 1.5)
            p.life = rand(0.7, 1.5)
            p.size = rand(0.14, 0.3)
            setRGB(p, pick(['#ffd23a', '#ff8a1a']))
          })
          smoke.emit(1, (p) => {
            const a = Math.random() * Math.PI * 2
            p.x = spot.x + Math.cos(a)
            p.y = 0
            p.z = spot.z + Math.sin(a)
            p.vx = rand(-0.6, 0.6)
            p.vy = rand(3, 7)
            p.vz = rand(-0.6, 0.6)
            p.life = rand(1, 2)
            p.size = rand(1.2, 2.2)
            setRGB(p, pick(['#35312e', '#57524d']))
          })
        }
      }
    },
    // The lane as it was (the camera is back on the player).
    reset() {
      laneHole.rect.value.set(0, 0, 0, 0)
      holeOn = false
      pitTop.visible = pitDirt.visible = false
      scorch.visible = false
      scuffs.visible = false
      scuffs.count = 0
      scuffN = 0
      flames.visible = false
      flameOn = false
      ring.visible = glow.visible = false
      fuseGlow.visible = false
      shocks.length = 0
      bricksA.reset()
      bricksB.reset()
      chips.reset()
      shredsRed.reset()
      shredsWhite.reset()
    },
  }
}
