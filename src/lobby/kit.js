import {
  BoxGeometry,
  CanvasTexture,
  ExtrudeGeometry,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  Shape,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector2,
  Vector4,
} from 'three'
import { LOBBY } from '../config.js'
import { toTexture } from '../textures.js'
import { fontReady, solidBox } from '../propkit.js'
import { bake } from '../bake.js'
import { paintStuds, paintTextStack } from './paint.js'

// Shared pieces for the lego lobby: studded plate materials, boxes whose UVs
// are in metres (so a stud is the same size on every part), extruded floor
// patches, sign sprites and colliders placed through a parent's transform.

const STUD_TILE = LOBBY.studTile // metres per stud texture tile (8 studs)

// --- Materials ----------------------------------------------------------------
const studCache = new Map()
// A plate material with studs on it, tinted `color` (the canvas is painted in that colour).
export function studMat(color, { alt = null, rough = 0.55, shade = 1, emissive = null } = {}) {
  const key = `${color}|${alt}|${rough}|${shade}|${emissive}`
  let m = studCache.get(key)
  if (m) return m
  const p = paintStuds({ base: color, alt, studShade: shade })
  const map = toTexture(p.color, { repeat: 1 / STUD_TILE, srgb: true })
  const normalMap = toTexture(p.normal, { repeat: 1 / STUD_TILE })
  m = new MeshStandardMaterial({ map, normalMap, normalScale: new Vector2(0.7, 0.7), roughness: rough, metalness: 0 })
  if (emissive) {
    m.emissive.set(emissive)
    m.emissiveIntensity = 0.35
  }
  studCache.set(key, m)
  return m
}

const plainCache = new Map()
export function plain(color, rough = 0.6, extra) {
  const key = `${color}|${rough}`
  if (!extra && plainCache.has(key)) return plainCache.get(key)
  const m = new MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra })
  if (!extra) plainCache.set(key, m)
  return m
}

