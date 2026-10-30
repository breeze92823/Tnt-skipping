import { Vector3 } from 'three'
import { LOBBY, RUN, THROW_ZONE } from './config.js'
import { onKey, onLockedClick } from './input.js'
import { player } from './player.js'
import { easeYaw } from './camera.js'
import { isFirstPerson } from './modes.js'
import { tntModel } from './lobby/tnt.js'
import { sfx } from './audio.js'
import { applyThrow, handPosition, holdsTnt, RELEASE_T, THROW_PERIOD } from './throwAnim.js'

// The player's side of a throw (Bowling Roll's bowler.js, Throw Zone part): standing on
// the yellow band shows THROW (HUD button, F, or a click while the cursor is grabbed).
// One throw plays, the TNT leaves the hand at release (run.js takes it from there) and
// the player holds still until the camera is back. The equipped TNT is carried while on
// the band.

const R = LOBBY.runway
const NORTH = Math.PI // facing down the lane
export const isInThrowZone = (x, z) => x >= R.minX && x <= R.maxX && z <= THROW_ZONE.maxZ + 0.5 && z >= THROW_ZONE.minZ - 0.5

export function createThrower(scene, { run, getAvatar, canAct, onThrow }) {
  let oneShot = null // { t } while the throw animates
  let weight = 0
  let held = null
  let heldId = null
  const hand = new Vector3()

  const inZone = () => isInThrowZone(player.position.x, player.position.z)
  const canThrow = () => !oneShot && !run.busy && inZone() && canAct()

  function requestThrow() {
    if (!canThrow()) return false
    oneShot = { t: 0 }
    player.frozen = true
    player.facing = NORTH
    onThrow?.()
    return true
  }
  onKey('KeyF', requestThrow)
  onLockedClick(requestThrow)

  function release() {
    const from = handPosition(getAvatar(), hand) ? hand.clone() : new Vector3(player.position.x, 1.8, player.position.z - 0.5)
    run.start(from)
  }

  return {
    requestThrow,
    get canThrow() {
      return canThrow()
    },
    // The animator's overlay: blends the throw (or just carrying it) over locomotion.
    overlay(pose, dt) {
      const want = oneShot ? 1 : inZone() && !run.busy ? 0.75 : 0
      weight += (want - weight) * (1 - Math.exp(-12 * dt))
      applyThrow(pose, oneShot ? oneShot.t : 0, weight)
    },
    // The run finished and the camera is back: the player may move again.
    released() {
      player.frozen = false
    },
    update(dt) {
      if (oneShot) {
        const prev = oneShot.t
        oneShot.t += dt / THROW_PERIOD
        // Square up behind the throw before the camera leaves for the chase.
        easeYaw(0, 1 - Math.exp(-7 * dt))
        if (prev < 0.26 && oneShot.t >= 0.26) sfx.windup()
        if (prev < RELEASE_T && oneShot.t >= RELEASE_T) release()
        if (oneShot.t >= 1) oneShot = null
      }
      // The TNT in hand.
      const wanted = run.tntId
      if (heldId !== wanted || !held) {
        if (held) scene.remove(held.group)
        heldId = wanted
        held = tntModel(wanted, 'held')
        held.group.scale.setScalar(RUN.heldScale)
        scene.add(held.group)
      }
      const carrying = oneShot ? holdsTnt(oneShot.t) : inZone() && !run.busy
      held.group.visible = carrying && !isFirstPerson() && !!handPosition(getAvatar(), hand)
      if (held.group.visible) {
        held.group.position.copy(hand)
        held.group.rotation.set(0.5, 0, 0.3)
      }
    },
  }
}
