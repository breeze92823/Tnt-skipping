import { Clock, NeutralToneMapping, Group, PCFSoftShadowMap, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three'
import { CAMERA, GAME_TITLE, graphicsPreset, INTERACT, LOBBY, PET_KINDS, RENDER, TNTS } from './config.js'
import { installInteract, isInteractShowing, press as pressInteract, registerZone, setInteractEnabled, updateInteract } from './interact.js'
import { sfx } from './audio.js'
import * as bloxity from './bloxity.js'
import { initNet, invite, net, onLeaderboard, sendFx, sendLoadout, sendPose, syncAvatar } from './net.js'
import { install as installInput, onKey, releaseLock } from './input.js'
import { installTouch } from './touch.js'
import { createPlayerBody, interpolate as interpolatePlayer, player, resetPlayer, respawn } from './player.js'
import { setCameraSensitivity, setOrbit, syncYawToPlayer, update as updateCamera } from './camera.js'
import { onModeChanged, toggleMode } from './modes.js'
import { bodyCount, initPhysics, stepPhysics } from './physics.js'
import { createLighting } from './lighting.js'
import { createWorld } from './world.js'
import { buildLobby } from './lobby/index.js'
import { setParticleBoost } from './lobby/fx.js'
import { createPostFx } from './postfx.js'
import { setNeonBloom } from './propkit.js'
import { buildDefaultCharacter, loadBaseCharacter } from './avatar/character.js'
import { applyProportions, attachEquippedAccessories } from './avatar/loader.js'
import { disposeAnimator, makeAnimator } from './avatar/animator.js'
import { createProgress } from './progress.js'
import { createHud } from './hud.js'
import { createWindows } from './windows.js'
import { createTraining } from './training.js'
import { createBlast } from './blast.js'
import { createRun } from './run.js'
import { createPetFollowers } from './pet3d.js'
import { createRemotePlayers } from './remotePlayers.js'
import { createThrower } from './thrower.js'
import { installFx, updateFx } from './fx.js'
import { anyWindowOpen, closeTopWindow } from './ui.js'

// Boot order: Bloxity SDK -> renderer -> Rapier (async wasm) -> ground + sky + lighting,
// player body -> avatar (async, swaps in when ready) -> loop. The SDK is optional at every step.
let lighting = null
let renderer = null
let postfx = null

// Settings come from the portal's settings menu (or their defaults offline).
function applySetting(key, value) {
  if (key === 'camera_sensitivity') setCameraSensitivity(value)
  else if (key === 'fullscreen') bloxity.requestFullscreen(value)
  else if (key === 'graphics_quality' && renderer) {
    const next = graphicsPreset(value)
    renderer.shadowMap.enabled = next.shadows
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, next.dpr))
    lighting?.setShadows(next)
    postfx?.configure(next)
    setNeonBloom(next.bloom)
    setParticleBoost(next.bloom)
    postfx?.setSize(window.innerWidth, window.innerHeight)
  }
}
bloxity.onSetting(applySetting)
bloxity.init()

// --- Renderer ---------------------------------------------------------------
const preset = graphicsPreset(bloxity.settings.graphics_quality)
renderer = new WebGLRenderer({ antialias: preset.antialias, powerPreference: 'high-performance' })
renderer.outputColorSpace = SRGBColorSpace
renderer.toneMapping = NeutralToneMapping
renderer.toneMappingExposure = RENDER.exposure
renderer.shadowMap.enabled = preset.shadows
renderer.shadowMap.type = PCFSoftShadowMap
renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.dpr))
document.body.appendChild(renderer.domElement)
installInput(() => closeTopWindow() || bloxity.showMenu(), renderer.domElement) // Esc closes the open window, else opens the portal menu

const scene = new Scene()
const camera = new PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far)
postfx = createPostFx(renderer, scene, camera)
postfx.configure(preset)

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight)
  postfx.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
resize()

for (const key of Object.keys(bloxity.settings)) applySetting(key, bloxity.settings[key])

// --- Physics + ground + sky --------------------------------------------------
bloxity.loadingStep('Starting physics')
await initPhysics()

lighting = createLighting(scene, renderer, preset)
const world = createWorld(scene, { sea: false }) // clouds; the lobby floats in the sky
bloxity.loadingStep('Building the lobby')
const lobby = buildLobby(scene, preset)
createPlayerBody()
syncYawToPlayer()

