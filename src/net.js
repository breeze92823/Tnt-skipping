// Colyseus link to Tnt-skipping-backend (room "world"). The server holds the player's ONLY save:
// nothing about progress is kept in the browser. On join the server answers with `progress` (the
// saved doc: progress.hydrate() takes it), `noProgress` (new account, guest or no database: keep
// the fresh state and save it) or `serverError` (the save could not be read: never overwrite it).
// From then on the whole snapshot is sent as `saveProgress` whenever it changed, at most every
// NET.saveEvery s, and when the tab hides or closes. The lobby leaderboards come back as
// `leaderboard`. Guests (not signed in to Bloxity) are never saved by the server, so their
// progress lasts the page. Never throws and never blocks play: with no server (or an unreachable
// one) the game runs on a fresh, unsaved state and keeps trying to connect.
import { Callbacks, Client } from '@colyseus/sdk'
import { DEV_MODE, NET } from './config.js'
import {
  authState,
  canResolveServer,
  getEquippedAvatar,
  getPfp,
  getProportions,
  getSkinTextureUrl,
  inviteLink,
  launchRoomId,
  locateRoom,
  reportPlayer,
  resolveServerEndpoint,
  subscribeAuth,
  updateRoom,
} from './bloxity.js'

export const net = {
  room: null,
  connected: false,
  hydrated: false, // a progress/noProgress answer arrived: saving is allowed
  get sessionId() {
    return this.room?.sessionId ?? null
  },
}

// --- Identity ----------------------------------------------------------------
// Signed-in players use their Bloxity id; everyone else a per-page guest id (never saved). Dev
// mode (no SDK) plays as a signed-in dev id kept in the browser so a local server with Mongo keeps
// its progress across reloads. That id is the only thing ever stored in the browser, never progress.
const rand = () => Math.random().toString(36).slice(2, 8)
const GUEST = `guest-${rand()}`
const DEV = DEV_MODE
  ? (() => {
      try {
        let id = localStorage.getItem('tnt-skipping.dev')
        if (!id) localStorage.setItem('tnt-skipping.dev', (id = `dev-${rand()}`))
        return id
      } catch {
        return `dev-${rand()}`
      }
    })()
  : ''

function identity() {
  if (DEV) return { userId: DEV, username: `Dev ${DEV.slice(4)}` }
  const u = authState.user
  const id = u && (u._id || u.id || u.userId || u.uid)
  if (!id) return { userId: GUEST, username: authState.guest?.displayName || authState.guest?.username || 'Guest' }
  return { userId: String(id), username: String(u.displayName || u.username || u.name || 'Player') }
}

// --- Saving ------------------------------------------------------------------
let lastSaved = ''
let savedAt = 0
let sentId = '' // identity the server currently attributes saves to
let loadedId = '' // identity whose saved progress this tab has already loaded
let store = null // initNet's: the progress object (snapshot() / hydrate(doc) / state)

// Session-only state stays out of the save (the Playtime Rewards clock restarts with the page).
const SESSION_ONLY = ['playStart', 'playClaimed']
function progressDoc() {
  const doc = store.snapshot()
  for (const k of SESSION_ONLY) delete doc[k]
  return doc
}
const isGuest = () => sentId.startsWith('guest-')

export function saveNow(force = false) {
  if (!store || !net.connected || !net.hydrated || isGuest()) return
  const doc = progressDoc()
  const { playtime, ...rest } = doc
  const key = JSON.stringify(rest)
  const now = performance.now()
  // Playtime ticks every second, so on its own it only goes out every NET.playtimeSaveEvery s.
  if (!force && key === lastSaved && now - savedAt < NET.playtimeSaveEvery * 1000) return
  if (key === lastSaved && playtime === lastPlaytime) return
  lastSaved = key
  lastPlaytime = playtime
  savedAt = now
  send('saveProgress', doc)
}
let lastPlaytime = -1

function send(type, payload) {
  try {
    net.room?.send(type, payload)
  } catch (err) {
    console.warn('[net] send failed', type, err)
  }
}

// Handlers registered here are attached to every room this tab joins (reconnects included).
const handlers = []
export function onNetMessage(type, fn) {
  handlers.push([type, fn])
  net.room?.onMessage(type, fn)
}
// Sends to the server if connected; false (nothing sent) otherwise.
export function sendNet(type, payload) {
  if (!net.connected) return false
  send(type, payload)
  return true
}

