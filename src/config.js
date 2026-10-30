// Every tunable constant lives here; the rest of src/ holds no theme values.

// --- Identity -------------------------------------------------------------
export const GAME_SLUG = 'tnt-skipping' // slug registered on bloxity.io
export const GAME_TITLE = 'TNT Skipping'

// Forces the Bloxity SDK and avatar CDN to be treated as unavailable (see .env.example).
export const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

// --- World (metres: +X east, +Z south, +Y up) -------------------------------
export const GROUND_Y = 0
// The ground (world.js): one convex slab of land in a sea. The shoreline sweeps from
// the front edge (-Z) back toward +Z on both wings.
export const BEACH = {
  front: -46, // z of the shoreline at the front edge
  back: 90, // z of the back edge
  halfWidth: 75, // x extent of the wings
  wingZ: 24, // z of the shoreline at the far left/right ends
  gateEdge: 21.5, // half-width of the straight shoreline at the front edge
  depth: 4, // slab thickness above the sea floor
  tile: 18, // m per sand texture tile
  fenceHeight: 3, // invisible wall around the sand so nobody walks into the sea
}
export const WATER = { level: -0.6, size: 2800, color: '#12a9e6', shallow: '#7ff0ff' }
export const SPAWN = { x: 0, y: 0.05, z: 2 }
export const SPAWN_FACING = Math.PI // yaw the character faces on spawn (PI = toward -Z)

// --- Player modes (modes.js) -------------------------------------------------
// 'character' = third-person chase cam with the avatar on screen.
// 'player' = first-person, the camera is the player's eyes and the avatar is hidden.
export const MODES = ['character', 'player']
export const START_MODE = 'character'

// --- Physics (physics.js, player.js) ------------------------------------------
export const PHYSICS = {
  gravity: -22, // m/s^2 for dynamic bodies and the player
  fixedStep: 1 / 60, // s per physics tick; rendering interpolates between ticks
  maxSubSteps: 5, // a long frame never runs more ticks than this
  walkSpeed: 8, // m/s
  sprintSpeed: 14, // m/s with Shift held
  accel: 70, // m/s^2 toward the target velocity on the ground
  airAccel: 22, // m/s^2 steering while airborne
  decel: 60, // m/s^2 when no key is held
  turnSpeed: 12, // rad/s the body turns toward its heading
  jumpSpeed: 8.5, // m/s
  coyoteTime: 0.1, // s after leaving a ledge a jump still counts
  jumpBuffer: 0.12, // s a jump pressed before landing is remembered
  stepHeight: 0.45, // m autostep
  maxSlope: 50, // degrees the player can walk up
  snapToGround: 0.4, // m the controller stays glued to downward steps and slopes
  pushMass: 80, // kg the character weighs when shoving crates
  killY: -20, // sank this far: respawn
}
export const PLAYER_DIMS = { radius: 0.75, height: 1.8 } // capsule the character controller moves

// --- Look ------------------------------------------------------------------
export const RENDER = { exposure: 1.0 }
export const FOG = { near: 220, far: 900 }
// The two lighting moods lighting.js blends between (key N toggles).
export const TIME_OF_DAY = {
  transition: 2.5, // s to blend day <-> night
  day: {
    zenith: '#3f9be8',
    horizon: '#bfe7fb',
    sunColor: '#fff6e6',
    // Sun + hemi + env together keep the pale sand (#eed39c) near its own tan;
    // much more and ACES washes it (and the props) out to grey-white.
    // Roblox-like: a strong sun but bright fill, so shaded sides stay saturated.
    sunIntensity: 2.0,
    sunElevation: 58, // degrees above the horizon
    sunAzimuth: 30, // degrees, 0 = from +Z
    hemiSky: '#eaf6ff',
    hemiGround: '#d8e2cc',
    hemiIntensity: 1.6,
    envIntensity: 0.75,
    lampIntensity: 0,
    stars: 0,
    exposure: 0.95,
  },
  night: {
    zenith: '#050b22',
    horizon: '#24345e',
    sunColor: '#9fb4ff', // the moon
    sunIntensity: 0.55,
    sunElevation: 38,
    sunAzimuth: -60,
    hemiSky: '#3a4c80',
    hemiGround: '#1a1a22',
    hemiIntensity: 0.35,
    envIntensity: 0.25,
    lampIntensity: 30,
    stars: 1,
    exposure: 1.15,
  },
}
export const LIGHT = {
  shadowRange: 55, // half-width of the sun's shadow box around the player
  lampColor: '#ffb35c',
  lampDistance: 22,
}

// Default (fallback) character look, used only when player.glb cannot load.
export const CHARACTER_COLORS = { skin: '#f2c79a', suit: '#2f6fd0', hair: '#4a2f1c' }

export const MATERIAL_PBR = {
  PLAYER: { roughness: 0.7, metalness: 0 },
  GROUND: { roughness: 0.95, metalness: 0 },
}

// --- Graphics presets, picked by the Bloxity graphics_quality setting ----------
export const GRAPHICS_PRESETS = {
  Low: { shadows: false, shadowMap: 512, antialias: false, dpr: 1, bloom: false, particles: 0.35 },
  Medium: { shadows: true, shadowMap: 1024, antialias: false, dpr: 1.25, bloom: false, particles: 0.6 },
  High: { shadows: true, shadowMap: 2048, antialias: true, dpr: 2, bloom: true, particles: 1 },
  Ultra: { shadows: true, shadowMap: 4096, antialias: true, dpr: 2, bloom: true, particles: 1 },
}

// Bloom (postfx.js): only HDR-bright pixels (above threshold, linear, before
// tone mapping) glow: neon rails, waterfall, VIP gate, particles. Sunlit sand
// stays under the threshold.
export const BLOOM = { strength: 0.6, radius: 0.35, threshold: 2.0 }
// Neon materials (propkit.js): k = HDR colour multiplier with bloom on; with
// bloom off they are capped at plainMax so they stay coloured, not white.
export const NEON = { k: 3.5, plainMax: 1.2 }

// Phones and tablets default to a lighter preset when the portal sends no value,
// and any preset is capped there (a phone at DPR 3 renders 9x the pixels; bloom
// is a full-screen multi-pass blur, so it stays off on phones).
export const COARSE_POINTER = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
export const DEFAULT_GRAPHICS = COARSE_POINTER ? 'Medium' : 'High'
export const MOBILE_GRAPHICS_CAP = { dpr: 1.5, shadowMap: 1024, particles: 0.6 }

