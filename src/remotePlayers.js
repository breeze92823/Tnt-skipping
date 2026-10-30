import { Group } from 'three'
import { COARSE_POINTER, NET, PLAYER_DIMS, RUN, TRAILS } from './config.js'
import { net, onNetMessage, roster } from './net.js'
import { createPetFollowers, parsePets } from './pet3d.js'
import { label } from './propkit.js'
import { buildDefaultCharacter, loadBaseCharacter } from './avatar/character.js'
import { applyProportions, attachEquippedAccessories } from './avatar/loader.js'
import { disposeAnimator, makeAnimator } from './avatar/animator.js'
import { applyThrow, THROW_PERIOD } from './throwAnim.js'
import { tntModel } from './lobby/tnt.js'

// The other players in the room, drawn in the world: their Bloxity avatar (skin, clothes and body
// proportions from the look JSON they send), the walk / run / jump animation derived from the
// pose the server relays, the overarm throw when they throw, their equipped pets hopping after
// them and a name tag. Their TNT in flight, its skips, smoke trail and blast come from the `fx`
// messages (run.js onFx) and reuse the local blast's particle buffers (blast.js remoteBoom).
//
// Kept cheap: diffed against the roster every frame (no join / leave events), nearest first and
// capped (fewer on touch), pets and the rig's animation only within NET.detailRange, nobody past
// NET.remoteFade, no shadows, rigs shared (one glTF, cloned), TNT models and pet geometry cached.

const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from))
const MAX = COARSE_POINTER ? NET.maxRemotesTouch : NET.maxRemotes
const GREEN = ['#ffffff', '#e8e4dc', '#c8ccd6']

class Remote {
  constructor(scene) {
    this.scene = scene
    this.group = new Group()
    this.group.visible = false
    scene.add(this.group)
    this.pets = createPetFollowers(scene, { max: NET.petsShown })
    this.avatar = null
    this.animator = null
    this.avatarJson = null // what the current rig was built from
    this.generation = 0
    this.applied = {} // pets / name as last applied
    this.label = null
    this.placed = false
    this.detail = true
    this.base = { x: 0, y: 0, z: 0, yaw: 0, speed: 0, at: 0, key: '' }
    this.lastY = 0
    this.vy = 0
    this.throwT = -1 // 0..1 through the throw animation, -1 off
    this.throwW = 0
    this.setAvatar(buildDefaultCharacter())
  }

  setAvatar(next) {
    if (this.avatar) this.group.remove(this.avatar)
    disposeAnimator(this.animator)
    this.avatar = next
    next.traverse((o) => o.isMesh && (o.castShadow = false)) // shadow passes add up in a full room
    this.group.add(next)
    this.animator = makeAnimator(next)
    if (this.animator) this.animator.layer = (pose, dt) => this.overlay(pose, dt)
  }

  // The throw arm, blended over the walk cycle (the same animation the local thrower plays).
  overlay(pose, dt) {
    this.throwW += ((this.throwT >= 0 ? 1 : 0) - this.throwW) * (1 - Math.exp(-12 * dt))
    applyThrow(pose, Math.max(0, this.throwT), this.throwW)
  }

  // A signed-in player's look arrives as JSON { equipped, proportions, skin }; "" = default.
  async syncAvatar(json) {
    if (json === this.avatarJson) return
    this.avatarJson = json
    const mine = ++this.generation
    if (!json) return this.setAvatar(buildDefaultCharacter())
    let look = null
    try {
      look = JSON.parse(json)
    } catch {
      return
    }
    try {
      const group = await loadBaseCharacter()
      if (mine !== this.generation) return
      await attachEquippedAccessories(group, look?.equipped, { skinTextureUrl: look?.skin || undefined })
      if (mine !== this.generation) return
      applyProportions(group, look?.proportions)
      this.setAvatar(group)
    } catch (err) {
      console.warn('[remote] avatar failed to load', err)
    }
  }

