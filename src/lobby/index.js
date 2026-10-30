import { Group, Vector3 } from 'three'
import { mulberry32 } from '../textures.js'
import { buildFloor } from './floor.js'
import { buildNature } from './nature.js'
import { buildShop } from './tnt.js'
import { buildClaim, buildEggs, buildGlitch, buildLeaderboards, buildPortal, buildTower } from './landmarks.js'
import { buildLanes } from './lanes.js'
import { emitter, setParticleDensity, setRGB, updateParticles } from './fx.js'
import { bakeStatic } from './kit.js'

// The whole lobby: floor + scenery + set pieces + lanes, and the particle
// effects tied to them (fuse sparks, portal and claim sparkles, glitch pixels,
// gold glitter, lane glints). update(dt, t, camera) animates all of it.
export function buildLobby(scene, preset) {
  setParticleDensity(preset.particles)
  const fuses = []
  const root = new Group()
  buildFloor(root)
  const nature = buildNature(root)
  const shop = buildShop(root, fuses)
  const portal = buildPortal(root)
  const glitch = buildGlitch(root)
  const claim = buildClaim(root)
  const eggs = buildEggs(root)
  const leaderboards = buildLeaderboards(root)
  const tower = buildTower(root)
  const lanes = buildLanes(root)
  bakeStatic(root) // everything that never moves -> one mesh per material
  scene.add(root)

  const rand = mulberry32(1234)
  const v = new Vector3()
  scene.updateMatrixWorld(true)

  // Fuse sparks on every TNT model: short-lived orange/yellow sparks spraying up and out.
  emitter(scene, {
    count: 220,
    texture: 'dot',
    gravity: -5,
    shrink: 0.7,
    spawn(p) {
      const f = fuses[Math.floor(rand() * fuses.length)]
      f.obj.localToWorld(v.copy(f.local))
      p.x = v.x
      p.y = v.y
      p.z = v.z
      const a = rand() * Math.PI * 2
      const s = 0.6 + rand() * 1.2
      p.vx = Math.cos(a) * s
      p.vz = Math.sin(a) * s
      p.vy = 1 + rand() * 1.6
      p.life = 0.3 + rand() * 0.4
      p.size = 0.12 + rand() * 0.1
      setRGB(p, rand() < 0.5 ? '#ffd23a' : '#ff7a1a')
    },
  })
  // The giant tower's fuse: big sparks.
  emitter(scene, {
    count: 70,
    texture: 'dot',
    gravity: -6,
    shrink: 0.6,
    spawn(p) {
      p.x = tower.tip.x
      p.y = tower.tip.y
      p.z = tower.tip.z
      const a = rand() * Math.PI * 2
      p.vx = Math.cos(a) * (1 + rand() * 3)
      p.vz = Math.sin(a) * (1 + rand() * 3)
      p.vy = 2 + rand() * 4
      p.life = 0.5 + rand() * 0.6
      p.size = 0.6 + rand() * 0.5
      setRGB(p, rand() < 0.5 ? '#ffe14a' : '#ff6a1a')
    },
  })
  // Portal: cyan sparkles drifting up off the surface.
  emitter(scene, {
    count: 60,
    drag: 0.4,
    spawn(p) {
      portal.surfacePoint(v, rand)
      p.x = v.x
      p.y = v.y
      p.z = v.z
      p.vx = (rand() - 0.5) * 0.4
      p.vy = 0.4 + rand() * 0.8
      p.vz = (rand() - 0.5) * 0.4
      p.life = 1.4 + rand() * 1.2
      p.size = 0.25 + rand() * 0.3
      setRGB(p, rand() < 0.6 ? '#7ff4ff' : '#ffffff')
    },
  })
  // Claim circle: golden sparkles rising out of the ring.
  emitter(scene, {
    count: 70,
    shrink: 0.3,
    spawn(p) {
      claim.ringPoint(v, rand)
      p.x = v.x
      p.y = v.y
      p.z = v.z
      p.vx = 0
      p.vy = 1 + rand() * 1.5
      p.vz = 0
      p.life = 1 + rand() * 1
      p.size = 0.3 + rand() * 0.35
      setRGB(p, rand() < 0.7 ? '#ffe23a' : '#ffffff')
    },
  })
  // Glitch booth: pink / cyan pixels floating up.
  emitter(scene, {
    count: 50,
    texture: 'square',
    spawn(p) {
      glitch.point(v, rand)
      p.x = v.x
      p.y = v.y
      p.z = v.z
      p.vx = (rand() - 0.5) * 0.3
      p.vy = 0.5 + rand() * 0.7
      p.vz = (rand() - 0.5) * 0.3
      p.life = 1.5 + rand() * 1.5
      p.size = 0.12 + rand() * 0.14
      setRGB(p, ['#ff2bd6', '#2bf0ff', '#9a4dff'][Math.floor(rand() * 3)])
    },
  })
  // Gold glitter round the Dragon TNT and the eggs / lion.
  emitter(scene, {
    count: 70,
    spawn(p) {
      const useDragon = rand() < 0.4
      if (useDragon) shop.dragon.getWorldPosition(v).add({ x: (rand() - 0.5) * 3, y: 1 + rand() * 3, z: (rand() - 0.5) * 3 })
      else {
        const a = eggs.anchors[Math.floor(rand() * eggs.anchors.length)]
        v.set(a.x + (rand() - 0.5) * 2.4, 0.8 + rand() * 2.6, a.z + (rand() - 0.5) * 2.4)
      }
      p.x = v.x
      p.y = v.y
      p.z = v.z
      p.vx = 0
      p.vy = 0.2
      p.vz = 0
      p.life = 0.8 + rand() * 1
      p.size = 0.22 + rand() * 0.3
      setRGB(p, rand() < 0.5 ? '#fff2a0' : '#ffffff')
    },
  })
  // Glints twinkling on the premium lanes.
  const glints = lanes.glints
  const weightSum = glints.reduce((s, gl) => s + gl.weight, 0)
  emitter(scene, {
    count: 50,
    shrink: 0.2,
    spawn(p) {
      let r = rand() * weightSum
      let gl = glints[0]
      for (const g of glints) {
        r -= g.weight
        if (r <= 0) {
          gl = g
          break
        }
      }
      v.set(1 + rand() * (gl.len - 3), gl.y, (rand() - 0.5) * (gl.w - 0.6))
      gl.g.localToWorld(v)
      p.x = v.x
      p.y = v.y
      p.z = v.z
      p.vx = 0
      p.vy = 0.15
      p.vz = 0
      p.life = 0.6 + rand() * 0.8
      p.size = 0.4 + rand() * 0.4
      setRGB(p, '#ffffff')
    },
  })

  return {
    lanes,
    setLeaderboards: leaderboards.setBoards, // the server's lists onto the stand's four screens
    update(dt, t, camera, viewportHeight) {
      nature.update(dt, t)
      shop.update(dt, t)
      portal.update(dt, t)
      glitch.update(dt, t)
      claim.update(dt, t)
      eggs.update(dt, t)
      lanes.update(dt, t, camera)
      updateParticles(dt, viewportHeight, camera.fov)
    },
  }
}