// The preset to render with on this device.
export function graphicsPreset(name) {
  const p = GRAPHICS_PRESETS[name] ?? GRAPHICS_PRESETS[DEFAULT_GRAPHICS]
  if (!COARSE_POINTER) return p
  const cap = MOBILE_GRAPHICS_CAP
  return { ...p, dpr: Math.min(p.dpr, cap.dpr), shadowMap: Math.min(p.shadowMap, cap.shadowMap), bloom: false, particles: Math.min(p.particles, cap.particles) }
}

// --- Touch controls (touch.js) --------------------------------------------------
export const TOUCH = {
  deadZone: 0.12, // fraction of the joystick radius that does nothing
  lookScale: 1.5, // touch drag pixels -> look, relative to a mouse pixel
  pinchPixelsPerNotch: 30, // finger spread change that equals one wheel notch
}

// --- Camera (camera.js) -------------------------------------------------------
export const CAMERA = {
  fov: 70,
  near: 0.1,
  far: 1200,
  startPitch: 0.42, // radians above the horizon (the lobby's high chase cam)
  minPitch: -0.35,
  maxPitch: 1.25,
  firstPersonPitch: 1.45, // |pitch| limit looking up/down in player mode
  eyeHeight: 0.92, // eye height as a fraction of player height (player mode)
  distance: 15, // resting boom length, m
  minDistance: 2.5, // wheel in past this enters player mode
  maxDistance: 40,
  followLerp: 14, // 1/s: the one smoothing stage, on the point the camera follows
  targetHeight: 1.2, // look-at point as a fraction of player height
  lookSensitivity: 0.0026, // rad per pixel of mouse movement
  zoomStep: 0.9, // m per wheel notch
  zoomEase: 12, // 1/s the zoom glides to its target
  speedFov: 6, // degrees the FOV widens at sprint speed
  speedEase: 3, // 1/s the speed framing eases in and out
  clearEase: 6, // 1/s the boom eases back out once a wall stops blocking it
}

// --- Game server (net.js) -----------------------------------------------------------
export const NET = {
  serverUrl: import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? 'ws://localhost:2567' : ''), // empty = ask the Bloxity matchmaker
  room: 'world', // backend room name
  retryMs: [1000, 2000, 4000, 8000, 10000], // backoff between connect attempts (the last repeats)
  giveUpMs: 60000, // a cold pod takes up to ~45 s to wake; stop retrying a launch room after this
  saveEvery: 5, // s: progress is sent at most this often (and when the tab hides or closes)
  playtimeSaveEvery: 60, // s: a save with nothing but playtime changed
  // Presence (remotePlayers.js): this player's pose goes out at most `poseHz` times a second (nothing
  // while it stands still); remote players ease toward the last pose (+ speed x heading for the time
  // since, dead reckoning) at `remoteLerp` 1/s. Nearest `maxRemotes` are drawn (fewer on touch), pets
  // and the rig's animation only within `detailRange` m, nobody past `remoteFade` m.
  poseHz: 10,
  remoteLerp: 12,
  predictMax: 0.25, // s of dead reckoning
  maxRemotes: 16,
  maxRemotesTouch: 8,
  remoteFade: 140,
  detailRange: 45,
  petsShown: 3, // pets drawn round each remote player
  fxHz: 15, // flying-TNT updates a second
  flyBuffer: 3, // remote TNTs flying at once
  fxRange: 700, // m along the lane: other players' throws further from you than this are not drawn
}

// --- Bloxity (bloxity.js, avatar/) -------------------------------------------------
// SDK setting keys this game listens for; registering a listener makes the control
// appear in the portal's settings menu.
export const SETTINGS = {
  graphics_quality: { def: DEFAULT_GRAPHICS, type: 'enum', values: ['Low', 'Medium', 'High', 'Ultra'] },
  camera_sensitivity: { def: '1', type: 'number', min: 0.1, max: 5 },
  show_fps: { def: 'false', type: 'bool' },
  fullscreen: { def: 'false', type: 'bool' },
}

// The base rig, measured from player.glb: origin at the feet, 6.4 units tall at bind pose.
export const RIG_HEIGHT = 6.4
// Bind-pose values of the rig nodes the SDK proportions drive.
export const RIG = { armOffsetX: 2, legOffsetX: 0.6, neckOffsetY: 0.6 }
// getProportions() ranges, straight from the SDK spec; clamped before they reach the scene graph.
export const PROPORTIONS = {
  height: { def: 1, min: 0.5, max: 1.6 },
  shoulderWidth: { def: 1, min: 0.5, max: 1.5 },
  armLength: { def: 1, min: 0.05, max: 3 },
  legOffsetX: { def: 1, min: -0.7, max: 5 },
  torsoScaleX: { def: 1, min: 0.3, max: 2 },
  neckHeight: { def: 1, min: 0.94, max: 1.2 },
  headScale: { def: 1, min: 0.3, max: 2.6 },
}