  // Pets and name: rebuilt only when they change.
  syncGear(p) {
    const a = this.applied
    if (p.pets !== a.pets) {
      a.pets = p.pets
      this.pets.setPets(parsePets(p.pets))
    }
    const name = p.username || 'Player'
    if (name !== a.name) {
      a.name = name
      if (this.label) {
        this.group.remove(this.label)
        this.label.material.map?.dispose()
        this.label.material.dispose()
      }
      this.label = label(name, 0.42, { color: '#ffffff', outline: '#1a0a14', font: '700 64px Fredoka, sans-serif', outlineWidth: 10 })
      this.label.position.y = PLAYER_DIMS.height + 0.55
      this.group.add(this.label)
    }
  }

  // Pets and the rig's animation only up close.
  setDetail(on) {
    if (on === this.detail) return
    this.detail = on
    this.pets.setVisible(on)
  }

  update(p, dt, t, now, near) {
    this.syncGear(p)
    this.syncAvatar(p.avatar)
    this.setDetail(near)

    // A new pose resets the dead-reckoning base.
    const b = this.base
    const key = `${p.x}|${p.y}|${p.z}|${p.yaw}|${p.speed}`
    if (key !== b.key) Object.assign(b, { key, x: p.x, y: p.y, z: p.z, yaw: p.yaw, speed: p.speed, at: now })
    const ahead = Math.min((now - b.at) / 1000, NET.predictMax) * b.speed
    // `yaw` is the avatar's facing; the walk direction is the same (the rig faces its heading).
    const tx = b.x + Math.sin(b.yaw) * ahead
    const tz = b.z + Math.cos(b.yaw) * ahead
    const g = this.group
    const far = Math.hypot(tx - g.position.x, tz - g.position.z) > 30
    const k = this.placed && !far ? 1 - Math.exp(-NET.remoteLerp * dt) : 1
    g.position.x += (tx - g.position.x) * k
    g.position.y += (b.y - g.position.y) * k
    g.position.z += (tz - g.position.z) * k
    g.rotation.y += angleDelta(g.rotation.y, b.yaw) * k
    this.vy = this.placed && dt > 0 ? this.vy + ((g.position.y - this.lastY) / dt - this.vy) * Math.min(1, dt * 10) : 0
    this.lastY = g.position.y
    this.placed = true

    if (this.throwT >= 0) {
      this.throwT += dt / THROW_PERIOD
      if (this.throwT >= 1) this.throwT = -1
    }
    if (near) {
      this.animator?.update(dt, { grounded: !p.air, speed: p.speed, verticalVelocity: p.air ? this.vy : 0, turn: 0 })
      this.pets.update(dt, t, g.position.x, g.position.y, g.position.z, g.rotation.y)
    }
  }

  hide() {
    this.group.visible = false
    this.pets.setVisible(false)
    this.detail = false
    this.placed = false // snap into place when it comes back
  }

  dispose() {
    this.generation++ // an avatar still loading is dropped
    this.scene.remove(this.group)
    disposeAnimator(this.animator)
    this.pets.dispose()
    this.group.remove(this.avatar) // rig geometry is shared with every other character
    if (this.label) {
      this.label.material.map?.dispose()
      this.label.material.dispose()
    }
  }
}

// Another player's TNT in flight: a clone of the cached model (geometry and materials are shared),
// eased toward the latest position they sent plus their speed for the time since.
class Flight {
  constructor(scene, msg) {
    const base = tntModel(msg.tnt || 'stick', 'remote')
    this.scene = scene
    this.group = base.group.clone(true)
    this.spinner = this.group.children[0]
    this.group.scale.setScalar(RUN.flightScale)
    this.group.visible = false
    scene.add(this.group)
    this.rest = base.rest
    this.colors = TRAILS.find((x) => x.id === msg.trail)?.colors ?? GREEN
    this.t = { x: 0, y: 0, z: 0, vz: 0, spin: 0, at: performance.now(), got: false }
    this.placed = false
    this.puffZ = 0
  }

  set(msg, now) {
    Object.assign(this.t, { x: msg.x ?? 0, y: msg.y ?? 0, z: msg.z ?? 0, vz: msg.vz ?? 0, spin: msg.spin ?? 0, at: now, got: true })
  }