// --- HUD + windows ------------------------------------------------------------
// progress.js holds the state and rules; the HUD tiles open the windows (windows.js).
const progress = createProgress()
initNet(progress)
onLeaderboard((m) => lobby.setLeaderboards(m.boards)) // the stand's four screens come from the server
const hud = createHud()
const windows = createWindows(progress, hud)
bloxity.onReservedAreas((areas) => {
  // The left HUD column starts under whatever the platform draws top-left; portrait
  // windows only under its toolbar row (they cover the chat feed while open).
  let bottom = 0
  let bar = 0
  for (const a of areas) {
    if (a.left < window.innerWidth * 0.3) bottom = Math.max(bottom, a.top + a.height)
    if (a.top < 10) bar = Math.max(bar, a.top + a.height)
  }
  hud.setReservedTop(bottom + 6)
  document.documentElement.style.setProperty('--res-top', `${Math.round(bar + 6)}px`)
})
// Friend Boost "+": Bloxity's own toolbar sends invites; this shares a link to the current room.
hud.on('friends', async () => {
  const link = invite()
  if (!link) return hud.toast(net.connected ? 'Invites work inside Bloxity' : 'Not connected to a room yet')
  try {
    if (matchMedia('(pointer: coarse)').matches && navigator.share) await navigator.share({ title: GAME_TITLE, url: link })
    else {
      await navigator.clipboard.writeText(link)
      hud.toast('Invite link copied!')
    }
  } catch {
    // Share sheet dismissed or clipboard blocked.
  }
})
// Bloxity leaderboards (bloxity.js submitScores): the end of a throw and a rebirth are final, any
// other change goes out at most every 20 s. A rebirth zeroes SKILL, so its peak is sent first.
let peakSkill = progress.state.skill
let seenRebirths = progress.state.rebirths
function submitBoards(force = false, skill = progress.state.skill) {
  const S = progress.state
  bloxity.submitScores({ wins: S.wins, skill, 'best-throw': S.bestDistance }, force)
}
progress.onChange(() => {
  const S = progress.state
  if (S.rebirths > seenRebirths) submitBoards(true, peakSkill)
  seenRebirths = S.rebirths
  peakSkill = S.skill
  submitBoards()
})
let shownLevel = progress.rebirthLevel()
function syncHud() {
  const S = progress.state
  hud.setStats(S)
  hud.setRebirthProgress(progress.rebirthT())
  hud.setGift(progress.nextPlaytime())
  hud.setCalendarBadge(progress.dailyReady())
  hud.setLevel(progress.levelBar())
  hud.setMultiplier(progress.skillMult())
  const level = progress.rebirthLevel()
  if (level > shownLevel) {
    hud.levelUp()
    sfx.levelUp()
  }
  shownLevel = level
}
progress.onChange(syncHud)
setInterval(syncHud, 1000) // the Gifts timer and the calendar badge
syncHud()

// --- Lane training: stand on a lane's pad and the TNT is thrown for you every second.
const training = createTraining({ scene, progress, hud, player, getAnimator: () => animator, lanes: lobby.lanes })

// --- The throw ---------------------------------------------------------------------
// The yellow band's THROW sends the TNT down the main lane (thrower.js -> run.js -> blast.js).
installFx(camera)
const blast = createBlast(scene, { shadows: preset.shadows })
let thrower = null
const run = createRun(scene, { progress, hud, blast, onFx: sendFx, onDone: () => {
    thrower.released()
    submitBoards(true)
  },
})
// --- Other players + pets ---------------------------------------------------------------
// Everyone else in the room (remotePlayers.js: avatar, skin, animation, pets, their throws) and the
// local player's own pets. What the others draw of us (equipped TNT / trail / pets) goes out when
// it changes; the pose goes out from the loop.
const remotes = createRemotePlayers(scene, { blast })
const myPets = createPetFollowers(scene, { max: 6 })
function syncLoadout() {
  const S = progress.state
  const pets = progress.equippedPets().map((p) => ({ kind: p.kind, variant: p.variant }))
  myPets.setPets(pets)
  sendLoadout({ tnt: S.tnt, trail: S.trail || '', pets })
}
progress.onChange(syncLoadout)
syncLoadout()
thrower = createThrower(scene, { run, getAvatar: () => avatar, canAct: () => !anyWindowOpen() })
hud.on('throw', thrower.requestThrow)