// Procedural animation (avatar/animator.js), ported from Clean Leaves for Loot.
// Rotations are radians in CHARACTER space: +X swings a limb backward, +Y yaws, +Z rolls.
const deg = (d) => (d * Math.PI) / 180
export const ANIM = {
  airborneDelay: 0.07, // s off the ground before the air pose (ignores a step down a ledge)
  // Walk -> run is one cycle at two depths; phase advances with distance travelled.
  locomotion: {
    minFrequency: 0.7,
    maxFrequency: 3.6,
    strideDistance: 3.8, // m per cycle
    idleSpeed: 0.6,
    walkSpeed: 2.5,
    runSpeed: 8,
    sprintSpeed: 13,
    hipSwing: { walk: deg(22), run: deg(42), sprint: deg(56) },
    kneeBend: { walk: deg(30), run: deg(58), sprint: deg(72) },
    armSwing: { walk: deg(18), run: deg(36), sprint: deg(52) },
    elbowBend: { walk: deg(14), run: deg(44), sprint: deg(70) },
    torsoTwist: { walk: deg(4), run: deg(7), sprint: deg(9) },
    torsoLean: { walk: deg(3), run: deg(10), sprint: deg(18) },
    headCounterTwist: { walk: deg(2), run: deg(4), sprint: deg(5) },
    torsoRoll: { walk: deg(2), run: deg(3), sprint: deg(3) },
    bob: { walk: 0.03, run: 0.07, sprint: 0.09 }, // m, on the avatar root
    bankAngle: deg(9),
    bankRate: 8,
  },
  idle: {
    breathFrequency: 0.35,
    breathAmount: deg(1.8),
    breathBob: 0.007,
    basePose: {
      ArmL1: { x: deg(-4), z: deg(8) },
      ArmL2: { x: deg(12) },
      ArmR1: { x: deg(-4), z: deg(-8) },
      ArmR2: { x: deg(12) },
      LegL1: { x: deg(-4) },
      LegR1: { x: deg(4) },
    },
  },
  airborne: {
    rise: {
      LegL1: { x: deg(-38) }, LegR1: { x: deg(8) }, LegL2: { x: deg(62) }, LegR2: { x: deg(40) },
      ArmL1: { x: deg(-40), z: deg(34) }, ArmR1: { x: deg(-30), z: deg(-34) },
      ArmL2: { x: deg(30) }, ArmR2: { x: deg(30) }, Spine1: { x: deg(6) },
    },
    fall: {
      LegL1: { x: deg(-14) }, LegR1: { x: deg(10) }, LegL2: { x: deg(22) }, LegR2: { x: deg(18) },
      ArmL1: { x: deg(-70), z: deg(40) }, ArmR1: { x: deg(-60), z: deg(-40) },
      ArmL2: { x: deg(20) }, ArmR2: { x: deg(20) }, Spine1: { x: deg(-4) },
    },
    velocityReference: 8, // m/s vertical speed that reads as fully rising / falling
  },
  landing: {
    duration: 0.16,
    pose: {
      LegL1: { x: deg(-34) }, LegR1: { x: deg(-34) }, LegL2: { x: deg(58) }, LegR2: { x: deg(58) },
      ArmL1: { x: deg(-18), z: deg(20) }, ArmR1: { x: deg(-18), z: deg(-20) }, Spine1: { x: deg(14) },
    },
    bobY: -0.2,
  },
  transitions: { toLocomotion: 0.14, toAirborne: 0.12, toLanding: 0.06 }, // s to blend a pose change
}

// --- Lobby (src/lobby/) --------------------------------------------------------------
// The lego hub, laid out from the reference screenshots. +X east, -Z north;
// spawn at the centre facing north toward the throwing runway. Outlines are
// [x, z] lists (closed). Prices/texts are what the reference signs show.
export const LOBBY = {
  studTile: 4, // m per stud texture tile (8 studs => 0.5 m studs)
  colors: {
    plaza: '#c9cbcf',
    checkA: '#ebecee',
    checkB: '#c6c8cc',
    grass: '#4fd42a',
    lane: '#109a26', // the throwing lane
    laneSide: '#0b7a1c',
    trim: '#f6cf12',
    dirt: '#8c5a2e',
    dirtDark: '#6e4421',
    stone: '#8d98a6',
    red: '#e8231c',
    wood: '#9a6332',
    woodDark: '#6f4320',
    gold: '#f7c21a',
    white: '#f4f5f7',
    stepSide: '#e9eaee', // the shop step's sides
  },
  island: { minX: -50, maxX: 64, minZ: -30, maxZ: 64, depth: 6 },
  plaza: { minX: -34, maxX: 50, minZ: -30, maxZ: 38 }, // grey floor inside the fence
  runway: { minX: -14, maxX: 18, length: 275, bankHeight: 3, upperBankHeight: 6, bankWidth: 46 },
  // Green patches with yellow trims on the plaza.
  patches: [
    [[-3.5, -30], [-3.5, -6], [-6, -6], [-6, -3.5], [-12, -3.5], [-12, -10.5], [-20, -10.5], [-20, -30]],
    [[3.5, -30], [3.5, -5.5], [6, -5.5], [6, -3], [10.5, -3], [10.5, -30]],
    [[3.5, 3.5], [3.5, 10.5], [6.5, 10.5], [6.5, 12.5], [11, 12.5], [11, 3.5]],
    [[-3.5, 3], [-3.5, 10.5], [-6, 10.5], [-6, 12.5], [-13, 12.5], [-13, 3]],
    [[-34, 14], [-16, 14], [-16, 20], [-14, 20], [-14, 38], [-34, 38]],
    [[13, 19], [50, 19], [50, 38], [14, 38], [14, 24], [13, 24]],
  ],
  // Pale checker squares (shop floor and egg plaza).
  checker: [
    [[-31, -10.5], [-13, -10.5], [-13, 12], [-31, 12]],
    [[-13, 13], [12, 13], [12, 27], [-13, 27]],
  ],
  fence: [[-34, -30], [-34, 38], [50, 38], [50, -30]], // open polyline round the plaza

  shop: {
    frontX: -15, // front row of pads
    backX: -23.5, // back row, on the raised step
    stepHeight: 0.9,
    front: [
      { z: 7.5, id: 'stick', kind: 'stick', status: 'EQUIPPED', skill: '+1 Skill', cost: 'FREE', pad: '#e8231c' },
      { z: 3.8, id: 'bomb', kind: 'bomb', skill: '+3 Skill', cost: '150 Wins', pad: '#2f6df0' },
      { z: 0, id: 'bundle', kind: 'trio', skill: '+5 Skill', cost: '800 Wins', pad: '#2f6df0' },
      { z: -3.8, id: 'banded', kind: 'bundle', skill: '+12 Skill', cost: '4K Wins', pad: '#e8231c' },
      { z: -7.5, id: 'keg', kind: 'barrel', skill: '+30 Skill', cost: '100K Wins', pad: '#8a5a2e' },
    ],
    back: [
      { z: 8, kind: 'crate', id: 'frost', tint: '#3d9cff', skill: '+75 Skill', cost: '500K Wins', pad: '#2f6df0' },
      { z: 4, kind: 'crate', id: 'toxic', tint: '#38d65a', skill: '+200 Skill', cost: '1.5M Wins', pad: '#22a845' },
      { z: 0, kind: 'crate', id: 'void', tint: '#9a4dff', skill: '+500 Skill', cost: '8M Wins', pad: '#7a3df0' },
      { z: -4, kind: 'royal', id: 'golden', tint: '#ffcc22', skill: '+1.25K Skill', cost: '40M Wins', pad: '#e8a019' },
      { z: -8, kind: 'royal', id: 'royal', tint: '#ff7ad9', skill: '+3.5K Skill', cost: '250M Wins', pad: '#d64fb0' },
    ],
    // reach: half-width of the square its buy prompt covers (the solid pad's 1.8 + PLAYER_DIMS.radius + a little)
    dragon: { x: -11, z: 0, reach: 2.8, id: 'dragon', stock:'STOCK: 1000/1000', name: 'DRAGON TNT', perk: 'ALWAYS 200% BETTER', cost: '5B Wins', price: 'ONLY \u{1F3C6} 5B WINS' },
  },
  portal: { x: -10.5, z: -15, yaw: 0.75, useAt: 3.2 }, // useAt: metres in front of it where E works; each world's sign and swirl are in WORLDS
  glitch: { x: -4.5, z: -24, yaw: 0.45, kind: 'glitch', title: 'GLITCH EGG', price: '\u{1F3C6} 1B WINS', useAt: 3 }, // useAt: metres in front of the booth where the hatch panel opens
  eggs: [
    { kind: 'common', x: 8, z: 16, name: 'COMMON EGG', cost: '50 WINS', pad: 'wood' },
    { kind: 'uncommon', x: 4, z: 18.5, name: 'UNCOMMON EGG', cost: '800 WINS', pad: 'steel' },
    { kind: 'rare', x: -5, z: 18.5, name: 'RARE EGG', cost: '40K WINS', pad: 'gold' },
    { kind: 'rainbow', x: -9, z: 16, name: 'RAINBOW EGG', cost: '30 ROBUX', pad: 'pink' },
  ],
  showcase: { x: 0, z: 20, pet: 'lion', price: 25e9, lines: ['STOCK 1000/1000', 'BEST IN GAME', 'ALWAYS x400 SKILL', '\u{1F3C6} 25B WINS'] },
  leaderboards: { z: 31, titles: ['Wins', 'Top Time Played', 'Best Throw', 'Top Skills'] },
  tower: { x: 6, z: 54, radius: 4.2, height: 42 },
  windmill: { x: -40, z: -100 },

  // Training lanes, north to south within a bank, each running east from its bank's
  // startX. Widths are double the original; to fit the same zone (x 14..48, z -29..13)
  // the lanes are packed into two banks side by side, the second reached by a
  // walkway strip between them. `count` lanes of `list` go to each bank, in order.
  lanes: {
    gap: 0.5,
    firstZ: -29, // north edge of the first lane of every bank
    banks: [
      { startX: 14, length: 16, count: 4 },
      { startX: 34, length: 14, count: 3 },
    ],
    list: [
      { mult: '1x SKILL', req: '0', icon: 'ball', unlocked: true, width: 10, rim: '#ff8a1e', track: '#e89a50', style: 'wood' },
      { mult: '4x SKILL', req: '2', icon: 'ball', width: 10, rim: '#13a98d', track: '#2fd6b5', style: 'glass' },
      { mult: '10x SKILL', req: '5', icon: 'ball', width: 10, rim: '#4a33d6', track: '#7a5cff', style: 'plate' },
      { mult: '20x SKILL', req: '7', icon: 'ball', width: 10.4, rim: '#e9eef5', track: '#3a9bff', style: 'water' },
      { mult: '3x SKILL', req: '99', icon: 'robux', allWorlds: true, width: 11.2, rim: '#8f98a6', track: '#7a4dff', style: 'plate', edge: '#e8231c' },
      { mult: '15x SKILL', req: '249', icon: 'robux', allWorlds: true, width: 12, rim: '#e8b21a', track: '#ffd23a', style: 'plate' },
      { mult: '50x SKILL', req: '599', icon: 'robux', allWorlds: true, width: 13.2, rim: '#3a2fd0', track: '#5a3df5', style: 'plate', edge: '#ffe14a', neon: true },
    ],
  },
  // Floating islands in the sky: [x, y, z, scale].
  floatingIslands: [
    [-62, 26, 44, 1], [-26, 30, 96, 0.8], [32, 34, 100, 1.1], [86, 28, 40, 0.9], [-84, 22, -8, 1.2], [96, 32, -36, 1],
    [-56, 36, -120, 1.3], [70, 30, -150, 1], [8, 40, 124, 1.1], [-96, 34, 80, 0.9],
  ],
}

