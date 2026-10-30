import { Group, Mesh } from 'three'
import { LOBBY, THROW_ZONE } from '../config.js'
import { solidBox } from '../propkit.js'
import { bake } from '../bake.js'
import { addBox, border, holed, legoBox, patch, plain, studMat, topStuds } from './kit.js'

// The lego island: a grass-topped slab floating in the sky with the grey studded
// plaza on it, green patches with yellow trims, pale checker floors, the yellow Throw
// Zone band, the long green lane to the north between raised dirt banks (the floor the
// blast can open up, see kit.js holed) and wooden fences.
export function buildFloor(scene, C = LOBBY.colors) {
  const root = new Group()
  const grass = studMat(C.grass)
  const patchTop = studMat(C.patch ?? C.grass)
  const lane = holed(studMat(C.lane))
  const laneSide = plain(C.laneSide, 0.7)
  const dirt = studMat(C.dirt, { rough: 0.85 })
  const stone = studMat(C.stone, { rough: 0.8 })
  const plaza = studMat(C.plaza)
  const checker = studMat(C.checkB, { alt: C.checkA })
  const trim = studMat(C.trim, { rough: 0.45 })

  // --- Island slab: grass top, dirt sides, stepped stone underneath ---
  const I = LOBBY.island
  const R = LOBBY.runway
  const north = -30 - R.length
  const slab = (minX, maxX, minZ, maxZ, top, h, y, side = dirt) =>
    addBox(root, maxX - minX, h, maxZ - minZ, topStuds(top, side), (minX + maxX) / 2, y - h / 2, (minZ + maxZ) / 2, { shadow: false })
  slab(I.minX, I.maxX, I.minZ, I.maxZ, grass, I.depth, 0)
  slab(I.minX + 4, I.maxX - 4, I.minZ + 2, I.maxZ - 4, stone, 5, -I.depth, stone)
  slab(I.minX + 12, I.maxX - 14, I.minZ + 6, I.maxZ - 12, stone, 5, -I.depth - 5, stone)
  slab(I.minX + 26, I.maxX - 30, I.minZ + 14, I.maxZ - 24, stone, 6, -I.depth - 10, stone)
  solidBox((I.maxX - I.minX) / 2, 2, (I.maxZ - I.minZ) / 2, (I.minX + I.maxX) / 2, -2 + 0.04, (I.minZ + I.maxZ) / 2)

  // --- Runway and its banks ---
  slab(R.minX, R.maxX, north, -30, lane, I.depth, 0, laneSide)
  solidBox((R.maxX - R.minX) / 2, 2, R.length / 2, (R.minX + R.maxX) / 2, -2, -30 - R.length / 2)
  const bank = (minX, maxX, h) => {
    slab(minX, maxX, north, -30, grass, h + I.depth, h)
    solidBox((maxX - minX) / 2, (h + 4) / 2, R.length / 2, (minX + maxX) / 2, h - (h + 4) / 2, -30 - R.length / 2)
  }
  bank(I.minX, R.minX, R.bankHeight)
  bank(I.minX, R.minX - 14, R.upperBankHeight)
  bank(R.maxX, I.maxX, R.bankHeight)
  // A yellow stripe along each bank wall.
  for (const x of [R.minX, R.maxX]) addBox(root, 0.24, 0.8, R.length, trim, x, R.bankHeight * 0.62, -30 - R.length / 2, { shadow: false })

  // --- Throw Zone: the yellow band, its white front line, the wall nobody walks through ---
  const T = THROW_ZONE
  root.add(patch([[R.minX, T.maxZ], [R.maxX, T.maxZ], [R.maxX, T.minZ], [R.minX, T.minZ]], 0.07, 0.07, trim))
  root.add(patch([[R.minX, T.minZ], [R.maxX, T.minZ], [R.maxX, T.minZ - T.line], [R.minX, T.minZ - T.line]], 0.08, 0.08, studMat(C.white)))
  solidBox((R.maxX - R.minX) / 2, 8, 0.5, (R.minX + R.maxX) / 2, 8, T.minZ - 0.5)

  // --- Plaza floor ---
  const P = LOBBY.plaza
  root.add(patch([[P.minX, P.minZ], [P.maxX, P.minZ], [P.maxX, P.maxZ], [P.minX, P.maxZ]], 0.04, 0.04, plaza))
  for (const pts of LOBBY.checker) root.add(patch(pts, 0.06, 0.02, checker))
  for (const pts of LOBBY.patches) {
    root.add(patch(pts, 0.07, 0.03, patchTop))
    border(root, pts, trim, { width: 0.55, height: 0.13 })
  }

  // --- Fences ---
  const fences = new Group()
  const post = plain(C.woodDark, 0.85)
  const rail = plain(C.wood, 0.8)
  const fenceLine = (pts, y = 0) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i]
      const [bx, bz] = pts[i + 1]
      const len = Math.hypot(bx - ax, bz - az)
      const yaw = -Math.atan2(bz - az, bx - ax)
      const n = Math.max(1, Math.round(len / 2.6))
      for (let k = 0; k <= n; k++) {
        const t = k / n
        addBox(fences, 0.42, 1.9, 0.42, post, ax + (bx - ax) * t, y + 0.95, az + (bz - az) * t)
      }
      for (const ry of [0.75, 1.45]) {
        const m = new Mesh(legoBox(len, 0.24, 0.16), rail)
        m.position.set((ax + bx) / 2, y + ry, (az + bz) / 2)
        m.rotation.y = yaw
        fences.add(m)
      }
      solidBox(len / 2, 1.5, 0.3, (ax + bx) / 2, y + 1.5, (az + bz) / 2, yaw)
    }
  }
  fenceLine(LOBBY.fence)
  fenceLine([[R.maxX + 1.2, -31], [R.maxX + 1.2, north + 2]], R.bankHeight)
  // Island rim: invisible walls so nobody walks off the edge.
  const rim = [[I.minX, I.maxZ], [I.maxX, I.maxZ], [I.maxX, north], [I.minX, north]]
  for (let i = 0; i < 4; i++) {
    const [ax, az] = rim[i]
    const [bx, bz] = rim[(i + 1) % 4]
    solidBox(Math.hypot(bx - ax, bz - az) / 2 + 1, 6, 0.5, (ax + bx) / 2, 6, (az + bz) / 2, -Math.atan2(bz - az, bx - ax))
  }
  const baked = bake(fences, true)
  baked.traverse((o) => (o.receiveShadow = true))
  root.add(baked)
  scene.add(root)
  return root
}