// The lane floor can be blown open. A holed copy of a floor material discards the
// fragments the blast's mask marks (blast.js sets these two uniforms for all of them), so
// the crater is a real hole in the lane with its stepped pit showing underneath.
export const laneHole = { rect: { value: new Vector4(0, 0, 0, 0) }, map: { value: null } }
export function holed(base) {
  const m = base.clone()
  m.userData.k = 'holed' // bake.js must not merge it with the plain original
  m.onBeforeCompile = (s) => {
    s.uniforms.uHoleRect = laneHole.rect
    s.uniforms.uHoleMap = laneHole.map
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHoleP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvHoleP = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec4 uHoleRect;\nuniform sampler2D uHoleMap;\nvarying vec3 vHoleP;')
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        if (uHoleRect.z > 0.0 && vHoleP.y > -0.2) {
          vec2 h = (vHoleP.xz - uHoleRect.xy) / uHoleRect.zw;
          if (h.x > 0.0 && h.x < 1.0 && h.y > 0.0 && h.y < 1.0 && texture2D(uHoleMap, h).r > 0.5) discard;
        }`,
      )
  }
  m.customProgramCacheKey = () => 'lane-holed'
  return m
}

// --- Geometry -------------------------------------------------------------------
// A box whose UVs are in metres on every face (studs keep their size); `topOnly`
// gives the top face its own material group (index 1) so the sides can be plain.
export function legoBox(w, h, d) {
  const g = new BoxGeometry(w, h, d)
  const uv = g.attributes.uv
  // Face order: +x, -x, +y, -y, +z, -z; 4 verts each.
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v
      uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1])
    }
  }
  return g
}
// Material array for legoBox: studs on top, `side` elsewhere.
export const topStuds = (top, side) => [side, side, top, side, side, side]

export function addBox(parent, w, h, d, mat, x, y, z, { shadow = true, rotY = 0 } = {}) {
  const m = new Mesh(legoBox(w, h, d), mat)
  m.position.set(x, y, z)
  m.rotation.y = rotY
  m.castShadow = shadow
  m.receiveShadow = true
  parent.add(m)
  return m
}

// A flat patch from a world-space outline [[x, z], ...]: top at `y`, `h` thick.
// Extrude caps use shape coordinates, so the UVs are metres.
export function patch(points, y, h, mat) {
  const s = new Shape()
  points.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)))
  s.closePath()
  const g = new ExtrudeGeometry(s, { depth: h, bevelEnabled: false })
  g.rotateX(-Math.PI / 2)
  const m = new Mesh(g, mat)
  m.position.y = y - h
  m.receiveShadow = true
  return m
}

// Raised border strips along a closed outline (the yellow trims).
export function border(parent, points, mat, { width = 0.6, height = 0.12, y = 0 } = {}) {
  for (let i = 0; i < points.length; i++) {
    const [ax, az] = points[i]
    const [bx, bz] = points[(i + 1) % points.length]
    const len = Math.hypot(bx - ax, bz - az)
    const m = new Mesh(legoBox(len + width, height, width), mat)
    m.position.set((ax + bx) / 2, y + height / 2, (az + bz) / 2)
    m.rotation.y = -Math.atan2(bz - az, bx - ax)
    m.receiveShadow = true
    parent.add(m)
  }
}

// --- Signs ------------------------------------------------------------------------
// A floating sign of stacked outlined text lines (paintTextStack), `height` m
// tall, repainted once Fredoka has loaded.
export function sign(lines, height, opts) {
  const t = paintTextStack(lines, opts)
  const tex = new CanvasTexture(t.canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  const sprite = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }))
  sprite.center.set(0.5, 0)
  const fit = () => sprite.scale.set((height * t.canvas.width) / t.canvas.height, height, 1)
  fit()
  fontReady.then(() => {
    t.draw()
    tex.dispose()
    tex.needsUpdate = true
    fit()
  })
  sprite.renderOrder = 5
  return sprite
}

// Repaints a sign() sprite with new lines (same height).
export function resign(sprite, lines, height, opts) {
  const t = paintTextStack(lines, opts)
  const tex = new CanvasTexture(t.canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  sprite.material.map?.dispose()
  sprite.material.map = tex
  sprite.material.needsUpdate = true
  sprite.scale.set((height * t.canvas.width) / t.canvas.height, height, 1)
}

export function canvasTex(c, { srgb = true, repeat = null } = {}) {
  const t = new CanvasTexture(c)
  if (srgb) t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  if (repeat) {
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(repeat[0], repeat[1])
  }
  return t
}

// --- Colliders --------------------------------------------------------------------
// A box collider given in a placed group's local frame (group: position + rotation.y).
export function localSolid(group, hx, hy, hz, lx, ly, lz, rotY = 0) {
  const yaw = group.rotation.y
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  const x = group.position.x + lx * c + lz * s
  const z = group.position.z - lx * s + lz * c
  solidBox(hx, hy, hz, x, group.position.y + ly, z, yaw + rotY)
}

// --- Batching ----------------------------------------------------------------------
// Mark a group whose meshes move (spinners, bobbing eggs): bakeStatic leaves it alone.
export function dynamic(obj) {
  obj.userData.dynamic = true
  return obj
}
function isStatic(o, root) {
  if (o.material?.isShaderMaterial || (Array.isArray(o.material) && o.material.some((m) => m.isShaderMaterial))) return false
  for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return false
  return true
}
// Merges every static mesh under `root` into one mesh per material (draw calls).
// Each dynamic group is merged on its own too (its parts move together).
export function bakeStatic(root) {
  const baked = bake(root, true, (o) => isStatic(o, root))
  baked.traverse((o) => (o.receiveShadow = true))
  root.add(baked)
  const movers = []
  root.traverse((o) => {
    if (o.userData.dynamic && !o.isMesh) movers.push(o)
  })
  for (const g of movers) {
    const inner = bake(g, true, (o) => !o.isPoints && !o.isSprite)
    g.add(inner)
  }
  return baked
}