// --- Lane training (training.js) ---------------------------------------------------------
// Standing on a lane's pad (in front of its start; nobody walks onto the lane itself)
// throws the equipped TNT down the lane by itself, once per `cooldown`. Each blast pays the
// TNT's Skill x the lane's multiplier (x the usual SKILL multiplier).
export const TRAIN = {
  cooldown: 1, // s between throws
  release: 0.24, // s from the wind-up start to the TNT leaving the hand
  flight: { base: 0.5, perMetre: 0.035 }, // s in the air
  arc: { base: 3, perMetre: 0.12 }, // m the throw peaks above the straight line
  padSize: 2.4, // m, the pad a player stands on
  padGrace: 0.5, // m the trigger reaches past the pad's edge
  shake: 0.32, // m of camera shake at the blast
}

// --- The throw (thrower.js, run.js, runScenery.js, blast.js) ---------------------------
// The yellow band across the start of the lane. Nobody walks past `minZ`: a wall stands
// there, the lane is only ever crossed by a thrown TNT.
export const THROW_ZONE = { maxZ: -30, minZ: -37, line: 0.6 }
// Lane metres count north from z0. Skill sets the range, the range sets how long the TNT
// flies and how many times it skips; each skip pays the equipped TNT's Skill and the blast
// pays it once per `blastSkillEvery` m. Zones pay `wins` per blast (x the Wins multiplier).
// The range grows with Skill^reachPower, so every zone takes far more Skill than the last and
// the end of the lane is 100M Skill (about 2.5 h of play at this economy).
export const RUN = {
  z0: -30,
  length: 9750,
  reachBase: 120, // m at 0 Skill
  reachScale: 96, // with reachPower: 625 m at 760 Skill, 3 km at 800K, 9.7 km at 100M
  reachPower: 0.25,
  edgeMargin: 5, // m the TNT stays off the lane walls
  time: { base: 4.4, perMetre: 0.0105, max: 12.5, farPerMetre: 0.0012 }, // s from the hand to the last skip; past `max` it only grows by farPerMetre
  launchShare: 0.17, // the first big arc's share of that time
  launchMax: 2.2, // s, so the longest throws don't arc out of sight
  fadeEnd: 0.24, // speed left at the end of the range
  gravity: 36,
  skips: { base: 15, perMetre: 1 / 30, max: 40, minHop: 0.09, jitter: 0.1 },
  flightScale: 1.5, // TNT size in flight (in the hand it is `heldScale`)
  heldScale: 0.62,
  fuseTime: 0.95, // s from stopping to the blast
  blastSkillEvery: 80,
  slowMo: 0.14, // time scale right after the blast, eased back to 1 by `slowMoEase` /s
  slowMoEase: 3.2,
  holdTime: 3.4, // s the camera stays on the crater
  returnTime: 1.1,
  streamAhead: 1150, // m of lane drawn ahead of the focus
  streamBehind: 120,
  propsPerBank: 70, // scenery a zone spreads along each bank at most, however long it is
  camera: {
    delay: 0.2, // s after the release before it leaves the player
    back: 8.5, up: 2.3, lookAhead: 16, lookUp: 1.5, followY: 0.45, // chasing
    blastBack: 13, blastUp: 4.2, blastSide: 3, // on the crater
    fovSpeed: 14, // degrees wider at full speed
    fovPunch: 16, // degrees of the blast's kick
    shake: 0.9, // m at full trauma
    maxLag: 20, // m the chase camera may fall behind a fast TNT
  },
  zones: [
    { start: 0, label: 'The Green', wins: 25, floor: '#109a26', dirt: '#a8642e', dust: ['#7fe05a', '#d8ffd0', '#8c5a2e'] },
    { start: 275, label: 'Coconut Cove', wins: 40, floor: '#ecdcb2', dirt: '#b8925a', dust: ['#f6ecd0', '#ffffff', '#d8c08a'], bank: '#e6d5a6', wall: '#a8784a', trim: '#22c8ee', title: { color: '#3fdcf0', outline: '#0a2a40' }, sub: '#ffd23a', props: 'cove' },
    { start: 640, label: 'Dynamite Dunes', wins: 60, floor: '#f2b45c', dirt: '#b0602a', dust: ['#ffd48a', '#fff0c8', '#d8843a'], bank: '#e89a48', wall: '#a8582a', trim: '#ff5a2a', title: { color: '#ffb02a', outline: '#5a1a00' }, sub: '#fff0c8', props: 'dunes' },
    { start: 1060, label: 'Maple Hollow', wins: 90, floor: '#c8653a', dirt: '#6e3420', dust: ['#ff9a4a', '#ffd8a0', '#a8401e'], bank: '#a84a2a', wall: '#6e3420', trim: '#ffc21a', title: { color: '#ff8a3a', outline: '#4a1200' }, sub: '#ffe0b0', props: 'maple' },
    { start: 1500, label: 'Frostbite Peaks', wins: 130, floor: '#d8f0fa', dirt: '#7fb4d8', dust: ['#ffffff', '#d8f4ff', '#9fd0ee'], bank: '#eef8ff', wall: '#6f9cc4', trim: '#3aa8ff', title: { color: '#8fe4ff', outline: '#0a2a50' }, sub: '#ffffff', props: 'frost' },
    { start: 2050, label: 'Mushroom Marsh', wins: 180, floor: '#4f9a6a', dirt: '#3a5a38', dust: ['#9ae6b0', '#e8d0ff', '#4a8a5a'], bank: '#3f7a58', wall: '#2a4a38', trim: '#c86aff', title: { color: '#7dffb0', outline: '#0a3020' }, sub: '#f0c0ff', props: 'marsh' },
    { start: 2700, label: 'Candy Canyon', wins: 240, floor: '#ff9ccb', dirt: '#c8507e', dust: ['#ffd0e6', '#fff6a0', '#9af0ff'], bank: '#ffc4e0', wall: '#e86aa0', trim: '#5ae0ff', title: { color: '#ff7ac0', outline: '#5a0a3a' }, sub: '#fff6a0', props: 'candy' },
    { start: 3400, label: 'Crystal Caverns', wins: 310, floor: '#8f6ae8', dirt: '#4a2f9a', dust: ['#d8c0ff', '#ffffff', '#9a7aff'], bank: '#6f4fc8', wall: '#3a2488', trim: '#6ef0ff', title: { color: '#c8a0ff', outline: '#1a0a50' }, sub: '#bff6ff', props: 'crystal' },
    { start: 4200, label: 'Phantom Graves', wins: 400, floor: '#5a5468', dirt: '#2e2a38', dust: ['#a89ac8', '#d8d0e8', '#4a4458'], bank: '#3e3a4c', wall: '#26222e', trim: '#9aff5a', title: { color: '#b89aff', outline: '#140a24' }, sub: '#d8ffb0', props: 'graves' },
    { start: 5200, label: 'Ember Forge', wins: 520, floor: '#4a3434', dirt: '#241818', dust: ['#ff8a2e', '#ffd28a', '#5a3a3a'], bank: '#3a2828', wall: '#1e1414', trim: '#ff5a1a', title: { color: '#ff8a2e', outline: '#3a0a00' }, sub: '#ffd28a', props: 'ember' },
    { start: 6300, label: 'Neon City', wins: 680, floor: '#2a2a4a', dirt: '#14142a', dust: ['#ff3ad8', '#3af0ff', '#6a6aa8'], bank: '#1e1e3a', wall: '#101024', trim: '#ff3ad8', title: { color: '#3af0ff', outline: '#20004a' }, sub: '#ff9af0', props: 'neon' },
    { start: 7500, label: 'Cloud Kingdom', wins: 880, floor: '#f4f6ff', dirt: '#b8c4e8', dust: ['#ffffff', '#e8f0ff', '#ffe9a0'], bank: '#e4ecff', wall: '#a8b8e0', trim: '#ffcf3a', title: { color: '#ffd84a', outline: '#3a3a80' }, sub: '#ffffff', props: 'cloud' },
    { start: 8800, label: 'Starfall Moon', wins: 1150, floor: '#8a8ea8', dirt: '#4a4e68', dust: ['#d8dcf0', '#ffffff', '#6a6e90'], bank: '#6a6e8a', wall: '#32344e', trim: '#5a6cff', title: { color: '#bcc6ff', outline: '#0a0e3a' }, sub: '#ffe14a', props: 'moon' },
  ],
}
// The blast (blast.js): crater radius by the TNT's place in TNTS, and what flies out.
export const BLAST = {
  radius: 4.6,
  radiusStep: 0.28,
  radiusMax: 8,
  levels: [0, -0.9, -1.9], // crater steps, m
  bricks: 84, // flying lego bricks, split between the lane's two colours
  shreds: 44, // red and white paper petals
  chips: 60, // small clods kicked up by the skips
  aftershocks: 3,
}

