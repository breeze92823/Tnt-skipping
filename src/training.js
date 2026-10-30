import {
  AdditiveBlending,
  CanvasTexture,
  CircleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { TRAIN } from './config.js'
import { sfx } from './audio.js'
import { emitter, setRGB, textures } from './lobby/fx.js'
import { laneMultiplier, lanePads, laneRebirths } from './lobby/lanes.js'
import { models } from './lobby/tnt.js'

// Lane training. Lanes cannot be entered (lanes.js blocks them): the player stands on the
// pad in front of a lane and, while it is unlocked, throws the equipped TNT down it by
// itself every TRAIN.cooldown seconds. The arm swing is the animator's throw overlay; the
// TNT leaves the hand at TRAIN.release, flies in an arc, and blows up on the lane with a
// flash, shockwave rings, fire, smoke, sparks and flying bricks. The blast pays the TNT's
// Skill x the lane multiplier (x the SKILL multiplier).

const ease = (t) => 1 - (1 - t) * (1 - t) * (1 - t)
const FLY_MODELS = new Set(['stick', 'bomb', 'trio', 'bundle', 'barrel'])
const EAST = Math.PI / 2 // player.facing toward +X

// Particles are queued here and picked up by the emitters' spawn() as slots free up.
function burstEmitter(scene, opts) {
  const queue = []
  const e = emitter(scene, {
    ...opts,
    spawn(p) {
      const q = queue.pop()
      if (!q) {
        p.x = p.y = p.z = p.vx = p.vy = p.vz = 0
        p.life = 0.05
        p.size = 0
        return
      }
      p.x = q.x
      p.y = q.y
      p.z = q.z
      p.vx = q.vx
      p.vy = q.vy
      p.vz = q.vz
      p.life = q.life
      p.size = q.size
      setRGB(p, q.color, 0.25)
    },
  })
  return {
    e,
    add(x, y, z, vx, vy, vz, life, size, color) {
      if (queue.length < 400) queue.push({ x, y, z, vx, vy, vz, life, size, color })
    },
  }
}

function makePopup(scene) {
  const c = document.createElement('canvas')
  c.width = 320
  c.height = 112
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  const sprite = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, fog: false }))
  sprite.renderOrder = 12
  sprite.visible = false
  scene.add(sprite)
  return {
    sprite,
    age: 99,
    draw(text, color) {
      const ctx = c.getContext('2d')
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.font = '700 72px Fredoka, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 14
      ctx.strokeStyle = '#1a1208'
      ctx.strokeText(text, c.width / 2, c.height / 2)
      ctx.fillStyle = color
      ctx.fillText(text, c.width / 2, c.height / 2)
      tex.needsUpdate = true
    },
  }
}