// --- Hold-E interactions ---------------------------------------------------------
// Stand on a TNT pad to buy it, or next to an egg to open its hatch panel: hold E (the touch
// prompt works too) for INTERACT.holdMs.
installInteract()
const nearXZ = (x, z, r) => player.grounded && Math.hypot(player.position.x - x, player.position.z - z) <= r
const shop = LOBBY.shop
const pads = [
  ...shop.front.map((it) => ({ it, x: shop.frontX })),
  ...shop.back.map((it) => ({ it, x: shop.backX })),
  { it: { id: shop.dragon.id, z: shop.dragon.z, cost: shop.dragon.cost }, x: shop.dragon.x },
]
for (const { it, x } of pads) {
  const tnt = progress.tntOf(it.id)
  registerZone({
    id: `tnt:${it.id}`,
    isNear: () => nearXZ(x, it.z, INTERACT.tntRange),
    label: () => (progress.state.tnt === it.id ? null : progress.state.tnts.includes(it.id) ? `equip ${tnt.name}` : `buy ${tnt.name} (${it.cost})`),
    onConfirm: () => {
      const owned = progress.state.tnts.includes(it.id)
      const err = progress.equipTnt(it.id)
      if (err) {
        sfx.deny()
        hud.toast(err)
      } else {
        sfx.claim()
        hud.toast(owned ? `${tnt.name} equipped!` : `Bought and equipped ${tnt.name}!`)
      }
    },
  })
}
// The Glitch Egg booth opens the same hatch panel from a spot in front of it.
const G = LOBBY.glitch
const eggSpots = [
  ...LOBBY.eggs,
  { kind: G.kind, name: G.title, x: G.x + Math.sin(G.yaw) * G.useAt, z: G.z + Math.cos(G.yaw) * G.useAt },
]
for (const egg of eggSpots) {
  registerZone({
    id: `egg:${egg.kind}`,
    isNear: () => nearXZ(egg.x, egg.z, INTERACT.eggRange),
    label: () => `hatch ${egg.name.toLowerCase()}`,
    onConfirm: () => {
      releaseLock() // the panel's buttons need the cursor
      windows.openEgg(egg.kind)
    },
  })
}
// The Best-in-Game pet on the showcase pedestal is sold outright for Wins.
const SC = LOBBY.showcase
registerZone({
  id: `pet:${SC.pet}`,
  isNear: () => nearXZ(SC.x, SC.z, INTERACT.eggRange - 0.2),
  label: () => `buy ${PET_KINDS[SC.pet].name.toLowerCase()} (${SC.lines[3].replace(/^\S+ /, '').toLowerCase()})`,
  onConfirm: () => {
    const err = progress.buyPet(SC.pet, SC.price)
    if (err) {
      sfx.deny()
      hud.toast(err)
    } else sfx.claim()
  },
})
onKey(INTERACT.key, () => {
  if (isInteractShowing()) pressInteract(true)
})
// Walking away from an egg closes its panel.
function closeEggWhenFar() {
  const key = windows.openEggKey()
  if (!key) return
  const egg = eggSpots.find((e) => e.kind === key)
  if (Math.hypot(player.position.x - egg.x, player.position.z - egg.z) > INTERACT.eggLeave) windows.closeTop()
}

// --- Player avatar ----------------------------------------------------------
// The Bloxity base rig (player.glb; procedural fallback if it fails), dressed
// with the signed-in player's equipped cosmetics and body proportions. It
// rebuilds on customizer edits and sign-in/out.
const playerGroup = new Group()
scene.add(playerGroup)
let avatar = null
let animator = null
let generation = 0
let avatarReady = false

function setAvatar(next) {
  if (avatar) playerGroup.remove(avatar)
  disposeAnimator(animator)
  avatar = next
  playerGroup.add(avatar)
  animator = makeAnimator(avatar)
  if (animator) animator.layer = thrower.overlay
}

setAvatar(buildDefaultCharacter()) // visible immediately; replaced once the rig loads

async function loadAvatar() {
  // The SDK fires twice per change (optimistic + confirmed); only the newest load may land.
  const mine = ++generation
  try {
    const group = await loadBaseCharacter()
    if (mine !== generation) return
    const equipped = bloxity.authState.user ? bloxity.getEquippedAvatar() : null
    await attachEquippedAccessories(group, equipped, { skinTextureUrl: bloxity.getSkinTextureUrl() })
    if (mine !== generation) return
    applyProportions(group, bloxity.authState.user ? bloxity.getProportions() : null)
    setAvatar(group)
    syncAvatar() // the others see the new look
  } finally {
    if (mine === generation) avatarReady = true
  }
}

