import { Vector3 } from 'three'
import { LOBBY, NET, RUN, TNTS, TRAILS } from './config.js'
import { tntModel } from './lobby/tnt.js'
import { buildZones, laneZ } from './runScenery.js'
import { skillPopup, winsReward, zoneBanner } from './fx.js'
import { sfx } from './audio.js'

// A throw down the lane (Bowling Roll's run.js, without steering or pins): Skill sets the
// range, and the TNT leaves the hand in one big arc, then skips along the lane in shorter
// and shorter hops until it stops dead, each skip paying Skill with a note a step higher.
// Its fuse then burns down, it blows (blast.js) with a moment of slow motion, a screen
// flash and a kick of the camera, the blast pays Skill and the zone's Wins, and the camera
// holds on the crater before easing back to the player. Phases: idle -> fly -> fuse ->
// blast -> return -> idle. A low chase camera blends over camera.js from just after the
// release. Zones past the lobby are built once per world and only shown near the focus.

const R = LOBBY.runway
const X0 = R.minX + RUN.edgeMargin
const X1 = R.maxX - RUN.edgeMargin
const clampX = (x) => Math.min(X1, Math.max(X0, x))
const G = RUN.gravity
const GREEN = ['#ffffff', '#e8e4dc', '#c8ccd6'] // the throw's smoke with no trail equipped