export function createTraining({ scene, progress, hud, player, getAnimator, lanes }) {
  const pads = lanePads()
  const group = new Group()
  scene.add(group)

  // --- Pad glow: lights up the pad the player trains on. ---
  const glowGeo = new PlaneGeometry(1, 1)
  glowGeo.rotateX(-Math.PI / 2)
  for (const pad of pads) {
    pad.glow = new Mesh(glowGeo, new MeshBasicMaterial({ color: pad.lane.track, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }))
    pad.glow.scale.setScalar(TRAIN.padSize + 0.3)
    pad.glow.position.set(pad.cx, 0.24, pad.cz)
    group.add(pad.glow)
    pad.level = 0
  }

  // --- Effects ---
  const fire = burstEmitter(scene, { count: 220, texture: 'dot', shrink: 0.7, drag: 1.6, gravity: 2 })
  const smoke = burstEmitter(scene, { count: 90, texture: 'dot', additive: false, shrink: -0.9, drag: 1.2, gravity: 1.4 })
  const sparks = burstEmitter(scene, { count: 220, texture: 'sparkle', shrink: 0.6, drag: 0.4, gravity: -16 })
  const bricks = burstEmitter(scene, { count: 90, texture: 'square', additive: false, shrink: 0.2, drag: 0.1, gravity: -24 })

  const ringGeo = new RingGeometry(0.82, 1, 56)
  ringGeo.rotateX(-Math.PI / 2)
  const domeGeo = new SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  const scorchGeo = new CircleGeometry(1, 28)
  scorchGeo.rotateX(-Math.PI / 2)
  const flashTex = textures.dot()

  const blasts = []
  function makeBlast() {
    const mk = (geo, color, extra) => {
      const m = new Mesh(geo, new MeshBasicMaterial({ color, transparent: true, depthWrite: false, ...extra }))
      m.visible = false
      m.renderOrder = 7
      group.add(m)
      return m
    }
    const flash = new Sprite(new SpriteMaterial({ map: flashTex, color: '#ffe9a0', transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false }))
    flash.visible = false
    flash.renderOrder = 8
    group.add(flash)
    const scorch = mk(scorchGeo, '#120c06', { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    return {
      busy: false,
      age: 0,
      r: 6,
      flash,
      ring: mk(ringGeo, '#fff1c4', { blending: AdditiveBlending, side: DoubleSide }),
      ring2: mk(ringGeo, '#ffffff', { blending: AdditiveBlending, side: DoubleSide }),
      dome: mk(domeGeo, '#ffc060', { blending: AdditiveBlending, side: DoubleSide }),
      scorch,
    }
  }
  const BLAST_LIFE = 2.6

  // --- TNT in the air / in the hand ---
  const pools = new Map() // look -> [{ m, fuse, busy }]
  function tntModel(look) {
    const key = FLY_MODELS.has(look) ? look : 'stick'
    if (!pools.has(key)) pools.set(key, [])
    const pool = pools.get(key)
    let it = pool.find((x) => !x.busy)
    if (!it) {
      const fuses = []
      const m = models[key](fuses)
      group.add(m)
      it = { m, fuse: fuses[0]?.local ?? new Vector3(0, 1.4, 0), busy: false }
      pool.push(it)
    }
    it.busy = true
    it.m.visible = false
    return it
  }
  const flying = [] // { m, fuse, from, to, t, T, h, pad, gain, spin }
  const popups = Array.from({ length: 5 }, () => makePopup(scene))
  let popupAt = 0

  function popup(text, color, x, y, z, size = 1) {
    const p = popups[popupAt++ % popups.length]
    p.draw(text, color)
    p.age = 0
    p.size = size
    p.x = x
    p.y = y
    p.z = z
    p.sprite.visible = true
  }

  // --- State ---
  let cooldown = 0
  let activePad = null // pad the player stands on
  let swing = null // { pad, t, released, held }
  let shake = 0
  const shakeOffset = new Vector3()
  const hand = new Vector3()
  const tmp = new Vector3()

  const onPad = (pad) => {
    const r = pad.half + TRAIN.padGrace
    return Math.abs(player.position.x - pad.cx) <= r && Math.abs(player.position.z - pad.cz) <= r && player.grounded
  }

  function messageFor(pad) {
    const need = laneRebirths(pad.lane)
    if (!Number.isFinite(need)) return `${pad.lane.mult} needs ${pad.lane.req} Robux. Purchases are coming soon!`
    if (progress.state.rebirths < need) return `Rebirth ${need - progress.state.rebirths} more time${need - progress.state.rebirths > 1 ? 's' : ''} to train on ${pad.lane.mult}!`
    if (progress.levelBar().max) return 'Level maxed! Rebirth to keep training.'
    return null
  }

  function startSwing(pad) {
    cooldown = TRAIN.cooldown
    const tnt = progress.tntOf(progress.state.tnt)
    const held = tntModel(tnt?.look)
    swing = { pad, t: 0, released: false, held, look: tnt?.look, skill: tnt?.skill ?? 1 }
    player.facing = EAST
    getAnimator()?.playThrow()
    sfx.whoosh()
  }

  function release() {
    const { pad, held } = swing
    swing.released = true
    const a = getAnimator()
    const gotHand = a?.handPosition(hand)
    if (!gotHand) hand.set(player.position.x + 0.5, player.position.y + 1.7, player.position.z)
    // Landing point: somewhere down the lane's mid section.
    const L = pad.land
    const to = new Vector3(L.x0 + Math.random() * (L.x1 - L.x0), pad.surfaceY + 0.35, L.zc + (Math.random() * 2 - 1) * L.z)
    const dist = Math.hypot(to.x - hand.x, to.z - hand.z)
    // The model that rode in the hand now flies.
    held.m.visible = true
    held.m.scale.setScalar(0.62)
    flying.push({
      m: held,
      from: hand.clone(),
      to,
      t: 0,
      T: TRAIN.flight.base + dist * TRAIN.flight.perMetre,
      h: TRAIN.arc.base + dist * TRAIN.arc.perMetre,
      pad,
      skill: swing.skill,
      spin: 9 + Math.random() * 4,
    })
  }

  function explode(f) {
    const pad = f.pad
    const mul = laneMultiplier(pad.lane)
    const x = f.to.x
    const z = f.to.z
    const y = pad.surfaceY
    const k = 0.85 + Math.min(1, Math.log2(Math.max(1, mul)) / 5.7) * 0.6 // 1x ~0.85 .. 50x ~1.45
    const R = 5.5 * k

    const b = blasts.find((q) => !q.busy) ?? blasts[0]
    b.busy = true
    b.age = 0
    b.r = R
    b.flash.position.set(x, y + 1.2, z)
    b.ring.position.set(x, y + 0.04, z)
    b.ring2.position.set(x, y + 0.05, z)
    b.dome.position.set(x, y, z)
    b.scorch.position.set(x, y + 0.02, z)
    b.ring2.material.color.set(pad.lane.track)
    b.scorch.visible = b.ring.visible = b.dome.visible = b.flash.visible = true
    b.ring2.visible = false

    const rnd = (a = 1) => (Math.random() * 2 - 1) * a
    for (let i = 0; i < 70 * k; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 2 + Math.random() * 7 * k
      fire.add(x + rnd(0.5), y + 0.4, z + rnd(0.5), Math.cos(a) * sp, 2 + Math.random() * 7, Math.sin(a) * sp, 0.4 + Math.random() * 0.5, (2.2 + Math.random() * 2.6) * k, Math.random() < 0.5 ? '#ff9a1a' : Math.random() < 0.5 ? '#ffd23a' : '#ff5a1a')
    }
    for (let i = 0; i < 26 * k; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 1 + Math.random() * 4
      smoke.add(x + rnd(0.8), y + 0.8, z + rnd(0.8), Math.cos(a) * sp, 2 + Math.random() * 3, Math.sin(a) * sp, 1.1 + Math.random() * 0.9, (2.2 + Math.random() * 2) * k, Math.random() < 0.5 ? '#3a3633' : '#5c5650')
    }
    for (let i = 0; i < 70 * k; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 4 + Math.random() * 12
      sparks.add(x, y + 0.6, z, Math.cos(a) * sp, 4 + Math.random() * 11, Math.sin(a) * sp, 0.6 + Math.random() * 0.8, 0.45 + Math.random() * 0.5, Math.random() < 0.5 ? '#fff2a0' : '#ffb24a')
    }
    const colours = ['#e8231c', '#2f6df0', '#ffd21a', '#ffffff']
    for (let i = 0; i < 30 * k; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 3 + Math.random() * 9
      bricks.add(x + rnd(0.4), y + 0.5, z + rnd(0.4), Math.cos(a) * sp, 6 + Math.random() * 9, Math.sin(a) * sp, 1 + Math.random() * 0.8, 0.28 + Math.random() * 0.3, colours[i % 4])
    }

    // The pay-out.
    const gained = progress.addSkill(f.skill * mul)
    if (gained > 0) popup(`+${Math.round(gained).toLocaleString('en-US')}`, '#ffe14a', x, y + 3, z, 0.9 + (k - 0.85) * 0.5)
    sfx.boom(0.5 + (k - 0.85) * 0.4)

    // Camera shake, weaker the further the blast is from the camera.
    const d = Math.hypot(player.position.x - x, player.position.z - z)
    shake = Math.max(shake, TRAIN.shake * Math.max(0.35, 1 - d / 60) * k)
  }

  for (let i = 0; i < 3; i++) blasts.push(makeBlast())

  function updateBlast(b, dt) {
    if (!b.busy) return
    b.age += dt
    const a = b.age
    const R = b.r
    // Flash.
    const f = a / 0.22
    if (f < 1) {
      b.flash.scale.setScalar(R * (1.2 + f * 1.8))
      b.flash.material.opacity = 1 - f
    } else b.flash.visible = false
    // Shockwave rings run out across the lane floor.
    const r1 = a / 0.55
    if (r1 < 1) {
      b.ring.scale.setScalar(0.4 + ease(r1) * R * 1.25)
      b.ring.material.opacity = (1 - r1) * 0.95
    } else b.ring.visible = false
    const r2 = (a - 0.08) / 0.75
    if (r2 > 0 && r2 < 1) {
      b.ring2.visible = true
      b.ring2.scale.setScalar(0.4 + ease(r2) * R * 1.7)
      b.ring2.material.opacity = (1 - r2) * 0.7
    } else b.ring2.visible = false
    // The dome of the blast front.
    const d = a / 0.4
    if (d < 1) {
      b.dome.scale.setScalar(0.5 + ease(d) * R * 0.85)
      b.dome.material.opacity = (1 - d) * 0.45
    } else b.dome.visible = false
    // Scorch mark fades slowly.
    b.scorch.scale.setScalar(R * 0.42)
    b.scorch.material.opacity = Math.max(0, 0.5 * (1 - a / BLAST_LIFE))
    if (a >= BLAST_LIFE) {
      b.busy = false
      b.scorch.visible = false
    }
  }

  function update(dt, camera) {
    cooldown = Math.max(0, cooldown - dt)

    // Which pad is the player on?
    const was = activePad
    activePad = null
    for (const pad of pads) if (onPad(pad)) {
      activePad = pad
      break
    }
    if (activePad && activePad !== was) {
      const msg = messageFor(activePad)
      if (msg) {
        hud.toast(msg)
        sfx.deny()
      }
    }

    // Throwing.
    const msg = activePad ? messageFor(activePad) : 'x'
    if (activePad && !msg && !swing && cooldown <= 0) startSwing(activePad)
    if (swing) {
      swing.t += dt
      if (!swing.released) {
        // The TNT rides in the hand during the wind-up.
        const a = getAnimator()
        if (a?.handPosition(hand)) {
          swing.held.m.visible = true
          swing.held.m.scale.setScalar(0.5)
          swing.held.m.position.copy(hand).add(tmp.set(0, 0.1, 0))
          swing.held.m.rotation.set(0, 0, 0)
        }
        if (swing.t >= TRAIN.release) release()
      } else if (swing.t >= TRAIN.release + 0.4) swing = null
    }

    // TNT flights.
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i]
      f.t += dt
      const u = Math.min(1, f.t / f.T)
      f.m.m.position.set(f.from.x + (f.to.x - f.from.x) * u, f.from.y + (f.to.y - f.from.y) * u + 4 * f.h * u * (1 - u), f.from.z + (f.to.z - f.from.z) * u)
      f.m.m.rotation.z -= f.spin * dt
      // A fuse trail.
      tmp.copy(f.m.fuse).multiplyScalar(f.m.m.scale.x).applyEuler(f.m.m.rotation).add(f.m.m.position)
      sparks.add(tmp.x, tmp.y, tmp.z, rndv(1.2), 1 + Math.random() * 1.5, rndv(1.2), 0.3, 0.3, '#ffcf4a')
      fire.add(tmp.x, tmp.y, tmp.z, rndv(0.6), 0.5, rndv(0.6), 0.25, 0.35, '#ff7a1a')
      if (u >= 1) {
        f.m.m.visible = false
        f.m.busy = false
        flying.splice(i, 1)
        explode(f)
      }
    }

    for (const b of blasts) updateBlast(b, dt)

    // Pads glow while their player trains.
    for (const pad of pads) {
      const active = pad === activePad && !messageFor(pad)
      const target = active ? 0.55 + Math.sin(performance.now() / 120) * 0.15 : pad === activePad ? 0.15 : 0
      pad.level += (target - pad.level) * Math.min(1, dt * 10)
      pad.glow.material.opacity = pad.level
      pad.glow.visible = pad.level > 0.01
    }

    // Popups rise and fade.
    for (const p of popups) {
      if (!p.sprite.visible) continue
      p.age += dt
      const u = p.age / 1.1
      if (u >= 1) {
        p.sprite.visible = false
        continue
      }
      const pop = u < 0.15 ? 0.6 + (u / 0.15) * 0.5 : 1.1 - (u - 0.15) * 0.15
      p.sprite.position.set(p.x, p.y + u * 2.4, p.z)
      p.sprite.scale.set(4.4 * pop * p.size, 1.54 * pop * p.size, 1)
      p.sprite.material.opacity = u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4
    }

    // Camera shake (applied after the camera update).
    shake *= Math.exp(-dt * 6)
    if (shake > 0.002) {
      shakeOffset.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake)
      camera.position.add(shakeOffset)
    }
  }

  // The signs flip to UNLOCKED as rebirths come in.
  const syncSigns = () => lanes.setRebirths(progress.state.rebirths)
  progress.onChange(syncSigns)
  syncSigns()

  return { update }
}

const rndv = (a) => (Math.random() * 2 - 1) * a
