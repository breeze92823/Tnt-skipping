import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, NormalBlending, Points, ShaderMaterial } from 'three'
import { paintSoftDot, paintSparkle } from '../textures.js'

// Particle emitters: one Points draw call each, fixed-size buffers updated in
// place every frame (no allocation). A particle has position, velocity, life,
// size and colour; it fades in quickly, out over its last half, and can shrink.
// Counts scale with the graphics preset's `particles` factor.

const vertex = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uScale;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
    vAlpha = aAlpha;
    vColor = aColor;
  }`
const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uBoost;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 t = texture2D(uMap, gl_PointCoord);
    if (t.a * vAlpha < 0.01) discard;
    gl_FragColor = vec4(vColor * uBoost * t.rgb, t.a * vAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`

let sparkleTex = null
let dotTex = null
const squareTex = (() => {
  let t = null
  return () => {
    if (t) return t
    const c = document.createElement('canvas')
    c.width = c.height = 16
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(2, 2, 12, 12)
    t = new CanvasTexture(c)
    return t
  }
})()

export const textures = {
  sparkle: () => (sparkleTex ??= new CanvasTexture(paintSparkle(64))),
  dot: () => (dotTex ??= new CanvasTexture(paintSoftDot(64))),
  square: squareTex,
}

const emitters = []
let density = 1
let boost = 1

// spawn(p, i) must set p.x, p.y, p.z, p.vx, p.vy, p.vz, p.life, p.size and p.r/g/b.
export function emitter(scene, { count, texture = 'sparkle', additive = true, rate = null, gravity = 0, drag = 0, shrink = 0, spawn }) {
  const n = Math.max(1, Math.round(count * density))
  const geo = new BufferGeometry()
  const pos = new Float32Array(n * 3)
  const col = new Float32Array(n * 3)
  const size = new Float32Array(n)
  const alpha = new Float32Array(n)
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.setAttribute('aColor', new BufferAttribute(col, 3))
  geo.setAttribute('aSize', new BufferAttribute(size, 1))
  geo.setAttribute('aAlpha', new BufferAttribute(alpha, 1))
  const mat = new ShaderMaterial({
    uniforms: { uMap: { value: textures[texture]() }, uScale: { value: 600 }, uBoost: { value: boost } },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: additive ? AdditiveBlending : NormalBlending,
  })
  const points = new Points(geo, mat)
  points.frustumCulled = false
  points.renderOrder = 6
  scene.add(points)

  const P = Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, r: 1, g: 1, b: 1, age: 1e9 }))
  // Stagger the first lives so a steady emitter does not pulse.
  P.forEach((p, i) => {
    spawn(p, i)
    p.max = p.life
    p.age = (i / n) * p.life
  })
  const spawnEvery = rate ? 1 / (rate * density) : 0
  let acc = 0
  const e = {
    points,
    mat,
    update(dt) {
      if (spawnEvery) acc += dt
      for (let i = 0; i < n; i++) {
        const p = P[i]
        p.age += dt
        if (p.age >= p.max) {
          if (spawnEvery) {
            if (acc < spawnEvery) {
              alpha[i] = 0
              continue
            }
            acc -= spawnEvery
          }
          spawn(p, i)
          p.max = p.life
          p.age = 0
        }
        p.vy += gravity * dt
        const k = 1 - drag * dt
        p.vx *= k
        p.vy *= k
        p.vz *= k
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.z += p.vz * dt
        const t = p.age / p.max
        pos[i * 3] = p.x
        pos[i * 3 + 1] = p.y
        pos[i * 3 + 2] = p.z
        col[i * 3] = p.r
        col[i * 3 + 1] = p.g
        col[i * 3 + 2] = p.b
        size[i] = p.size * (1 - shrink * t)
        alpha[i] = Math.min(1, t * 8) * (t > 0.5 ? (1 - t) * 2 : 1)
      }
      if (spawnEvery && acc > spawnEvery * 4) acc = spawnEvery * 4
      geo.attributes.position.needsUpdate = true
      geo.attributes.aColor.needsUpdate = true
      geo.attributes.aSize.needsUpdate = true
      geo.attributes.aAlpha.needsUpdate = true
    },
  }
  emitters.push(e)
  return e
}