// --- Leaderboards ------------------------------------------------------------------
// { boards: { wins|playtime|bestDistance|skill: [{ name, value }] }, ranks } from the server; the lobby
// stand repaints from it. A late subscriber gets the latest at once.
let leaderboard = null
const boardListeners = new Set()
export function onLeaderboard(fn) {
  boardListeners.add(fn)
  if (leaderboard) fn(leaderboard)
}
handlers.push([
  'leaderboard',
  (m) => {
    leaderboard = m
    boardListeners.forEach((fn) => fn(m))
  },
])

// --- Presence (remotePlayers.js) --------------------------------------------------
// What the others need to draw this player: the pose, the equipped gear and the Bloxity look. The
// latest of each also rides on the join options, so a (re)join shows up right away. The roster
// (`net.room.state.players`) carries everyone's.
const AVATAR_MAX = 3000 // backend AVATAR_MAX_LEN
// The signed-in player's look as JSON { equipped, proportions, skin }; the skin URL is dropped
// first when it doesn't fit. "" = the default character.
function avatarJson() {
  if (!authState.user) return ''
  const equipped = getEquippedAvatar()
  if (!equipped) return ''
  for (const skin of [getSkinTextureUrl(), null]) {
    try {
      const json = JSON.stringify({ equipped, proportions: getProportions(), skin })
      if (json.length <= AVATAR_MAX) return json
    } catch {
      return ''
    }
  }
  return ''
}
const presence = { pose: null, loadout: null }
let poseKey = ''
let poseAt = 0
// { x, y, z, yaw, speed, air }: at most NET.poseHz a second, nothing while it stands still.
export function sendPose(pose) {
  presence.pose = pose
  if (!net.connected) return
  const now = performance.now()
  if (now - poseAt < 1000 / NET.poseHz) return
  const key = `${pose.x}|${pose.y}|${pose.z}|${pose.yaw}|${pose.speed}|${pose.air}`
  if (key === poseKey) return
  poseKey = key
  poseAt = now
  send('pose', pose)
}
let loadoutKey = ''
// { tnt, trail, pets: [{ kind, variant }] }: sent when it changes.
export function sendLoadout(loadout) {
  presence.loadout = loadout
  const key = JSON.stringify(loadout)
  if (!net.connected || key === loadoutKey) return
  loadoutKey = key
  send('loadout', loadout)
}
let sentAvatar = ''
// The Bloxity look changed (customizer, sign-in/out): send it if it differs.
export function syncAvatar() {
  if (!net.connected) return
  const avatar = avatarJson()
  if (avatar === sentAvatar) return
  sentAvatar = avatar
  send('setAvatar', { avatar })
}
// Throw effects for the others (backend `fx`): { type: throw | fly | skip | boom | end, ... }.
export const sendFx = (fx) => sendNet('fx', fx)
// Everyone in the room (sessionId -> roster entry), null when offline.
export const roster = () => (net.connected ? net.room?.state?.players ?? null : null)

// --- Connection --------------------------------------------------------------
let sentPfp = '' // the profile picture the server shows the others (roster `pfp`)
// Tells the Bloxity menu who else is in this room: the roster present at the first state sync is
// "already there" (playerInRoom), later arrivals "joined" (playerJoined).
function reportRoster(room) {
  try {
    let synced = false
    room.onStateChange.once(() => (synced = true))
    Callbacks.get(room).onAdd('players', (player, sessionId) => {
      if (sessionId !== room.sessionId) reportPlayer(player.username, !synced)
    })
  } catch (err) {
    console.warn('[net] could not watch the roster', err)
  }
}

function attach(room) {
  reportRoster(room)
  net.room = room
  net.connected = true
  for (const [type, fn] of handlers) room.onMessage(type, fn)
  // Messages this client does not use (the old spin / daily ones) must not warn.
  for (const type of ['spins', 'daily', 'dailyResult', 'spinResult']) room.onMessage(type, () => {})
  room.onMessage('progress', (doc) => {
    net.hydrated = true
    lastSaved = ''
    // A reconnect under the same identity: this tab is newer than the save (it may hold changes
    // not sent yet), so push it rather than load over it.
    if (loadedId === sentId || !doc) return saveNow(true)
    loadedId = sentId
    try {
      store.hydrate(doc)
    } catch (err) {
      console.warn('[net] hydrate failed', err)
    }
    saveNow(true) // fills in whatever an older save lacked
  })
  room.onMessage('noProgress', () => {
    // New account, guest or no database: keep the local progress and push it as the first save.
    net.hydrated = true
    loadedId = sentId
    lastSaved = ''
    saveNow(true)
  })
  room.onMessage('serverError', () => {
    // The save exists but could not be read: never overwrite it.
    net.hydrated = false
    console.warn('[net] server could not read the saved progress; saving is off for this session')
  })
  room.onLeave(() => {
    if (net.room !== room) return
    net.room = null
    net.connected = false
    net.hydrated = false
    shareId = ''
    updateRoom('')
    // Resolve again rather than rejoin the old endpoint: that is how players move off a pod being
    // replaced. Keep trying; play is unaffected meanwhile.
    setTimeout(connect, 1000)
  })
}