// --- Windows: rebirth, TNT, pets, eggs, boosts, trails, rewards (progress.js, windows.js) ---
// Rebirth: SKILL climbs the level from 1 to `level` (where it caps); every level takes
// perLevel * scale^rebirths SKILL (760 to the first rebirth, 57M to the seventh).
// Rebirthing resets SKILL (so the level) and adds +1 to
// the x SKILL multiplier for good. Every rebirth past `winsFrom` also multiplies Wins by
// `winsScale` for good: that is the end game, as rebirth 8 takes 372M SKILL, so it can never
// speed up the road to 100M, and it brings Dragon TNT to about 10 h of play. Skip Rebirth is
// a paid purchase (`skipPrice` premium coins), which only toasts "coming soon" for now.
export const REBIRTH = { perLevel: 40, scale: 6.5, level: 20, skipPrice: 20, winsFrom: 7, winsScale: 10 }
// TNT (Inventory > TNT): the equipped one adds `skill` SKILL per throw. Bought with Wins
// (tap a card); `look` picks the icon (icons.js tntIcon), `colors` tint the bundles.
// `reward: true` ones are never sold and only show once owned (Daily Rewards day 7).
export const TNTS = [
  { id: 'stick', name: 'Dynamite Stick', skill: 1, cost: 0, look: 'stick' },
  { id: 'bomb', name: 'Cherry Bomb', skill: 3, cost: 150, look: 'bomb' },
  { id: 'bundle', name: 'TNT Bundle', skill: 5, cost: 800, look: 'bundle', colors: ['#e8323a', '#a8141e'] },
  { id: 'banded', name: 'Black Powder', skill: 12, cost: 4e3, look: 'banded' },
  { id: 'keg', name: 'Powder Keg', skill: 30, cost: 100e3, look: 'keg' },
  { id: 'frost', name: 'Frost TNT', skill: 75, cost: 500e3, look: 'bundle', colors: ['#5ab8ff', '#1a6ad8'] },
  { id: 'toxic', name: 'Toxic TNT', skill: 200, cost: 1.5e6, look: 'bundle', colors: ['#6ae84a', '#2a9a2a'] },
  { id: 'void', name: 'Void TNT', skill: 500, cost: 8e6, look: 'bundle', colors: ['#a070ff', '#5a2ad0'] },
  { id: 'golden', name: 'Golden Dynamite', skill: 1250, cost: 40e6, look: 'golden' },
  { id: 'royal', name: 'Royal TNT', skill: 3500, cost: 250e6, look: 'royal' },
  // Top tier: 3x Royal ("ALWAYS 200% BETTER" on its sign), 20x its price.
  { id: 'dragon', name: 'Dragon TNT', skill: 10500, cost: 5e9, look: 'dragon', colors: ['#ff5a1a', '#8a0a12'] },
  { id: 'gift', name: 'Gift TNT', skill: 5000, reward: true, look: 'gift' },
]
// Pets. Each equipped pet multiplies SKILL by `mult`; several add up (x2 + x2.5 = x4.5).
// `look` picks the portrait (pets.js), body / accent its colours. Every kind also comes
// in the PET_VARIANTS below, so the Pet Index holds kinds x variants.
export const PET_KINDS = {
  minerHamster: { name: 'Miner Hamster', rarity: 'common', mult: 2, look: 'miner', body: '#c8875a', accent: '#f4d6b4' },
  cherryRaccoon: { name: 'Cherry Raccoon', rarity: 'common', mult: 2.5, look: 'raccoon', body: '#8a7a70', accent: '#3a3238' },
  gogglesCat: { name: 'Goggles Cat', rarity: 'uncommon', mult: 3, look: 'goggles', body: '#f2d84a', accent: '#ff8a2a' },
  partyBunny: { name: 'Party Bunny', rarity: 'uncommon', mult: 4, look: 'bunny', body: '#f4f4f8', accent: '#e8324a' },
  dawnRooster: { name: 'Dawn Rooster', rarity: 'rare', mult: 6, look: 'rooster', body: '#ffffff', accent: '#e8243a' },
  froggy: { name: 'Fuse Frog', rarity: 'rare', mult: 7, look: 'frog', body: '#6ad84a', accent: '#2a9a2a' },
  foxy: { name: 'Spark Fox', rarity: 'rare', mult: 9, look: 'fox', body: '#ff8a3a', accent: '#fff3e0' },
  panda: { name: 'Blast Panda', rarity: 'epic', mult: 12, look: 'panda', body: '#ffffff', accent: '#2a2a32' },
  piggy: { name: 'Piggy Bank', rarity: 'epic', mult: 16, look: 'pig', body: '#ffb8cc', accent: '#ff7aa0' },
  unicorn: { name: 'Unicorn', rarity: 'legendary', mult: 25, look: 'horn', body: '#fff2fb', accent: '#c86aff' },
  dragon: { name: 'Baby Dragon', rarity: 'legendary', mult: 40, look: 'dragon', body: '#e2361c', accent: '#ffcf3a' },
  phoenix: { name: 'Boom Phoenix', rarity: 'mythical', mult: 75, look: 'phoenix', body: '#ff6a1a', accent: '#ffe14a' },
  // BEST IN GAME: above every other pet (even an Exclusive Phoenix is x375). Bought at the
  // lobby showcase for LOBBY.showcase.price Wins, or hatched from the Glitch Egg.
  lion: { name: 'Boom Lion', rarity: 'mythical', mult: 400, look: 'lion', body: '#f6b84a', accent: '#b8561a' },
}
// Pet variants (the Pet Index tabs): `mult` scales the kind's, `chance` is the odds a
// hatch comes out in it (x luck); Exclusive never hatches (shop / events later).
export const PET_VARIANTS = {
  normal: { label: 'Normal', mult: 1 },
  golden: { label: 'Golden', mult: 2, chance: 0.02 },
  diamond: { label: 'Diamond', mult: 3, chance: 0.004 },
  exclusive: { label: 'Exclusive', mult: 5 },
}
// Lobby eggs hatch on the spot from their panel (hold E): `price` Wins each, or `robux`
// per PETS.hatchCounts pack. Reward eggs (Playtime, gifts) wait in Inventory > Eggs.
// `hatches` = weights; luck multiplies every pet's weight but the first.
export const EGGS = {
  common: { name: 'Common Egg', price: 50, color: '#fff6e8', band: '#ff9a2a', look: 'zigzag', hatches: { minerHamster: 40, cherryRaccoon: 30, gogglesCat: 20, partyBunny: 10 } },
  uncommon: { name: 'Uncommon Egg', price: 800, color: '#6ae05a', band: '#2a9a2a', look: 'zigzag', hatches: { gogglesCat: 35, partyBunny: 30, froggy: 22, foxy: 13 } },
  rare: { name: 'Rare Egg', price: 40e3, color: '#5ab8ff', band: '#ffd23a', look: 'stars', hatches: { foxy: 40, panda: 30, piggy: 20, unicorn: 8, dragon: 2 } },
  // Top tier, Wins only: one egg costs a Royal TNT x4, and 1 in 8 is the Best-in-Game Lion
  // (the showcase sells it outright at 25B, ~3x the egg's expected cost of ~8B per Lion).
  glitch: { name: 'Glitch Egg', price: 1e9, color: '#2a1a6a', band: '#2bf0ff', look: 'zigzag', hatches: { phoenix: 88, lion: 12 } },
  rainbow: { name: 'Rainbow Egg', robux: { 1: 30, 3: 59, 8: 139 }, color: '#fffaf0', look: 'rainbow', hatches: { panda: 40, piggy: 30, unicorn: 20, dragon: 8, phoenix: 2 } },
}
export const PETS = {
  storage: 200,
  hatchCounts: [1, 3, 8], // the egg panel's three buttons
  slots: 3, // equipped at once to start
  slotCosts: [25e3, 2e6, 80e6], // Wins for each extra slot (the green + by Equipped)
  shake: 1.1, // s the egg rattles before the reveal
  reveal: 2.2, // s the pet card stays up
  indexStep: 10, // pets discovered per Pet Index luck milestone
  indexLuck: 1, // % luck each milestone adds
}
// Potions (Inventory > Boosts): drinking one gives `mult`x for `minutes`; another of the
// same kind while one runs adds its time. `card` is the card colour.
export const BOOSTS = {
  skill: { label: 'Skill', mult: 2, minutes: 10, color: '#3aa8ff', card: '#2a6aa6', emblem: 'bolt' },
  wins: { label: 'Wins', mult: 2, minutes: 10, color: '#ffc21a', card: '#a8822a', emblem: 'trophy' },
  luck: { label: 'Luck', mult: 2, minutes: 10, color: '#4ad84a', card: '#2a7a44', emblem: 'clover' },
}
// Trails: bought with Wins, the equipped one multiplies every Win by `boost`.
// `row` = the row colour in the window, `colors` = the smoke in its icon.
export const TRAILS = [
  { id: 'white', name: 'White Smoke', boost: 1.2, cost: 10e3, row: '#dfe2e8', colors: ['#ffffff', '#c8ccd6'] },
  { id: 'red', name: 'Red Spark', boost: 1.3, cost: 750e3, row: '#e23a4a', colors: ['#ff5a4a', '#c8102a'] },
  { id: 'blue', name: 'Blue Flame', boost: 1.4, cost: 40e6, row: '#2a7ae6', colors: ['#bff0ff', '#3aa8ff', '#1a40c8'] },
  { id: 'yellow', name: 'Yellow Sparkler', boost: 1.5, cost: 5e9, row: '#f0c64a', colors: ['#fff6a0', '#ffd21a', '#f0a010'] },
  { id: 'purple', name: 'Purple Fizz', boost: 1.6, cost: 200e9, row: '#c48af2', colors: ['#f0c0ff', '#c86aff', '#7a2ad8'] },
  { id: 'fire', name: 'Fire Blast', boost: 1.7, cost: 10e12, row: '#f0601a', colors: ['#ffe14a', '#ff8a1a', '#e8301a'] },
  { id: 'crystal', name: 'Crystal Dust', boost: 1.8, cost: 250e12, row: '#d49af6', colors: ['#ff8ad8', '#bff0ff', '#3aa8ff'] },
  { id: 'galaxy', name: 'Galaxy Smoke', boost: 1.9, cost: 30e18, row: '#3048b8', colors: ['#1a1060', '#3a48d8', '#ffe14a'] },
]
// Playtime Rewards: minutes played this session (the clock restarts with the page).
export const PLAYTIME = [
  { at: 1, kind: 'skill', n: 2e3 },
  { at: 3, kind: 'wins', n: 100 },
  { at: 5, kind: 'egg', egg: 'common' },
  { at: 8, kind: 'boost', boost: 'skill', n: 1 },
  { at: 12, kind: 'wins', n: 500 },
  { at: 15, kind: 'skill', n: 20e3 },
  { at: 25, kind: 'boost', boost: 'wins', n: 1 },
  { at: 40, kind: 'egg', egg: 'uncommon' },
  { at: 55, kind: 'boost', boost: 'luck', n: 1 },
  { at: 75, kind: 'wins', n: 15e3 },
  { at: 95, kind: 'skill', n: 2e6 },
  { at: 115, kind: 'egg', egg: 'rare' },
]
// Daily Rewards, one a day; miss two days and the streak restarts at day 1.
export const DAILY = {
  every: 24 * 3600, // s
  grace: 48 * 3600, // s after the last claim before the streak breaks
  days: [
    { label: '+1 SKILL POTION', kind: 'boost', boost: 'skill', n: 1 },
    { label: 'DAWN ROOSTER', kind: 'pet', pet: 'dawnRooster' },
    { label: '+1 WINS POTION', kind: 'boost', boost: 'wins', n: 1 },
    { label: '+2 LUCK POTIONS', kind: 'boost', boost: 'luck', n: 2 },
    { label: '+3 SKILL POTIONS', kind: 'boost', boost: 'skill', n: 3 },
    { label: '+3 WINS POTIONS', kind: 'boost', boost: 'wins', n: 3 },
    { label: 'GIFT TNT', kind: 'tnt', tnt: 'gift' },
  ],
}