// One-shot bursts on the same shaders: nothing runs until emit(n, spawn), and a dead
// particle stays dead (its slot is reused round-robin). `grow` widens a particle over its
// life (smoke). update(dt) is the caller's, so a blast can run in slow motion.
const bursts = []
export function burster(scene, { count, texture = 'dot', additive = true, gravity = 0, drag = 0, shrink = 0, grow = 0 }) {
  const n = Math.max(8, Math.round(count * density))
  const geo = new BufferGeometry()
  const pos = new Float32Array(n * 3)
  const col = new Float32Array(n * 3)
  const size = new Float32Array(n)
  const alpha = new Float32Array(n)
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.setAttribute('aColor', new BufferAttribute(col, 3))
  geo.setAttribute('aSize', new BufferAttribute(size, 1))
  geo.setAttribute('aAlpha', new BufferAttribute(alpha, 1))
  const mat = new ShaderMaterial({
    uniforms: { uMap: { value: textures[texture]() }, uScale: { value: 600 }, uBoost: { value: additive ? boost : 1 } },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: additive ? AdditiveBlending : NormalBlending,
  })
  const points = new Points(geo, mat)
  points.frustumCulled = false
  points.renderOrder = additive ? 7 : 6
  points.visible = false
  scene.add(points)
  const P = Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 1, max: 1, size: 1, r: 1, g: 1, b: 1, age: 1e9 }))
  let next = 0
  let alive = 0
  const b = {
    additive,
    mat,
    // spawn(p, i) as for emitter(); n is scaled by the graphics preset.
    emit(wanted, spawn) {
      const k = Math.max(1, Math.round(wanted * density))
      for (let i = 0; i < k; i++) {
        const p = P[next]
        next = (next + 1) % n
        spawn(p, i)
        p.max = p.life
        p.age = 0
      }
      alive = n
      points.visible = true
    },
    update(dt) {
      if (!alive) return
      let live = 0
      for (let i = 0; i < n; i++) {
        const p = P[i]
        p.age += dt
        if (p.age >= p.max) {
          alpha[i] = 0
          continue
        }
        live++
        p.vy += gravity * dt
        const k = Math.max(0, 1 - drag * dt)
        p.vx *= k
        p.vy *= k
        p.vz *= k
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.z += p.vz * dt
        const t = p.age / p.max
        pos[i * 3] = p.x
        pos[i * 3 + 1] = p.y
        pos[i * 3 + 2] = p.z
        col[i * 3] = p.r
        col[i * 3 + 1] = p.g
        col[i * 3 + 2] = p.b
        size[i] = p.size * (1 - shrink * t) * (1 + grow * t)
        alpha[i] = Math.min(1, t * 14) * (t > 0.45 ? (1 - t) / 0.55 : 1)
      }
      alive = live
      if (!live) points.visible = false
      geo.attributes.position.needsUpdate = true
      geo.attributes.aColor.needsUpdate = true
      geo.attributes.aSize.needsUpdate = true
      geo.attributes.aAlpha.needsUpdate = true
    },
  }
  bursts.push(b)
  return b
}

// Called once before building with the graphics preset's particle factor.
export function setParticleDensity(d) {
  density = d
}
// With bloom on, particles are pushed brighter so they glow.
export function setParticleBoost(on) {
  boost = on ? 2.2 : 1
  for (const e of emitters) e.mat.uniforms.uBoost.value = boost
  for (const b of bursts) if (b.additive) b.mat.uniforms.uBoost.value = boost
}

export function updateParticles(dt, viewportHeight, fovDeg) {
  // Point size in world metres -> pixels: h / (2 tan(fov/2)).
  const scale = viewportHeight / (2 * Math.tan((fovDeg * Math.PI) / 360))
  for (const e of emitters) {
    e.mat.uniforms.uScale.value = scale
    e.update(dt)
  }
  for (const b of bursts) b.mat.uniforms.uScale.value = scale
}

const tmp = new Color()
export function setRGB(p, hex, jitter = 0) {
  tmp.set(hex)
  p.r = tmp.r * (1 - jitter * Math.random())
  p.g = tmp.g * (1 - jitter * Math.random())
  p.b = tmp.b * (1 - jitter * Math.random())
}
