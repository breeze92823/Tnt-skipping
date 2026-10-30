import {
  CanvasTexture,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NearestFilter,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { LOBBY } from '../config.js'
import { neon } from '../propkit.js'
import { mulberry32 } from '../textures.js'
import { addBox, canvasTex, dynamic, localSolid, plain, resign, sign, studMat, topStuds } from './kit.js'
import { compact, hoursMinutes, paintEgg, paintGlitchScreen, paintLeaderboard } from './paint.js'

// The set pieces: Pirate Isles portal, Glitch Egg booth,
// the egg row with the lion showcase, the leaderboard stand and the giant
// TNT tower. Each builder returns { update(dt, t) } plus anchor points for fx.
const C = LOBBY.colors
const gold = () => new MeshStandardMaterial({ color: '#ffc21a', roughness: 0.3, metalness: 0.7, emissive: '#4a3000', emissiveIntensity: 0.3 })

const fxShaderEnd = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>`

// --- Pirate Isles portal ------------------------------------------------------------
function archShape(w, h) {
  const s = new Shape()
  const r = w / 2
  s.moveTo(-r, 0)
  s.lineTo(r, 0)
  s.lineTo(r, h - r)
  s.absarc(0, h - r, r, 0, Math.PI, false)
  s.lineTo(-r, 0)
  return s
}

// `look`: this world's sign and swirl (WORLDS portal). setOpen(on) flips the sign's second line.
export function buildPortal(scene, look) {
  const P = LOBBY.portal
  const g = new Group()
  g.position.set(P.x, 0.07, P.z)
  g.rotation.y = P.yaw
  const wood = studMat('#a8692f', { rough: 0.8 })
  const woodSide = plain('#93582a', 0.85)
  const red = plain('#d8261d', 0.5)
  const blue = plain('#2f6df0', 0.5)
  const goldM = gold()

  // Wooden base with steps.
  addBox(g, 7, 0.35, 2.6, topStuds(wood, woodSide), 0, 0.175, 0)
  addBox(g, 4.6, 0.18, 1, topStuds(wood, woodSide), 0, 0.09, 1.7)
  // Pillars: wood with red bands, gold rings, blue feet and gold lanterns on top.
  for (const x of [-2.55, 2.55]) {
    const foot = new Mesh(new CylinderGeometry(0.95, 1.05, 0.7, 16), blue)
    foot.position.set(x, 0.7, 0)
    g.add(foot)
    const post = new Mesh(new CylinderGeometry(0.78, 0.82, 5.2, 16), woodSide)
    post.position.set(x, 3.4, 0)
    post.castShadow = true
    g.add(post)
    for (const [y, h] of [[2.2, 1.3], [4.5, 0.9]]) {
      const band = new Mesh(new CylinderGeometry(0.84, 0.84, h, 16), red)
      band.position.set(x, y, 0)
      g.add(band)
    }
    for (const y of [1.15, 1.5, 2.9, 4.0, 5.0, 6.0]) {
      const ring = new Mesh(new TorusGeometry(0.85, 0.08, 6, 24), goldM)
      ring.rotation.x = Math.PI / 2
      ring.position.set(x, y, 0)
      g.add(ring)
    }
    const lantern = new Mesh(new CylinderGeometry(0.45, 0.55, 0.9, 8), plain('#ffd84a', 0.3, { emissive: '#ffb21a', emissiveIntensity: 0.9 }))
    lantern.position.set(x, 6.55, 0)
    g.add(lantern)
    const cap = new Mesh(new ConeGeometry(0.6, 0.5, 8), goldM)
    cap.position.set(x, 7.25, 0)
    g.add(cap)
  }
  // Top beam (planks) with gold trims and little gold kegs.
  addBox(g, 6.6, 0.9, 1.3, topStuds(wood, woodSide), 0, 6.3, 0)
  addBox(g, 6.7, 0.14, 1.36, goldM, 0, 5.88, 0)
  addBox(g, 6.7, 0.14, 1.36, goldM, 0, 6.72, 0)
  // Ship's wheel on top.
  const wheel = new Group()
  const wheelWood = plain('#c88a3a', 0.6)
  const rim = new Mesh(new TorusGeometry(1.1, 0.13, 8, 28), wheelWood)
  wheel.add(rim)
  const rim2 = new Mesh(new TorusGeometry(0.45, 0.1, 8, 20), goldM)
  wheel.add(rim2)
  const hub = new Mesh(new CylinderGeometry(0.22, 0.22, 0.4, 10), goldM)
  hub.rotation.x = Math.PI / 2
  wheel.add(hub)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const spoke = new Mesh(new CylinderGeometry(0.06, 0.07, 1.5, 6), wheelWood)
    spoke.position.set(Math.cos(a) * 0.75, Math.sin(a) * 0.75, 0)
    spoke.rotation.z = a - Math.PI / 2
    wheel.add(spoke)
    const knob = new Mesh(new CylinderGeometry(0.09, 0.07, 0.42, 6), wheelWood)
    knob.position.set(Math.cos(a) * 1.42, Math.sin(a) * 1.42, 0)
    knob.rotation.z = a - Math.PI / 2
    wheel.add(knob)
  }
  wheel.position.set(0, 7.9, 0)
  g.add(dynamic(wheel))

  // Arched gold frame and the swirling portal surface.
  const W = 3.4
  const H = 4.9
  const frame = archShape(W + 0.7, H + 0.35)
  frame.holes.push(archShape(W, H))
  const frameGeo = new ExtrudeGeometry(frame, { depth: 0.5, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2, curveSegments: 24 })
  frameGeo.translate(0, 0, -0.25)
  const frameMesh = new Mesh(frameGeo, goldM)
  frameMesh.position.y = 0.35
  frameMesh.castShadow = true
  g.add(frameMesh)
  const portalMat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uW: { value: W }, uH: { value: H }, uDeep: { value: new Vector3(...look.deep) }, uBright: { value: new Vector3(...look.bright) } },
    vertexShader: /* glsl */ `
      uniform float uW; uniform float uH; varying vec2 vUv;
      void main() { vUv = vec2(position.x / uW + 0.5, position.y / uH); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uDeep; uniform vec3 uBright; varying vec2 vUv;
      void main() {
        vec2 p = vUv - vec2(0.5, 0.45);
        p.x *= 0.7;
        float r = length(p);
        float a = atan(p.y, p.x);
        float swirl = sin(a * 4.0 + r * 22.0 - uTime * 3.5) * 0.5 + 0.5;
        float ripple = sin(r * 40.0 - uTime * 5.0) * 0.5 + 0.5;
        vec3 col = mix(uDeep, uBright, swirl * 0.55 + ripple * 0.15 + (1.0 - smoothstep(0.0, 0.5, r)) * 0.35);
        col += uBright * smoothstep(0.4, 0.5, max(abs(vUv.x - 0.5), 0.0)) * 0.6;
        gl_FragColor = vec4(col * 1.25, 1.0);
        ${fxShaderEnd}
      }`,
    side: DoubleSide,
  })
  const surface = new Mesh(new ShapeGeometry(archShape(W, H), 24), portalMat)
  surface.position.y = 0.35
  g.add(surface)
  // Yellow dashes on the ground in front of the portal.
  const dash = plain(C.trim, 0.5)
  for (let i = 0; i < 9; i++) {
    const a = -1.0 + (i / 8) * 2.0
    const m = addBox(g, 0.7, 0.05, 0.22, dash, Math.sin(a) * 4.6, 0.02, 2.6 + Math.cos(a) * 1.8, { shadow: false })
    m.rotation.y = -a
  }
  const light = new PointLight(look.light, 18, 14, 2)
  light.position.set(0, 2.6, 1.5)
  g.add(light)
  const titleLines = (sub) => [
    { text: look.title, px: 80, color: '#ffffff' },
    { text: sub, px: 48, color: '#ffffff' },
  ]
  const title = sign(titleLines(look.sub), 2.2)
  title.position.set(0, 9.4, 0)
  g.add(title)
  scene.add(g)
  for (const x of [-2.55, 2.55]) localSolid(g, 0.9, 3.5, 0.9, x, 3.5, 0)
  localSolid(g, 3.5, 0.6, 0.7, 0, 6.3, 0)

  return {
    group: g,
    setOpen(on) {
      if (look.open) resign(title, titleLines(on ? look.open : look.sub), 2.2)
    },
    // Point on the portal surface (local), for sparkles.
    surfacePoint(out, rand) {
      out.set((rand() - 0.5) * W * 0.9, 0.5 + rand() * H * 0.9, 0.1 + rand() * 0.8)
      return g.localToWorld(out)
    },
    update(dt, t) {
      portalMat.uniforms.uTime.value = t
      wheel.rotation.z = Math.sin(t * 0.8) * 0.25
      light.intensity = 16 + Math.sin(t * 4) * 3
    },
  }
}

// --- Glitch Egg booth ------------------------------------------------------------------
function pixelFace(rows, palette, scale = 8) {
  const c = document.createElement('canvas')
  c.width = rows[0].length * scale
  c.height = rows.length * scale
  const ctx = c.getContext('2d')
  ctx.fillStyle = palette['.'] ?? '#120a2e'
  ctx.fillRect(0, 0, c.width, c.height)
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const col = palette[row[i]]
      if (!col || row[i] === '.') continue
      ctx.fillStyle = col
      ctx.fillRect(i * scale, j * scale, scale, scale)
    }
  })
  const t = new CanvasTexture(c)
  t.magFilter = NearestFilter
  t.colorSpace = SRGBColorSpace
  return t
}
const FACES = {
  cat: [['........', '.k....k.', '.kk..kk.', '.kkkkkk.', '.kwkkwk.', '.kkkkkk.', '..kppk..', '........'], { '.': '#18e0ff', k: '#151520', w: '#7dff6a', p: '#ff7ab8' }],
  frog: [['........', '.gg..gg.', '.gwg.gwg', '.gggggg.', '.gggggg.', '.grrrrg.', '..gggg..', '........'], { '.': '#1a1036', g: '#3ad84a', w: '#ffffff', r: '#c0283a' }],
  pig: [['........', '.p....p.', '.pppppp.', '.pkppkp.', '.pp55pp.', '.p5kk5p.', '..pppp..', '........'], { '.': '#24104a', p: '#ff9ccc', k: '#2a0a1a', 5: '#ff6aa8' }],
}

function eggGeometry(r = 1, h = 2.4) {
  const pts = []
  for (let i = 0; i <= 16; i++) {
    const t = i / 16
    pts.push(new Vector2(Math.max(0.001, Math.pow(Math.sin(t * Math.PI), 0.75) * r * (1 - 0.18 * t)), t * h))
  }
  return new LatheGeometry(pts, 20)
}
function eggMaterial(kind) {
  const tex = new CanvasTexture(paintEgg(kind))
  tex.colorSpace = SRGBColorSpace
  tex.magFilter = NearestFilter
  return new MeshStandardMaterial({ map: tex, roughness: 0.45, flatShading: true })
}

export function buildGlitch(scene) {
  const G = LOBBY.glitch
  const g = new Group()
  g.position.set(G.x, 0.07, G.z)
  g.rotation.y = G.yaw
  const body = plain('#1b1450', 0.35, { metalness: 0.2 })
  const bodyDark = plain('#110c34', 0.4)
  const pink = neon('#ff2bd6', 3)
  const cyan = neon('#2bf0ff', 3)
  // Base deck with neon edges.
  addBox(g, 6.4, 0.35, 3.6, plain('#2a1a6a', 0.4), 0, 0.175, 0)
  for (const [x, z, w, d] of [[0, 1.8, 6.4, 0.12], [0, -1.8, 6.4, 0.12], [3.2, 0, 0.12, 3.6], [-3.2, 0, 0.12, 3.6]]) addBox(g, w, 0.12, d, pink, x, 0.32, z, { shadow: false })
  // Main cabinet.
  addBox(g, 3.4, 3.6, 2, body, 0, 2.15, -0.4)
  for (const [x, y, w, h] of [[-1.72, 2.15, 0.1, 3.6], [1.72, 2.15, 0.1, 3.6], [0, 3.95, 3.5, 0.1], [0, 0.4, 3.5, 0.1]]) addBox(g, w, h, 0.1, cyan, x, y, 0.62, { shadow: false })
  const screen = paintGlitchScreen()
  const screenTex = new CanvasTexture(screen.canvas)
  screenTex.colorSpace = SRGBColorSpace
  screenTex.magFilter = NearestFilter
  const scr = new Mesh(new PlaneGeometry(2.6, 2.1), new MeshBasicMaterial({ map: screenTex }))
  scr.position.set(0, 2.45, 0.62)
  g.add(scr)
  // Tilted GLITCH marquee.
  const mc = document.createElement('canvas')
  mc.width = 512
  mc.height = 128
  const mctx = mc.getContext('2d')
  const marqueeTex = new CanvasTexture(mc)
  marqueeTex.colorSpace = SRGBColorSpace
  const paintMarquee = () => {
    mctx.fillStyle = '#2a0f6a'
    mctx.fillRect(0, 0, 512, 128)
    mctx.font = '700 92px Fredoka, "Arial Black", sans-serif'
    mctx.textAlign = 'center'
    mctx.textBaseline = 'middle'
    mctx.fillStyle = '#2bf0ff'
    mctx.fillText('GLITCH', 262, 68)
    mctx.fillStyle = '#ff2bd6'
    mctx.fillText('GLITCH', 250, 64)
    mctx.fillStyle = '#ffffff'
    mctx.fillText('GLITCH', 256, 66)
    marqueeTex.needsUpdate = true
  }
  paintMarquee()
  document.fonts?.load('700 92px Fredoka').then(paintMarquee).catch(() => {})
  const marquee = new Mesh(new PlaneGeometry(3.4, 0.85), new MeshBasicMaterial({ map: marqueeTex }))
  marquee.position.set(0, 4.45, 0.15)
  marquee.rotation.set(-0.25, 0, -0.06)
  g.add(marquee)
  addBox(g, 3.6, 0.95, 0.2, bodyDark, 0, 4.42, 0.02).rotation.set(-0.25, 0, -0.06)
  // Side kiosks with pixel creatures.
  const kiosks = [['cat', -2.45, 1.5], ['frog', 2.45, 1.6], ['pig', 1.6, 0.9]]
  for (const [face, x, h] of kiosks) {
    const kz = face === 'pig' ? 1.05 : 0.2
    addBox(g, 1.4, h, 1.2, body, x, 0.35 + h / 2, kz)
    const [rows, pal] = FACES[face]
    const f = new Mesh(new PlaneGeometry(1.1, 1.1), new MeshBasicMaterial({ map: pixelFace(rows, pal) }))
    f.position.set(x, 0.35 + h - 0.62, kz + 0.61)
    g.add(f)
    addBox(g, 1.44, 0.08, 1.24, face === 'frog' ? cyan : pink, x, 0.35 + h, kz, { shadow: false })
  }
  // Rotating glitch egg on a neon ring on top.
  const ring = new Mesh(new TorusGeometry(0.75, 0.08, 8, 28), cyan)
  ring.rotation.x = Math.PI / 2
  ring.position.set(0, 5.2, -0.4)
  g.add(ring)
  const egg = new Mesh(eggGeometry(0.62, 1.5), eggMaterial('glitch'))
  egg.position.set(0, 5.25, -0.4)
  g.add(dynamic(egg))
  const light = new PointLight('#ff3ad6', 14, 12, 2)
  light.position.set(0, 2.5, 2.4)
  g.add(light)
  const title = sign(
    [
      { text: G.title, px: 72, gradient: ['#3affc8', '#2bf0ff', '#3affc8'], outline: '#0c2a2a' },
      { text: G.price, px: 46, color: '#ffffff' },
    ],
    1.9,
  )
  title.position.set(0, 7, -0.4)
  g.add(title)
  scene.add(g)
  localSolid(g, 3.2, 2.2, 1.8, 0, 2.2, 0)

  let next = 0
  return {
    group: g,
    point(out, rand) {
      out.set((rand() - 0.5) * 6, 0.5 + rand() * 4, -0.4 + (rand() - 0.2) * 3)
      return g.localToWorld(out)
    },
    update(dt, t) {
      egg.rotation.y = t * 1.2
      egg.position.y = 5.25 + Math.sin(t * 2) * 0.12
      if (t > next) {
        next = t + 0.12
        screen.draw(t)
        screenTex.needsUpdate = true
      }
      light.intensity = 12 + (Math.sin(t * 13) > 0.7 ? 6 : 0)
    },
  }
}

// --- Eggs and the lion showcase ---------------------------------------------------------
function eggPad(g, kind) {
  const goldM = gold()
  if (kind === 'wood') {
    addBox(g, 2.6, 0.35, 2.6, plain('#6b4524', 0.8), 0, 0.175, 0)
    addBox(g, 2.2, 0.08, 2.2, plain('#3a2a1a', 0.6), 0, 0.38, 0)
    for (const z of [-1.2, 1.2]) addBox(g, 2.62, 0.12, 0.16, goldM, 0, 0.3, z)
  } else if (kind === 'steel') {
    addBox(g, 2.6, 0.3, 2.6, plain('#8d99aa', 0.35, { metalness: 0.6 }), 0, 0.15, 0)
    addBox(g, 2.2, 0.08, 2.2, plain('#3c4656', 0.4, { metalness: 0.5 }), 0, 0.34, 0)
  } else if (kind === 'gold') {
    addBox(g, 2.6, 0.32, 2.6, goldM, 0, 0.16, 0)
    addBox(g, 2.2, 0.08, 2.2, plain('#2a2a2a', 0.4), 0, 0.36, 0)
  } else {
    addBox(g, 2.7, 0.3, 2.7, plain('#ff4fb8', 0.35), 0, 0.15, 0)
    addBox(g, 2.3, 0.08, 2.3, neon('#ff6ad0', 2.2), 0, 0.34, 0, { shadow: false })
  }
}

function lion() {
  const g = new Group()
  const fur = plain('#f08a1e', 0.6)
  const mane = plain('#c9561a', 0.7)
  const face = plain('#ffc77a', 0.6)
  const black = plain('#1a1a1a', 0.4)
  addBox(g, 1.1, 0.9, 1.5, fur, 0, 0.9, -0.1)
  for (const [x, z] of [[-0.35, 0.45], [0.35, 0.45], [-0.35, -0.6], [0.35, -0.6]]) addBox(g, 0.34, 0.6, 0.34, fur, x, 0.3, z)
  addBox(g, 1.6, 1.5, 0.6, mane, 0, 1.75, 0.45)
  addBox(g, 1.1, 1.0, 0.7, fur, 0, 1.7, 0.75)
  addBox(g, 0.7, 0.4, 0.2, face, 0, 1.45, 1.12)
  for (const x of [-0.25, 0.25]) addBox(g, 0.16, 0.2, 0.05, black, x, 1.85, 1.11)
  addBox(g, 0.2, 0.12, 0.06, black, 0, 1.58, 1.23)
  for (const x of [-0.45, 0.45]) addBox(g, 0.26, 0.26, 0.2, mane, x, 2.3, 0.7)
  addBox(g, 0.18, 0.18, 0.9, fur, 0, 1.0, -1.15).rotation.x = -0.6
  addBox(g, 0.3, 0.3, 0.3, mane, 0, 1.3, -1.5)
  // Crown.
  const goldM = gold()
  const band = new Mesh(new CylinderGeometry(0.45, 0.45, 0.25, 12, 1, true), goldM)
  band.position.set(0, 2.45, 0.7)
  g.add(band)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    const s = new Mesh(new ConeGeometry(0.09, 0.3, 5), goldM)
    s.position.set(Math.cos(a) * 0.45, 2.7, 0.7 + Math.sin(a) * 0.45)
    g.add(s)
  }
  return g
}

export function buildEggs(scene) {
  const root = new Group()
  const spinners = []
  const anchors = []
  for (const E of LOBBY.eggs) {
    const g = new Group()
    g.position.set(E.x, 0.07, E.z)
    eggPad(g, E.pad)
    const egg = new Group()
    const shell = new Mesh(eggGeometry(0.95, 2.3), eggMaterial(E.kind))
    shell.castShadow = true
    egg.add(shell)
    if (E.kind === 'rare') {
      const spike = plain('#3fb4ff', 0.3)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        const c = new Mesh(new ConeGeometry(0.22, 0.7, 4), spike)
        c.position.set(Math.cos(a) * 0.9, 1.0 + (i % 2) * 0.4, Math.sin(a) * 0.9)
        c.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2)
        egg.add(c)
      }
      const crown = new Mesh(new ConeGeometry(0.35, 0.6, 5), gold())
      crown.position.y = 2.5
      egg.add(crown)
    } else if (E.kind === 'rainbow') {
      const halo = new Mesh(new TorusGeometry(0.55, 0.07, 8, 28), gold())
      halo.rotation.x = Math.PI / 2
      halo.position.y = 2.75
      egg.add(halo)
      const cols = ['#ff3b3b', '#ff9a1f', '#ffe11f', '#3bdc4a', '#2fa8ff', '#9a4dff']
      for (const side of [-1, 1]) {
        cols.forEach((col, i) => {
          const f = addBox(egg, 1.1 - i * 0.08, 0.06, 0.32, plain(col, 0.4), side * (1.25 + i * 0.05), 1.3 + i * 0.16, 0, { shadow: false })
          f.rotation.z = side * (0.5 + i * 0.12)
        })
      }
    } else if (E.kind === 'uncommon') {
      const leaf = plain('#2fa62a', 0.6)
      for (let i = 0; i < 4; i++) {
        const l = addBox(egg, 0.2, 0.6, 0.5, leaf, Math.cos(i * 1.57) * 0.18, 2.4, Math.sin(i * 1.57) * 0.18)
        l.rotation.set(Math.sin(i * 1.57) * 0.5, 0, -Math.cos(i * 1.57) * 0.5)
      }
    }
    egg.position.y = 0.45
    g.add(dynamic(egg))
    spinners.push(egg)
    const nameLine =
      E.kind === 'rainbow'
        ? { text: E.name, px: 64, gradient: ['#ff3b3b', '#ffd21a', '#3bdc4a', '#2fa8ff', '#c04dff'] }
        : { text: E.name, px: 64, color: E.kind === 'rare' ? '#ffe680' : '#fff2c8' }
    const cost = E.cost.includes('ROBUX') ? `⓪ ${E.cost}` : `\u{1F3C6} ${E.cost}`
    const l = sign([nameLine, { text: cost, px: 46, color: '#ffd21a' }], 1.6)
    l.position.set(0, 4, 0)
    g.add(l)
    root.add(g)
    anchors.push(g.position)
    localSolid(g, 1.3, 1.4, 1.3, 0, 1.4, 0)
  }

  // Lion showcase on a red/gold pedestal.
  const S = LOBBY.showcase
  const sg = new Group()
  sg.position.set(S.x, 0.07, S.z)
  addBox(sg, 3.6, 0.4, 3.6, gold(), 0, 0.2, 0)
  addBox(sg, 3.1, 0.2, 3.1, plain('#b0121a', 0.4), 0, 0.5, 0)
  addBox(sg, 2.4, 0.1, 2.4, plain('#1a1a1a', 0.4), 0, 0.62, 0)
  const pet = lion()
  pet.position.y = 0.67
  sg.add(dynamic(pet))
  const sl = sign(
    [
      { text: S.lines[0], px: 44, color: '#ffffff' },
      { text: S.lines[1], px: 66, color: '#ff2a55', outline: '#2a0010' },
      { text: S.lines[2], px: 54, gradient: ['#ff3b3b', '#ffd21a', '#3bdc4a', '#2fa8ff', '#c04dff'] },
      { text: S.lines[3], px: 40, color: '#e8e8e8' },
    ],
    3,
  )
  sl.position.set(0, 4.2, 0)
  sg.add(sl)
  root.add(sg)
  localSolid(sg, 1.8, 0.35, 1.8, 0, 0.35, 0)
  anchors.push(sg.position)
  scene.add(root)
  return {
    anchors,
    update(dt, t) {
      spinners.forEach((e, i) => {
        e.rotation.y = t * 0.7 + i * 1.3
        e.position.y = 0.45 + Math.sin(t * 2 + i) * 0.12
      })
      pet.rotation.y = Math.sin(t * 0.7) * 0.6
    },
  }
}

// --- Leaderboard stand -----------------------------------------------------------------
export function buildLeaderboards(scene) {
  const L = LOBBY.leaderboards
  const g = new Group()
  g.position.set(0, 0.07, L.z)
  const stone = studMat('#b9bcc2', { alt: '#cfd2d6' })
  const stoneSide = plain('#9aa0a8', 0.8)
  addBox(g, 26, 0.6, 7, topStuds(stone, stoneSide), 0, 0.3, 0.5)
  addBox(g, 10, 0.3, 1, topStuds(stone, stoneSide), 0, 0.15, -3.4)
  localSolid(g, 13, 0.3, 3.5, 0, 0.3, 0.5)
  localSolid(g, 5, 0.15, 0.5, 0, 0.15, -3.4)
  const wood = studMat('#9a6332', { rough: 0.85 })
  const woodSide = plain('#80502a', 0.85)
  const leaf = studMat('#3cc63a')
  // `stat` = the server's leaderboard key behind each screen (backend LEADERBOARD_STATS).
  const boards = [
    { x: -10.6, w: 4, yaw: 0.55, title: L.titles[0], stat: 'wins' },
    { x: -4.2, w: 7.6, yaw: 0, title: L.titles[1], stat: 'playtime', format: hoursMinutes },
    { x: 4.2, w: 7.6, yaw: 0, title: L.titles[2], stat: 'bestDistance', format: (n) => `${Math.round(n)} m` },
    { x: 10.6, w: 4, yaw: -0.55, title: L.titles[3], stat: 'skill' },
  ]
  const screens = []
  boards.forEach((b, i) => {
    const bg = new Group()
    // Boards face north, toward the plaza; listed west-to-east as seen from the plaza.
    bg.position.set(-b.x, 0.6, 1.6 - (b.yaw ? 1 : 0))
    bg.rotation.y = Math.PI + b.yaw
    const H = 4.6
    for (const x of [-b.w / 2 - 0.3, b.w / 2 + 0.3]) addBox(bg, 0.6, H + 1.2, 0.6, topStuds(wood, woodSide), x, (H + 1.2) / 2, 0)
    addBox(bg, b.w + 1.4, 0.6, 0.9, topStuds(wood, woodSide), 0, H + 1.2, 0)
    addBox(bg, b.w + 0.2, H, 0.3, plain('#2a1a0e', 0.8), 0, H / 2 + 0.6, -0.1)
    const tex = canvasTex(paintLeaderboard(b.title, 10))
    screens.push({ tex, b })
    const scr = new Mesh(new PlaneGeometry(b.w, H - 0.2), new MeshBasicMaterial({ map: tex }))
    scr.position.set(0, H / 2 + 0.6, 0.06)
    bg.add(scr)
    // Grass tufts on the top beam.
    for (let k = 0; k < Math.round(b.w / 1.6); k++) addBox(bg, 0.7, 0.5, 0.6, topStuds(leaf, plain('#34b234')), -b.w / 2 + 0.6 + k * 1.6, H + 1.75, 0)
    const t = sign([{ text: b.title, px: 54, color: '#ffffff', italic: true }], 0.8)
    t.position.set(0, H + 2.1, 0.2)
    bg.add(t)
    g.add(bg)
    // bg sits inside g: give the collider its world placement.
    const world = { position: bg.position.clone().add(g.position), rotation: bg.rotation }
    localSolid(world, b.w / 2 + 0.6, 3, 0.4, 0, 3, 0)
  })
  scene.add(g)
  // Repaints the four screens from the server's lists ({ wins|playtime|bestDistance|skill: [{ name, value }] }).
  return {
    setBoards(lists) {
      for (const { tex, b } of screens) {
        paintLeaderboard(b.title, 10, lists?.[b.stat] ?? null, b.format ?? compact, 256, 320, tex.image)
        tex.needsUpdate = true
      }
    },
  }
}

// --- Giant TNT tower ---------------------------------------------------------------------
// `look`: this world's colours (WORLDS tower).
export function buildTower(scene, look) {
  const T = LOBBY.tower
  const g = new Group()
  g.position.set(T.x, 0, T.z)
  const red = plain(look.body, 0.5)
  const white = plain(look.light, 0.5)
  const black = plain(look.dark, 0.5)
  const bands = [[0, 8, red], [8, 10.5, black], [10.5, 24, red], [24, 27, white], [27, 31, red], [31, 34, white], [34, T.height, red]]
  for (const [a, b, m] of bands) {
    const c = new Mesh(new CylinderGeometry(T.radius, T.radius, b - a, 32), m)
    c.position.y = (a + b) / 2
    c.castShadow = true
    c.receiveShadow = true
    g.add(c)
  }
  const cap = new Mesh(new CylinderGeometry(T.radius * 0.96, T.radius, 0.6, 32), plain(look.cap, 0.6))
  cap.position.y = T.height + 0.3
  g.add(cap)
  const fusePts = [new Vector3(0, T.height + 0.5, 0), new Vector3(0.5, T.height + 3, 0.2), new Vector3(2.2, T.height + 5, 0.4), new Vector3(3.6, T.height + 5.2, 0.3)]
  const fuse = new Mesh(new TubeGeometry(new CatmullRomCurve3(fusePts), 20, 0.32, 8), plain('#6a4a2a', 0.9))
  g.add(fuse)
  scene.add(g)
  const solid = { x: T.x, z: T.z }
  localSolid(g, T.radius * 0.8, T.height / 2, T.radius * 0.8, 0, T.height / 2, 0)
  return { tip: new Vector3(T.x + 3.6, T.height + 5.2, T.z + 0.3), solid }
}

// A seeded random for fx anchors.
export const fxRand = mulberry32(8080)