// --- Worlds (worlds.js) ------------------------------------------------------------------
// A world is the same lobby, shop, lanes, eggs, throw, prices and Wins under another look: the
// first entry is the look the rest of this file describes, the others override it. `skill` is the
// SKILL that opens a world for good (rebirths reset SKILL, never `worlds`, the unlocked list in the
// save). `portal` is that world's portal: the sign and swirl, and `to` the world it leads to.
// `sea` puts water round the land ({ level, color }, level below the deepest crater step, BLAST.levels).
const PIRATE_LANE = '#16aebf'
const pirateZone = (label, props, floor, dirt, bank, wall, trim, title, outline, sub, dust = [floor, dirt, '#ffffff']) => ({ label, props, floor, dirt, bank, wall, trim, title: { color: title, outline }, sub, dust })
const PIRATE_ZONES = [
  pirateZone('Cannon Cove', 'lagoon', PIRATE_LANE, '#0d7f92', '#f3dc96', '#c9a05e', '#ffc21a', '#3fe6f0', '#07303f', '#fff0c8', ['#8ff0f6', '#ffffff', '#f3dc96']),
  pirateZone('Palm Lagoon', 'lagoon', '#efe0ae', '#b98f5c', '#f3dc96', '#c9a05e', '#16aebf', '#3fe6f0', '#07303f', '#ffd23a'),
  pirateZone('Treasure Sands', 'treasure', '#f5c96a', '#b0782e', '#efbb56', '#a8702e', '#e8321e', '#ffd23a', '#5a2a00', '#fff0c8', ['#ffd23a', '#fff6c8', '#d89a2e']),
  pirateZone('Barnacle Bay', 'docks', '#a8764a', '#6a4426', '#d8c08a', '#6f4a2a', '#ffc21a', '#ffc98a', '#3a1c08', '#fff0c8'),
  pirateZone('Coral Reef', 'coral', '#ff8f7a', '#c8504a', '#2ac4c8', '#128a96', '#ffe14a', '#ff9ab0', '#5a0a2a', '#fff6a0', ['#ffc0b0', '#ffffff', '#5ae0e8']),
  pirateZone('Kraken Deep', 'kraken', '#1f5a8a', '#0f2f50', '#174a78', '#0c2a48', '#c86aff', '#c89aff', '#160a3a', '#bff6ff', ['#6ab0e8', '#ffffff', '#a06ae8']),
  pirateZone('Buccaneer Bluffs', 'bluffs', '#c8a070', '#7a5a38', '#7fae52', '#6e5236', '#e8321e', '#ffcf8a', '#3a1c08', '#ffe9b8'),
  pirateZone('Skull Rock', 'skull', '#8d8a84', '#55524c', '#6f6c66', '#3f3d3a', '#ffcf3a', '#f0ece0', '#1e1c18', '#ffcf3a', ['#c8c4b8', '#f0ece0', '#6a6660']),
  pirateZone('Ghost Fleet', 'ghost', '#4a5a66', '#222c36', '#34424e', '#222c36', '#7dffd8', '#a8ffe6', '#06241e', '#d8fff4', ['#8fa8b4', '#d8fff4', '#4a5a66']),
  pirateZone('Powder Keg Point', 'keg', '#6a4a34', '#2e2016', '#4e3626', '#2e2016', '#ff5a1a', '#ff9a4a', '#3a0a00', '#ffd28a', ['#ff9a4a', '#ffd28a', '#5a4030']),
  pirateZone('Volcano Isle', 'volcano', '#3f2f34', '#1c1418', '#2f2328', '#1c1418', '#ff6a1a', '#ff8a2e', '#3a0a00', '#ffd28a', ['#ff8a2e', '#ffd28a', '#5a3a3a']),
  pirateZone('Storm Seas', 'storm', '#3f6f86', '#1c3848', '#2f566c', '#1c3848', '#ffe14a', '#d8f0ff', '#0a2a40', '#ffe14a', ['#d8f0ff', '#ffffff', '#6a9ab4']),
  pirateZone("Davy Jones' Locker", 'locker', '#123a5a', '#081c30', '#0e2e4a', '#081c30', '#2bf0d0', '#5af0d8', '#04202a', '#ffe14a', ['#5af0d8', '#ffffff', '#2a6a8a']),
]
const worldZones = (themes) => RUN.zones.map((zone, i) => ({ ...zone, ...themes[i] }))
export const WORLDS = [
  {
    id: '', // the start world ('' on the backend's roster)
    name: 'TNT Island',
    colors: LOBBY.colors,
    sky: TIME_OF_DAY,
    zones: RUN.zones,
    tower: { body: '#e3201a', light: '#f5f5f5', dark: '#1d1d1d', cap: '#b3150f' },
    portal: { to: 'pirate', title: 'PIRATE ISLES', sub: 'NEEDS 400M SKILL', open: 'UNLOCKED', deep: [0.05, 0.62, 0.95], bright: [0.55, 1, 1], light: '#3ad8ff' },
  },
  {
    id: 'pirate',
    name: 'Pirate Isles',
    skill: 400e6,
    colors: { ...LOBBY.colors, plaza: '#c7a274', checkA: '#e6cfa0', checkB: '#b8895a', grass: '#f3dc96', patch: '#5fd23e', lane: PIRATE_LANE, laneSide: '#0d7f92', dirt: '#c9a05e', dirtDark: '#a07a42', stone: '#9c8f7a', wood: '#7a4f2a', woodDark: '#523218', white: '#fff6e0', stepSide: '#c9a878' },
    sky: {
      day: { ...TIME_OF_DAY.day, zenith: '#1f86e0', horizon: '#ffe3b8', sunColor: '#ffe9c4', sunIntensity: 2.1, sunElevation: 44, hemiSky: '#fff0d8', hemiGround: '#e8d2a0', hemiIntensity: 1.5 },
      night: { ...TIME_OF_DAY.night, zenith: '#040c2a', horizon: '#1a3f6e', hemiSky: '#34507e' },
    },
    sea: { level: -2.4, color: '#14bcd8' },
    zones: worldZones(PIRATE_ZONES),
    tower: { body: '#8a5a30', light: '#ffc21a', dark: '#2a2a30', cap: '#6a4024' }, // a giant powder keg
    portal: { to: '', title: 'TNT ISLAND', sub: 'BACK TO WORLD 1', deep: [0.08, 0.62, 0.2], bright: [0.7, 1, 0.5], light: '#7dff6a' },
  },
]
export const WORLD_FADE = 450 // ms the screen takes to close before the world changes

export const FONT_FAMILY = 'Fredoka'

export function clamp(n, min, max) {
  return n < min ? min : n > max ? max : n
}

// Coerce one raw SDK string against its SETTINGS entry.
export function coerceSetting(key, raw) {
  const spec = SETTINGS[key]
  if (!spec) return raw
  const value = raw === '' || raw == null ? spec.def : raw
  if (spec.type === 'bool') return value === 'true' || value === true
  if (spec.type === 'enum') return spec.values.includes(value) ? value : spec.def
  const n = Number(value)
  return clamp(Number.isFinite(n) ? n : Number(spec.def), spec.min, spec.max)
}

// Hold-E interactions (interact.js): hold E (or the prompt on touch) for holdMs next to a TNT pad to
// buy it or an egg to open its hatch panel, which closes again past eggLeave.
export const INTERACT = { holdMs: 1200, key: 'KeyE', tntRange: 2.2, eggRange: 2.8, eggLeave: 4.5, portalRange: 3.4 }