export const hasServer = () => !!(NET.serverUrl || canResolveServer())

// The id Bloxity was told about (updateRoom) for the room we are in, '' offline.
let shareId = ''
// A link that opens the game in this room, '' offline or outside Bloxity. updateRoom comes first, as
// the platform requires before any invite.
export function invite() {
  if (!shareId) return ''
  updateRoom(shareId)
  return inviteLink(shareId)
}

// The ?roomId= this page was opened with (Open Rooms Join / friend invite): tried on the first
// connect only, then normal matchmaking.
let launchRoom = launchRoomId()
async function joinLaunchRoom(options) {
  const id = launchRoom
  launchRoom = ''
  if (!id) return null
  try {
    if (NET.serverUrl) return { room: await new Client(NET.serverUrl).joinById(id.split('~').pop(), options), relay: '' }
    const at = await locateRoom(id)
    if (at) return { room: await new Client(at.endpoint).joinById(at.roomId, options), relay: at.relayRoomId }
  } catch (err) {
    console.info('[net] the invited room is gone or full; matchmaking instead', err?.message ?? err)
  }
  return null
}

// Deployed builds ask the matchmaker on every connect (a new Client per endpoint, each is pinned to
// one pod). userId lets it reuse this player's seat on retries; guest/dev ids are not Bloxity ids.
async function joinAnyRoom(options) {
  if (NET.serverUrl) return { room: await new Client(NET.serverUrl).joinOrCreate(NET.room, options), relay: '' }
  const { endpoint, relayRoomId } = await resolveServerEndpoint(/^(guest|dev)-/.test(options.userId) ? undefined : options.userId)
  return { room: await new Client(endpoint).joinOrCreate(NET.room, options), relay: relayRoomId }
}

let connecting = false
let attempt = 0
async function connect() {
  if (!hasServer() || connecting || net.connected) return
  connecting = true
  try {
    const id = identity()
    sentId = id.userId
    sentPfp = getPfp()
    sentAvatar = avatarJson()
    loadoutKey = JSON.stringify(presence.loadout)
    poseKey = ''
    const options = { ...id, pfp: sentPfp, avatar: sentAvatar, pose: presence.pose, loadout: presence.loadout }
    const { room, relay } = (await joinLaunchRoom(options)) ?? (await joinAnyRoom(options))
    attempt = 0
    attach(room)
    // relay~room lets an invited friend join this exact room through its pod's relay (bloxity.js locateRoom).
    shareId = relay ? `${relay}~${room.roomId}` : room.roomId
    updateRoom(shareId)
  } catch (err) {
    const wait = NET.retryMs[Math.min(attempt++, NET.retryMs.length - 1)]
    console.info(`[net] could not reach the server (retrying in ${wait / 1000}s); progress is not being saved`, err?.message ?? err)
    setTimeout(connect, wait)
  } finally {
    connecting = false
  }
}

// Playtime ticks once a second while the tab is visible; a changed snapshot is sent at most every
// NET.saveEvery s.
setInterval(() => {
  if (document.hidden || !store) return
  store.state.playtime = (store.state.playtime || 0) + 1
  if (performance.now() - savedAt >= NET.saveEvery * 1000) saveNow()
}, 1000)

// progress: createProgress()'s object (its snapshot() / hydrate(doc) are the whole save).
export function initNet(progress) {
  store = progress
  if (!hasServer()) return console.info('[net] no server configured; progress is not being saved')
  // The first ready call connects; later ones are sign-in / sign-out.
  subscribeAuth((s) => {
    if (!s.ready) return
    if (!net.connected) return void connect()
    const id = identity()
    sentPfp = getPfp()
    syncAvatar() // signed in / out: the others see the new look
    if (id.userId === sentId) return send('identify', { username: id.username, pfp: sentPfp })
    saveNow(true) // under the old id, before switching
    net.hydrated = false
    sentId = id.userId
    send('identify', { ...id, pfp: sentPfp })
  })
  window.addEventListener('pagehide', () => saveNow(true))
  document.addEventListener('visibilitychange', () => document.hidden && saveNow(true))
}
