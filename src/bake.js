import { BufferAttribute, BufferGeometry, Group, Matrix4, Mesh } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// --- Baking: one mesh per material ------------------------------------------------
// Props are built from many small meshes (a palm is ~20); merging the ones
// that share a look keeps a set piece to a handful of draw calls (mobile).
const matKey = (m) => [m.type, m.color?.getHexString(), m.emissive?.getHexString(), m.emissiveIntensity, m.vertexColors, m.side, m.flatShading, m.transparent, m.opacity, m.blending, m.map?.uuid, m.normalMap?.uuid, m.emissiveMap?.uuid, m.roughness, m.metalness, m.userData.k].join('|')
const rel = new Matrix4()
// `take(mesh)` limits the bake to some meshes; those are then removed from the scene graph
// (the caller adds the returned group to `root` in their place).
export function bake(root, castShadow = false, take = null) {
  root.updateMatrixWorld(true)
  const inv = root.matrixWorld.clone().invert()
  const groups = new Map() // key -> { mat, geos }
  const out = new Group()
  const push = (mat, geo) => {
    const key = matKey(mat)
    let e = groups.get(key)
    if (!e) groups.set(key, (e = { mat, geos: [] }))
    e.geos.push(geo)
  }
  const taken = []
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return
    if (take && !take(o)) return
    taken.push(o)
    rel.multiplyMatrices(inv, o.matrixWorld)
    const flat = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(rel)
    if (!Array.isArray(o.material)) {
      push(o.material, flat)
      return
    }
    // Multi-material: split the geometry by its groups, each part joins its material's batch.
    for (const grp of flat.groups) {
      const mat = o.material[grp.materialIndex]
      if (!mat) continue
      const part = new BufferGeometry()
      for (const [name, attr] of Object.entries(flat.attributes)) {
        const n = attr.itemSize
        part.setAttribute(name, new BufferAttribute(attr.array.slice(grp.start * n, (grp.start + grp.count) * n), n))
      }
      push(mat, part)
    }
    flat.dispose()
  })
  for (const { mat, geos } of groups.values()) {
    const names = Object.keys(geos[0].attributes).filter((n) => geos.every((g) => g.attributes[n]))
    for (const g of geos) {
      for (const n of Object.keys(g.attributes)) if (!names.includes(n)) g.deleteAttribute(n)
      g.morphAttributes = {}
      g.clearGroups()
    }
    const merged = mergeGeometries(geos)
    for (const g of geos) g.dispose()
    if (merged) out.add(new Mesh(merged, mat))
  }
  if (take) for (const o of taken) o.parent.remove(o)
  out.traverse((o) => {
    if (o.isMesh) o.castShadow = castShadow
  })
  return out
}