let signedIn = null
bloxity.subscribeAuth((s) => {
  const now = !!s.user
  if (now !== signedIn) {
    signedIn = now
    loadAvatar() // also runs once at start to swap in the real rig
  }
})
bloxity.onAvatarChanged(loadAvatar)
bloxity.onProportionsChanged(() => {
  applyProportions(avatar, bloxity.getProportions())
  syncAvatar()
})
bloxity.onRespawnRequest(respawn)

// --- Modes + keys --------------------------------------------------------------
onModeChanged((mode) => {
  playerGroup.visible = mode !== 'player' // first person: you are the camera
})
onKey('KeyV', toggleMode)
onKey('KeyN', () => lighting.toggleDayNight())
onKey('KeyR', respawn)
installTouch({ mode: toggleMode, day: () => lighting.toggleDayNight(), respawn })

// --- Loop -------------------------------------------------------------------
const clock = new Clock()
let shownLoading = true
let readySince = 0

let manualTime = 0
function frame(forcedDt) {
  const real = clock.getDelta()
  const dt = forcedDt ?? Math.min(real, 0.1) // clamp huge frames (tab switch, breakpoint)
  manualTime += forcedDt ?? 0
  const elapsed = clock.elapsedTime + manualTime

  stepPhysics(dt) // runs the player controller + world at the fixed rate, interpolates bodies
  interpolatePlayer()

  const p = player.renderPosition
  playerGroup.position.set(p.x, p.y, p.z)
  playerGroup.rotation.y = player.facing
  animator?.update(dt, {
    grounded: player.grounded,
    speed: Math.hypot(player.velocity.x, player.velocity.z),
    verticalVelocity: player.velocity.y,
    turn: 0,
  })

  const speed = Math.hypot(player.velocity.x, player.velocity.z)
  sendPose({
    x: Math.round(p.x * 20) / 20,
    y: Math.round(p.y * 20) / 20,
    z: Math.round(p.z * 20) / 20,
    yaw: Math.round(player.facing * 20) / 20,
    speed: Math.round(speed * 2) / 2,
    air: !player.grounded,
  })
  myPets.update(dt, elapsed, p.x, p.y, p.z, player.facing)
  remotes.update(dt, elapsed, p)

  closeEggWhenFar()
  setInteractEnabled(!anyWindowOpen() && !run.busy)
  updateInteract()
  thrower.update(dt)
  run.update(dt, elapsed)
  hud.setThrow(thrower.canThrow)
  hud.setRunning(run.busy)
  updateCamera(camera, dt)
  training.update(dt, camera)
  run.applyCamera(camera, dt)
  const focus = run.focus(playerGroup.position)
  world.update(dt, elapsed)
  lobby.update(dt, elapsed, camera, renderer.domElement.height)
  lighting.update(dt, focus)
  updateFx()
  postfx.render()

  // Loading ends once the scene has drawn and the avatar has had its chance (max ~5 s).
  if (shownLoading) {
    readySince += dt
    if (avatarReady || readySince > 5) {
      shownLoading = false
      bloxity.notifyFirstFrame()
    }
  }
}
renderer.setAnimationLoop(() => frame())

window.addEventListener('beforeunload', bloxity.teardown)

// Dev-only console hook, e.g. __game.teleport(-24, 0, 6, Math.PI / 2)
if (import.meta.env.DEV) {
  const teleport = (x, y, z, facing = player.facing) => {
    resetPlayer({ x, y, z }, facing)
    syncYawToPlayer()
  }
  // Look from the player's spot toward a compass direction, e.g. __game.setView('east').
  const setView = (dir, pitch, distance, at = { x: 0, z: 2 }) => {
    const yaw = { north: 0, east: -Math.PI / 2, south: Math.PI, west: Math.PI / 2 }[dir] ?? dir
    teleport(at.x, 0.1, at.z, yaw + Math.PI)
    setOrbit(yaw, pitch, distance)
  }
  // step(n, dt): run n frames by hand (the hidden preview pane barely animates).
  const step = (n = 1, dt = 1 / 60) => {
    for (let i = 0; i < n; i++) frame(dt)
  }
  window.__game = { remotes, myPets, player, scene, renderer, camera, postfx, bodies: bodyCount, toggleMode, teleport, setView, step, progress, windows, run, thrower, blast }
}
