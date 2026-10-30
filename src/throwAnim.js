import { Quaternion, Vector3 } from 'three'
import { BONE_INDEX } from './avatar/rig.js'

// The overarm TNT throw, layered over the locomotion pose by the animator's `overlay`
// hook. Keys are in CHARACTER space (rig.js): +X swings a limb backward, so -PI is
// straight overhead; Spine1 +X leans forward, ArmL1 +Z raises the left arm outward. `t` is
// the 0..1 throw; values are radians.
//   0.00 carried at the chest, 0.30 cocked behind the head with the left arm pointing
//   down the lane and the body leaning back, 0.48 whips through to the release with a
//   long step, 0.72 follow-through low in front, 1.00 back to carrying.
export const THROW_PERIOD = 0.95 // s
export const RELEASE_T = 0.48
const HOLD = { armR: -0.85, elbowR: 0.95, armL: -0.3, armLz: 0.1, elbowL: 0.2, spine: 0.05, twist: 0, legL: 0, legR: 0, kneeL: 0, kneeR: 0, bob: 0 }
const KEYS = [
  { t: 0, ...HOLD },
  { t: 0.3, armR: -3.45, elbowR: 1.75, armL: -1.45, armLz: 0.15, elbowL: 0.1, spine: -0.32, twist: 0.5, legL: -0.62, legR: 0.12, kneeL: 0.85, kneeR: 0.22, bob: -0.08 },
  { t: RELEASE_T, armR: -1.55, elbowR: 0.08, armL: -0.25, armLz: 0.75, elbowL: 0.5, spine: 0.5, twist: -0.45, legL: -0.8, legR: 0.65, kneeL: 0.42, kneeR: 0.4, bob: -0.2 },
  { t: 0.72, armR: -0.5, elbowR: 0.2, armL: -0.1, armLz: 0.8, elbowL: 0.4, spine: 0.55, twist: -0.3, legL: -0.7, legR: 0.55, kneeL: 0.6, kneeR: 0.35, bob: -0.24 },
  { t: 1, ...HOLD },
]
const ease = (t) => t * t * (3 - 2 * t)
const FIELDS = Object.keys(HOLD)
const cur = {}

function sample(t) {
  let i = 0
  while (i + 1 < KEYS.length - 1 && t >= KEYS[i + 1].t) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const k = ease(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t || 1))))
  for (const f of FIELDS) cur[f] = a[f] + (b[f] - a[f]) * k
  return cur
}

function mix(pose, bone, axis, value, w) {
  const at = BONE_INDEX[bone] * 3 + axis
  pose.rotations[at] += (value - pose.rotations[at]) * w
}

// Blends the throw at `t` into `pose` with weight `w` (0..1).
export function applyThrow(pose, t, w) {
  if (w <= 0.001) return
  const k = sample(t)
  mix(pose, 'ArmR1', 0, k.armR, w)
  mix(pose, 'ArmR1', 2, -0.12, w)
  mix(pose, 'ArmR2', 0, k.elbowR, w)
  mix(pose, 'ArmL1', 0, k.armL, w)
  mix(pose, 'ArmL1', 2, k.armLz, w)
  mix(pose, 'ArmL2', 0, k.elbowL, w)
  mix(pose, 'Spine1', 0, k.spine, w)
  mix(pose, 'Spine1', 1, k.twist, w)
  mix(pose, 'LegL1', 0, k.legL, w)
  mix(pose, 'LegR1', 0, k.legR, w)
  mix(pose, 'LegL2', 0, k.kneeL, w)
  mix(pose, 'LegR2', 0, k.kneeR, w)
  pose.bobY += (k.bob - pose.bobY) * w
}

// Whether the TNT is in the hand at `t` (it leaves at release, a new one appears at the end).
export const holdsTnt = (t) => t < RELEASE_T || t > 0.97

// World position of the right hand (the end of the forearm, ArmR2_leaf on the
// real rig; the procedural fallback has no forearm, so its arm is extrapolated).
const qa = new Quaternion()
const va = new Vector3()
export function handPosition(avatar, out) {
  const n = avatar?.nodes
  if (!n) return null
  const leaf = n.ArmR2_leaf
  if (leaf) return leaf.getWorldPosition(out)
  const arm = n.ArmR1
  if (!arm) return null
  arm.getWorldPosition(out)
  arm.getWorldQuaternion(qa)
  va.set(0, -0.62, 0).applyQuaternion(qa)
  return out.add(va)
}