// White streaks radiating from the screen centre while the TNT is fast.
function speedLines() {
  const c = document.createElement('canvas')
  c.className = 'speed-lines'
  document.body.appendChild(c)
  const ctx = c.getContext('2d')
  const lines = Array.from({ length: 26 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), v: 0.6 + Math.random() }))
  return (dt, strength) => {
    if (c.width !== window.innerWidth || c.height !== window.innerHeight) {
      c.width = window.innerWidth
      c.height = window.innerHeight
    }
    ctx.clearRect(0, 0, c.width, c.height)
    if (strength <= 0.02) return
    const cx = c.width / 2
    const cy = c.height * 0.48
    const reach = Math.hypot(cx, cy)
    for (const l of lines) {
      l.r += dt * l.v * (1.2 + strength * 2)
      if (l.r > 1) {
        l.r = 0.25 + Math.random() * 0.2
        l.a = Math.random() * Math.PI * 2
      }
      const r0 = l.r * reach
      const r1 = r0 + reach * 0.18 * strength
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * strength * l.r})`
      ctx.lineWidth = 2 + 3 * l.r
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(l.a) * r0, cy + Math.sin(l.a) * r0)
      ctx.lineTo(cx + Math.cos(l.a) * r1, cy + Math.sin(l.a) * r1)
      ctx.stroke()
    }
  }
}

// The hop durations of a flight of `time` s: the launch, then `n` skips shrinking evenly
// from the first one down to minHop, with the first found so that they add up.
function planHops(time, n) {
  const { minHop, jitter } = RUN.skips
  const launch = Math.min(RUN.launchMax, time * RUN.launchShare)
  const rest = time - launch
  const sum = (d) => {
    const r = (minHop / d) ** (1 / (n - 1))
    return { r, s: Math.abs(1 - r) < 1e-6 ? d * n : (d * (1 - r ** n)) / (1 - r) }
  }
  let lo = minHop
  let hi = rest
  for (let i = 0; i < 30; i++) {
    const d = (lo + hi) / 2
    if (sum(d).s > rest) hi = d
    else lo = d
  }
  const { r } = sum(lo)
  const hops = [launch]
  for (let i = 0; i < n; i++) hops.push(lo * r ** i * (1 + (Math.random() - 0.5) * jitter))
  return hops
}

// onFx(msg) is called with the throw's visible moments (throw / fly / skip / boom / end) so net.js can
// relay them for the other players to draw (remotePlayers.js).
export function createRun(scene, { progress, hud, blast, onDone, onFx }) {
  let zones = buildZones(scene)
  const builtZones = new Map([[RUN.zones, zones]]) // a world's zone list -> its built scenery
  const lines = speedLines()

  const run = {
    phase: 'idle',
    d: 0,
    x: 0,
    y: 0, // the TNT's centre above the lane
    v: 0, // forward speed
    k: 0, // speed decay, 1/s
    hops: [],
    hop: 0, // index into hops
    hopT: 0,
    y0: 0, // height the current hop starts from
    vy: 0,
    spin: 0, // end over end
    spinRate: 0,
    wobble: 0,
    timer: 0,
    sinceRelease: 0,
    blend: 0, // 1 = run camera, 0 = player camera
    trauma: 0, // camera shake, 0..1
    punch: 0, // fov kick
    timeScale: 1,
    zone: 0,
    skips: 0,
    paidWins: false,
    puffAt: 0,
    fuseBeeps: 0,
    camInit: false,
    flySent: 0, // s since the last 'fly' update went out
  }
  const pos = new Vector3()
  const camPos = new Vector3()
  const camLook = new Vector3()
  const goalPos = new Vector3()
  const goalLook = new Vector3()
  const dir = new Vector3()
  const focusAt = new Vector3()
  const tip = new Vector3()
  let tnt = null // { group, spinner, fuse, rest }
  let flyingId = null
  let smokeColors = GREEN

  const zoneAt = (d) => {
    let i = 0
    while (i + 1 < RUN.zones.length && d >= RUN.zones[i + 1].start) i++
    return i
  }
  const tier = (id) => Math.max(0, TNTS.findIndex((t) => t.id === id))

  // Throws from the hand at `from`, straight down the lane.
  function start(from) {
    if (run.phase !== 'idle') return false
    const range = progress.throwRange()
    flyingId = progress.state.tnt
    tnt = tntModel(flyingId, 'flight')
    const T = RUN.time
    const time = Math.min(T.max, T.base + range * T.perMetre) + Math.max(0, range - (T.max - T.base) / T.perMetre) * T.farPerMetre
    const n = Math.min(RUN.skips.max, Math.round(RUN.skips.base + range * RUN.skips.perMetre))
    run.hops = planHops(time, n)
    run.hop = 0
    run.hopT = 0
    run.y = from.y
    run.y0 = from.y
    run.vy = (tnt.rest - run.y0 + 0.5 * G * run.hops[0] ** 2) / run.hops[0]
    run.d = RUN.z0 - from.z
    run.x = clampX(from.x)
    // v(t) = v0 e^(-kt) covers the range in `time` and ends at fadeEnd of v0.
    run.k = Math.log(1 / RUN.fadeEnd) / time
    run.v = ((range - run.d) * run.k) / (1 - RUN.fadeEnd)
    run.spin = 0
    run.spinRate = 15
    run.wobble = Math.random() * 6
    run.sinceRelease = 0
    run.trauma = 0.12
    run.punch = 0
    run.timeScale = 1
    run.zone = zoneAt(run.d)
    run.skips = 0
    run.paidWins = false
    run.puffAt = run.d
    run.fuseBeeps = 0
    tnt.group.scale.setScalar(RUN.flightScale)
    tnt.group.visible = true
    scene.add(tnt.group)
    smokeColors = TRAILS.find((t) => t.id === progress.state.trail)?.colors ?? GREEN
    run.phase = 'fly'
    run.timer = 0
    run.flySent = 1
    onFx?.({ type: 'throw', tnt: flyingId, trail: progress.state.trail || '' })
    hud.setDistance(run.d)
    sfx.throwWhoosh()
    sfx.fuse.start()
    return true
  }

  function skip() {
    const i = run.skips++
    const hop = run.hops[run.hop]
    const k = Math.min(1, hop / run.hops[1])
    blast.skipPuff(run.x, laneZ(run.d), RUN.zones[run.zone], k)
    onFx?.({ type: 'skip', x: run.x, z: laneZ(run.d), zone: run.zone, k })
    sfx.skip(i, k)
    run.trauma = Math.min(1, run.trauma + 0.05 + 0.2 * k)
    const gained = progress.addSkill(progress.tntOf(flyingId)?.skill ?? 1)
    if (gained > 0) skillPopup(gained, pos.set(run.x, run.y + 1.6, laneZ(run.d)))
  }

  function fly(dt) {
    run.v *= Math.exp(-run.k * dt)
    run.d += run.v * dt
    run.sinceRelease += dt
    run.hopT += dt
    const hop = run.hops[run.hop]
    if (run.hopT >= hop) {
      run.hopT -= hop
      skip()
      run.hop++
      if (run.hop >= run.hops.length) {
        run.phase = 'fuse'
        run.timer = 0
        run.y = tnt.rest
        sfx.fuse.hot()
        return
      }
      run.y0 = tnt.rest
      run.vy = (G * run.hops[run.hop]) / 2
      run.spinRate = Math.min(run.spinRate, 4 + 16 * Math.min(1, run.hops[run.hop] / run.hops[1]))
    }
    run.y = Math.max(tnt.rest, run.y0 + run.vy * run.hopT - 0.5 * G * run.hopT * run.hopT)
    run.spin += run.spinRate * dt
    const zone = zoneAt(run.d)
    if (zone !== run.zone) {
      run.zone = zone
      zoneBanner(RUN.zones[zone].label, RUN.zones[zone].title)
      sfx.zone()
    }
    while (run.d > run.puffAt) {
      run.puffAt += 2.2
      blast.puff(run.x, run.y, laneZ(run.d) + 0.8, smokeColors)
    }
  }

  // Stopped: the last of the speed bleeds off, it rolls onto its side and the fuse runs out.
  function fuse(dt) {
    run.timer += dt
    run.sinceRelease += dt
    run.v *= Math.exp(-6 * dt)
    run.d += run.v * dt
    const lying = Math.ceil(run.spin / Math.PI) * Math.PI - Math.PI / 2
    run.spin += (lying - run.spin) * (1 - Math.exp(-14 * dt))
    const t = run.timer / RUN.fuseTime
    // Beeps close in on the blast.
    const beats = 7
    const beat = Math.floor((1 - (1 - t) ** 2.2) * beats)
    if (beat > run.fuseBeeps) {
      run.fuseBeeps = beat
      sfx.tick(beat / beats)
    }
    // Swells on each beat.
    const pulse = 1 + (0.06 + t * 0.26) * Math.abs(Math.sin(t * t * 22))
    tnt.group.scale.setScalar(RUN.flightScale * pulse)
    if (t >= 1) boom()
  }

  function boom() {
    const zone = RUN.zones[run.zone]
    const z = laneZ(run.d)
    blast.fuseOut()
    tnt.group.visible = false
    onFx?.({ type: 'boom', x: run.x, z, zone: run.zone, tier: tier(flyingId) })
    blast.explode(run.x, z, zone, tier(flyingId))
    sfx.fuse.stop()
    sfx.blast()
    hud.flash()
    run.phase = 'blast'
    run.timer = 0
    run.trauma = 1
    run.punch = 1
    run.timeScale = RUN.slowMo
    run.v = 0
    const gained = progress.addSkill((progress.tntOf(flyingId)?.skill ?? 1) * Math.floor(run.d / RUN.blastSkillEvery))
    if (gained > 0) skillPopup(gained, pos.set(run.x, 3, z), true)
  }

  function payWins() {
    run.paidWins = true
    const wins = progress.addWins(RUN.zones[run.zone].wins)
    winsReward(wins)
    hud.popWins()
    sfx.win()
  }

  function stream(focusD) {
    for (const z of zones) {
      const vis = z.d1 > focusD - RUN.streamBehind && z.d0 < focusD + RUN.streamAhead
      z.group.visible = vis
      z.label.visible = vis
    }
  }

  return {
    // Busy from the throw until the camera is back on the player.
    get busy() {
      return run.phase !== 'idle'
    },
    // Another world's lane: its zones replace RUN.zones (never during a throw).
    setWorld(w) {
      for (const z of zones) z.group.visible = z.label.visible = false
      if (!builtZones.has(w.zones)) builtZones.set(w.zones, buildZones(scene, w.zones))
      zones = builtZones.get(w.zones)
      RUN.zones = w.zones
    },
    get phase() {
      return run.phase
    },
    get distance() {
      return run.d
    },
    get skips() {
      return run.skips
    },
    // The TNT the hand should carry.
    get tntId() {
      return progress.state.tnt
    },
    start,
    // The point lighting and clouds should follow.
    focus(player) {
      if (run.phase === 'idle') return player
      return focusAt.lerpVectors(player, pos.set(run.x, 0, laneZ(run.d)), run.blend)
    },
    update(dt, t) {
      const sim = dt * run.timeScale
      if (run.phase === 'fly') fly(dt)
      else if (run.phase === 'fuse') fuse(dt)
      else if (run.phase === 'blast') {
        run.timer += sim
        run.timeScale += (1 - run.timeScale) * (1 - Math.exp(-RUN.slowMoEase * dt))
        if (!run.paidWins && run.timer > 0.5) payWins()
        if (run.timer > RUN.holdTime) {
          run.phase = 'return'
          run.timer = 0
          sfx.whooshBack()
        }
      } else if (run.phase === 'return') {
        run.timer += dt
        if (run.timer > RUN.returnTime) {
          run.phase = 'idle'
          scene.remove(tnt.group)
          onFx?.({ type: 'end' })
          blast.reset()
          progress.finishThrow(Math.floor(run.d))
          run.camInit = false
          onDone?.()
        }
      }
      if (run.phase === 'fly' || run.phase === 'fuse') {
        const z = laneZ(run.d)
        tnt.group.position.set(run.x, run.y, z)
        // Tumbles end over end with a little yaw wobble.
        tnt.spinner.rotation.x = -run.spin
        tnt.group.rotation.y = Math.sin(run.wobble + run.spin * 0.21) * 0.35
        tnt.group.updateMatrixWorld(true)
        blast.fuse(tnt.fuse.obj.localToWorld(tip.copy(tnt.fuse.local)), run.phase === 'fuse' ? run.timer / RUN.fuseTime : 0.2)
        run.flySent += dt
        if (run.flySent >= 1 / NET.fxHz) {
          run.flySent = 0
          onFx?.({ type: 'fly', x: run.x, y: run.y, z, spin: run.spin, vz: run.phase === 'fly' ? -run.v : 0 })
        }
        hud.setDistance(run.d)
      }
      blast.update(sim, t)
      stream(run.phase === 'idle' ? 0 : run.d)
      lines(dt, run.phase === 'fly' ? Math.min(1, (run.v - 22) / 50) : 0)
      sfx.fuse.update()
    },
    // After camera.js has placed the player camera: blend toward the chase cam.
    applyCamera(camera, dt) {
      if (run.phase === 'idle') {
        run.blend = 0
        return
      }
      const C = RUN.camera
      const chasing = run.phase === 'fly'
      if (run.phase === 'return') run.blend = Math.max(0, 1 - run.timer / RUN.returnTime)
      else if (run.sinceRelease > C.delay) run.blend += (1 - run.blend) * (1 - Math.exp(-5.5 * dt))
      if (run.blend < 0.001) return
      const z = laneZ(run.d)
      if (chasing) {
        goalPos.set(run.x, C.up + (run.y - tnt.rest) * C.followY, z + C.back)
        goalLook.set(run.x, C.lookUp + (run.y - tnt.rest) * 0.55, z - C.lookAhead)
      } else {
        // On the crater, drifting a little sideways while the dust falls.
        const s = run.phase === 'fuse' ? 0 : Math.min(1, run.timer / 1.4)
        goalPos.set(run.x + C.blastSide * s, C.up + (C.blastUp - C.up) * s, z + C.back + (C.blastBack - C.back) * s)
        goalLook.set(run.x, 1.1, z - 1)
      }
      if (!run.camInit) {
        camPos.copy(goalPos)
        camLook.copy(goalLook)
        run.camInit = true
      }
      const k = 1 - Math.exp(-(chasing ? 13 : 6) * dt)
      camPos.lerp(goalPos, k)
      camLook.lerp(goalLook, k)
      if (chasing) {
        camPos.z = Math.min(camPos.z, goalPos.z + C.maxLag)
        camLook.z = Math.min(camLook.z, goalLook.z + C.maxLag)
      }
      run.trauma *= Math.exp(-2.6 * dt)
      run.punch *= Math.exp(-3.5 * dt)
      const shake = run.trauma * run.trauma * C.shake
      const b = run.blend * run.blend * (3 - 2 * run.blend)
      const look = camera.getWorldDirection(dir).multiplyScalar(10).add(camera.position)
      camera.position.lerp(camPos, b)
      camera.lookAt(look.lerp(camLook, b))
      if (shake > 0.002) {
        const time = performance.now() / 1000
        camera.position.x += Math.sin(time * 61) * shake
        camera.position.y += Math.sin(time * 47 + 1) * shake
        camera.rotation.z += Math.sin(time * 37 + 2) * shake * 0.05
      }
      const speedFov = chasing ? Math.min(1, run.v / 70) * C.fovSpeed : 0
      camera.fov += (speedFov + run.punch * C.fovPunch) * b
      camera.updateProjectionMatrix()
    },
  }
}