  update(dt, now, blast) {
    const t = this.t
    const ahead = Math.min((now - t.at) / 1000, 0.25)
    const tz = t.z + t.vz * ahead
    const g = this.group
    const k = this.placed ? 1 - Math.exp(-18 * dt) : 1
    if (!this.placed) this.puffZ = tz
    g.position.x += (t.x - g.position.x) * k
    g.position.y += (Math.max(this.rest, t.y) - g.position.y) * k
    g.position.z += (tz - g.position.z) * k
    this.spinner.rotation.x = -t.spin
    g.rotation.y = Math.sin(t.spin * 0.21) * 0.35
    g.visible = this.placed = true
    // The smoke trail and fuse sparks, as the local throw's.
    if (t.vz) {
      while (this.puffZ > g.position.z + 2.2) {
        this.puffZ -= 2.2
        blast.puff(g.position.x, g.position.y, this.puffZ + 0.8, this.colors)
      }
      blast.remoteFuse(g.position.clone().setY(g.position.y + 0.8))
    }
  }

  dispose() {
    this.scene.remove(this.group) // geometry and materials belong to the cached model
  }
}

export function createRemotePlayers(scene, { blast }) {
  const remotes = new Map() // sessionId -> Remote
  const flights = new Map() // sessionId -> Flight
  const list = [] // reused each frame: [{ id, p, d }]
  let viewerZ = 0

  const near = (z) => Math.abs(z - viewerZ) <= NET.fxRange

  function endFlight(id) {
    flights.get(id)?.dispose()
    flights.delete(id)
  }

  // Throw effects relayed by the server (run.js onFx): the arm, the TNT in flight, a skip, the blast.
  onNetMessage('fx', (m) => {
    const now = performance.now()
    if (m.type === 'throw') {
      const who = remotes.get(m.id)
      if (who) who.throwT = 0
      endFlight(m.id)
      if (flights.size < NET.flyBuffer) flights.set(m.id, new Flight(scene, m))
    } else if (m.type === 'fly') flights.get(m.id)?.set(m, now)
    else if (m.type === 'skip') {
      if (near(m.z)) blast.skipPuff(m.x, m.z, RUN.zones[m.zone] ?? RUN.zones[0], m.k ?? 0.5)
    } else if (m.type === 'boom') {
      endFlight(m.id)
      if (near(m.z)) blast.remoteBoom(m.x, m.z, RUN.zones[m.zone] ?? RUN.zones[0], m.tier ?? 0)
    } else if (m.type === 'end') endFlight(m.id)
  })

  function clear() {
    for (const r of remotes.values()) r.dispose()
    remotes.clear()
    for (const id of [...flights.keys()]) endFlight(id)
  }

  return {
    get count() {
      return remotes.size
    },
    // viewer: this player's drawn position.
    update(dt, t, viewer) {
      viewerZ = viewer.z
      const players = roster()
      if (!players) return remotes.size && clear()
      const mine = net.sessionId
      list.length = 0
      players.forEach((p, id) => {
        if (id === mine) return
        list.push({ id, p, d: Math.hypot(p.x - viewer.x, p.z - viewer.z) })
      })
      list.sort((a, b) => a.d - b.d)
      const now = performance.now()
      const keep = new Set()
      for (let i = 0; i < Math.min(MAX, list.length); i++) {
        const { id, p, d } = list[i]
        keep.add(id)
        let r = remotes.get(id)
        if (!r) remotes.set(id, (r = new Remote(scene)))
        if (d > NET.remoteFade) {
          if (r.group.visible || r.placed) r.hide()
          continue
        }
        r.group.visible = true
        r.update(p, dt, t, now, d < NET.detailRange)
      }
      for (const [id, r] of remotes) {
        if (keep.has(id)) continue
        r.dispose()
        remotes.delete(id)
        endFlight(id)
      }
      // A flight whose player left, or that stopped updating (lost 'end'), is dropped.
      for (const [id, f] of flights) {
        if (!players.has(id) || now - f.t.at > 4000) endFlight(id)
        else if (f.t.got) f.update(dt, now, blast)
      }
    },
  }
}
