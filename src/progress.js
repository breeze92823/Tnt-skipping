import { BOOSTS, DAILY, EGGS, PET_KINDS, PET_VARIANTS, PETS, PLAYTIME, REBIRTH, RUN, TNTS, TRAILS, WORLDS } from './config.js'

// The player's progress and the rules the windows act on (windows.js): SKILL, Wins,
// rebirths, TNT, pets, eggs, potions, trails, Playtime and Daily Rewards. Actions return
// a message when they are refused (the window toasts it and shakes) and nothing when
// they went through. `snapshot()` / `hydrate()` are the whole save: net.js sends the snapshot
// to the server and hydrates from what it answers (a guest's progress lasts the page).

const MS = 1000 // ms per s
const now = () => Date.now()
const rank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythical: 5 }

function fresh() {
  return {
    skill: 0,
    wins: 0,
    rebirths: 0,
    throws: 0, // finished throws
    bestDistance: 0,
    playtime: 0, // s with the game visible, all sessions (net.js counts it; the leaderboard's Time Played)
    spent: 0, // Robux spent (no checkout yet)
    tnts: ['stick'],
    tnt: 'stick',
    pets: [], // { id, kind, variant, equipped, locked }
    nextPet: 1,
    petSlots: PETS.slots,
    petsSeen: [], // 'kind:variant'
    indexClaimed: 0, // Pet Index luck milestones claimed
    eggs: Object.fromEntries(Object.keys(EGGS).map((k) => [k, 0])),
    potions: Object.fromEntries(Object.keys(BOOSTS).map((k) => [k, 0])),
    boostUntil: Object.fromEntries(Object.keys(BOOSTS).map((k) => [k, 0])), // ms timestamps
    trails: [],
    trail: null,
    playStart: now(),
    playClaimed: [],
    daily: { streak: 0, last: 0 }, // days claimed in this streak, ms of the last claim
    worlds: [], // worlds unlocked for good (ids): rebirths reset SKILL, not these
    world: '', // the world the player is in (WORLDS id)
  }
}

export function createProgress() {
  const S = fresh()
  const listeners = new Set()
  const hatchListeners = new Set()
  const unlockListeners = new Set()
  const changed = () => listeners.forEach((fn) => fn())

  const tntOf = (id) => TNTS.find((t) => t.id === id)
  // Reaching a world's SKILL opens it for good. Returns the worlds that just opened.
  function unlockWorlds() {
    const opened = WORLDS.filter((w) => w.skill && S.skill >= w.skill && !S.worlds.includes(w.id))
    for (const w of opened) S.worlds.push(w.id)
    return opened
  }
  const boostLeft = (type) => Math.max(0, Math.ceil((S.boostUntil[type] - now()) / 1000))
  const boostMult = (type) => (boostLeft(type) ? BOOSTS[type].mult : 1)
  const petMult = (p) => PET_KINDS[p.kind].mult * PET_VARIANTS[p.variant].mult
  const equippedPets = () => S.pets.filter((p) => p.equipped)

  // SKILL one level takes in the current rebirth, and where the level caps.
  const levelSize = () => REBIRTH.perLevel * REBIRTH.scale ** S.rebirths
  const maxSkill = () => levelSize() * (REBIRTH.level - 1)
  const rebirthLevel = () => Math.min(REBIRTH.level, Math.floor(S.skill / levelSize()) + 1)
  // 0..1 toward the rebirth level (Rebirth tile and window).
  const rebirthT = () => rebirthLevel() / REBIRTH.level
  // The bottom bar: SKILL into the current level.
  function levelBar() {
    const level = rebirthLevel()
    const need = levelSize()
    const max = level >= REBIRTH.level
    return { level, need, max, have: max ? need : Math.floor(S.skill - (level - 1) * need) }
  }

  const indexTotal = Object.keys(PET_KINDS).length * Object.keys(PET_VARIANTS).length
  const indexReached = () => Math.floor(S.petsSeen.length / PETS.indexStep)
  const luckPct = () => S.indexClaimed * PETS.indexLuck

  function addPet(kind, variant = 'normal') {
    if (S.pets.length >= PETS.storage) return null
    const p = { id: S.nextPet++, kind, variant, equipped: false, locked: false }
    S.pets.push(p)
    const key = `${kind}:${variant}`
    const isNew = !S.petsSeen.includes(key)
    if (isNew) S.petsSeen.push(key)
    if (equippedPets().length < S.petSlots) p.equipped = true
    return { pet: p, isNew }
  }

  const luckMult = () => (1 + luckPct() / 100) * boostMult('luck')
  const hatchWeights = (egg) => Object.entries(EGGS[egg].hatches).map(([kind, w], i) => [kind, i ? w * luckMult() : w])

  function roll(egg) {
    const luck = luckMult()
    const entries = hatchWeights(egg)
    let r = Math.random() * entries.reduce((s, [, w]) => s + w, 0)
    let kind = entries[0][0]
    for (const [k, w] of entries) if ((r -= w) <= 0) {
      kind = k
      break
    }
    let variant = 'normal'
    if (Math.random() < PET_VARIANTS.diamond.chance * luck) variant = 'diamond'
    else if (Math.random() < PET_VARIANTS.golden.chance * luck) variant = 'golden'
    return { kind, variant }
  }

  // Rolls n pets of one egg and hands them to the hatch overlay.
  function hatch(key, n) {
    const results = []
    for (let i = 0; i < n; i++) {
      const { kind, variant } = roll(key)
      results.push({ kind, variant, isNew: addPet(kind, variant).isNew })
    }
    hatchListeners.forEach((fn) => fn(key, results))
    changed()
  }

  // Grants a reward ({ kind, n, egg, boost, pet, tnt } from PLAYTIME / DAILY).
  function grant(r) {
    if (r.kind === 'skill') api.addSkill(r.n, false)
    else if (r.kind === 'wins') api.addWins(r.n, false)
    else if (r.kind === 'egg') S.eggs[r.egg] += r.n ?? 1
    else if (r.kind === 'boost') S.potions[r.boost] += r.n
    else if (r.kind === 'pet') {
      const got = addPet(r.pet)
      if (got) hatchListeners.forEach((fn) => fn(null, [{ kind: r.pet, variant: 'normal', isNew: got.isNew }]))
    } else if (r.kind === 'tnt' && !S.tnts.includes(r.tnt)) S.tnts.push(r.tnt)
  }

  // Daily: the streak restarts when the last claim is older than the grace period.
  function dailyStreak() {
    if (S.daily.last && now() - S.daily.last > DAILY.grace * MS) return 0
    return S.daily.streak % DAILY.days.length
  }
  const dailyLeft = () => (S.daily.last ? Math.max(0, Math.ceil(DAILY.every - (now() - S.daily.last) / 1000)) : 0)

  const api = {
    state: S,
    onChange(fn) {
      listeners.add(fn)
    },
    // fn(eggKey | null, [{ kind, variant, isNew }]) when pets arrive (hatch overlay).
    onHatch(fn) {
      hatchListeners.add(fn)
    },
    // fn(world) when SKILL reaches a world in play (never for one a save already had).
    onWorldUnlock(fn) {
      unlockListeners.add(fn)
    },
    snapshot: () => JSON.parse(JSON.stringify(S)),
    // The saved doc from the server (net.js). The session clocks (Playtime Rewards) restart.
    hydrate(doc) {
      const base = fresh()
      Object.assign(S, base, doc)
      delete S.serverTime
      S.trail = doc.trail || null // the server stores "no trail" as ''
      for (const k of ['eggs', 'potions', 'boostUntil']) S[k] = { ...base[k], ...doc[k] }
      if (!S.tnts.includes('stick')) S.tnts.unshift('stick')
      if (!S.tnts.includes(S.tnt)) S.tnt = 'stick'
      S.world = doc.world || ''
      unlockWorlds()
      S.playStart = now()
      S.playClaimed = []
      changed()
    },

    // --- Numbers ---
    // The x SKILL multiplier: (1 + rebirths) x equipped pets (summed) x the Skill potion.
    skillMult: () => (1 + S.rebirths) * Math.max(1, equippedPets().reduce((s, p) => s + petMult(p), 0)) * boostMult('skill'),
    // The x Wins multiplier: the trail x the Wins potion x REBIRTH.winsScale per rebirth past winsFrom.
    winsMult: () => (TRAILS.find((t) => t.id === S.trail)?.boost ?? 1) * boostMult('wins') * REBIRTH.winsScale ** Math.max(0, S.rebirths - REBIRTH.winsFrom),
    // SKILL one throw of the equipped TNT gives.
    throwSkill: () => (tntOf(S.tnt)?.skill ?? 1) * api.skillMult(),
    // Both return what was really added (SKILL stops at the rebirth level).
    addSkill(n, mult = true) {
      const before = S.skill
      S.skill = Math.min(maxSkill(), S.skill + (mult ? n * api.skillMult() : n))
      const opened = unlockWorlds()
      changed()
      for (const w of opened) unlockListeners.forEach((fn) => fn(w))
      return S.skill - before
    },
    addWins(n, mult = true) {
      const gained = mult ? n * api.winsMult() : n
      S.wins += gained
      changed()
      return gained
    },
    // How far a throw goes at the current SKILL, and the end of a throw.
    throwRange: () => Math.min(RUN.length - 30, RUN.reachBase + RUN.reachScale * S.skill ** RUN.reachPower),
    finishThrow(distance) {
      S.throws++
      S.bestDistance = Math.max(S.bestDistance, distance)
      changed()
    },

    // --- Rebirth ---
    rebirthLevel,
    rebirthT,
    levelBar,
    canRebirth: () => rebirthLevel() >= REBIRTH.level,
    doRebirth() {
      if (!api.canRebirth()) return `Reach Level ${REBIRTH.level} to rebirth!`
      S.rebirths++
      S.skill = 0
      changed()
    },
    skipRebirth: () => 'Purchases are coming soon!',

    // --- Worlds ---
    worldOpen: (w) => !w.skill || S.worlds.includes(w.id),
    goToWorld(w) {
      if (!api.worldOpen(w)) return `Reach ${w.skill / 1e6}M Skill to enter ${w.name}!`
      S.world = w.id
      changed()
    },

    // --- TNT ---
    tntOf,
    // Every TNT the TNT tab lists: the shop ones plus reward ones once owned.
    allTnts: () => TNTS.filter((t) => !t.reward || S.tnts.includes(t.id)),
    equipTnt(id) {
      const t = tntOf(id)
      if (!S.tnts.includes(id)) {
        if (S.wins < t.cost) return 'Not enough Wins!'
        S.wins -= t.cost
        S.tnts.push(id)
      }
      S.tnt = id
      changed()
    },

    // --- Pets ---
    petMult,
    equippedPets,
    petSlotCost: () => PETS.slotCosts[S.petSlots - PETS.slots],
    buyPetSlot() {
      const cost = api.petSlotCost()
      if (cost === undefined) return 'All pet slots unlocked!'
      if (S.wins < cost) return 'Not enough Wins!'
      S.wins -= cost
      S.petSlots++
      changed()
    },
    buyStorage: () => 'Purchases are coming soon!',
    togglePet(id) {
      const p = S.pets.find((x) => x.id === id)
      if (!p) return
      if (!p.equipped && equippedPets().length >= S.petSlots) return 'All pet slots are full!'
      p.equipped = !p.equipped
      changed()
    },
    togglePetLock(id) {
      const p = S.pets.find((x) => x.id === id)
      if (p) p.locked = !p.locked
      changed()
    },
    deletePet(id) {
      const p = S.pets.find((x) => x.id === id)
      if (!p) return
      if (p.locked) return 'Unlock this pet to delete it'
      S.pets.splice(S.pets.indexOf(p), 1)
      changed()
    },
    equipBestPets() {
      const best = [...S.pets].sort((a, b) => petMult(b) - petMult(a)).slice(0, S.petSlots)
      for (const p of S.pets) p.equipped = best.includes(p)
      changed()
    },
    rarityRank: (kind) => rank[PET_KINDS[kind].rarity],

    // --- Pet Index ---
    indexTotal,
    indexReached,
    luckPct,
    // Discovered pets toward the next milestone, and whether one is waiting to be claimed.
    indexProgress: () => ({ have: Math.min(PETS.indexStep, S.petsSeen.length - S.indexClaimed * PETS.indexStep), need: PETS.indexStep, ready: indexReached() > S.indexClaimed }),
    claimIndex() {
      const n = indexReached() - S.indexClaimed
      if (n <= 0) return `Discover ${PETS.indexStep} pets to claim +${PETS.indexLuck}% Luck!`
      S.indexClaimed += n
      changed()
      return null
    },

    // --- Eggs ---
    // The egg panel: each pet's chance in % at the current luck, and the price of n eggs.
    eggOdds(key) {
      const entries = hatchWeights(key)
      const total = entries.reduce((s, [, w]) => s + w, 0)
      return entries.map(([kind, w]) => ({ kind, pct: (w / total) * 100 }))
    },
    hatchPrice: (key, n) => EGGS[key].robux?.[n] ?? EGGS[key].price * n,
    // Pays for n eggs and hatches them on the spot (Robux eggs have no checkout yet).
    hatchNow(key, n) {
      if (EGGS[key].robux) return 'Purchases are coming soon!'
      if (S.wins < api.hatchPrice(key, n)) return 'Not enough Wins!'
      if (S.pets.length + n > PETS.storage) return 'Your pet storage is full!'
      S.wins -= api.hatchPrice(key, n)
      hatch(key, n)
    },
    // Buys a pet outright for Wins (the lobby showcase) and shows the reveal card.
    buyPet(kind, price) {
      if (S.wins < price) return 'Not enough Wins!'
      if (S.pets.length >= PETS.storage) return 'Your pet storage is full!'
      S.wins -= price
      const { isNew } = addPet(kind)
      hatchListeners.forEach((fn) => fn(null, [{ kind, variant: 'normal', isNew }]))
      changed()
    },
    // Opens a reward egg from Inventory > Eggs.
    hatchEgg(key) {
      if (!S.eggs[key]) return 'No eggs of this kind!'
      if (S.pets.length >= PETS.storage) return 'Your pet storage is full!'
      S.eggs[key]--
      hatch(key, 1)
    },

    // --- Potions ---
    boostLeft,
    useBoost(type) {
      if (!S.potions[type]) return `No ${BOOSTS[type].label} Potions! Get them from Gifts`
      S.potions[type]--
      S.boostUntil[type] = Math.max(now(), S.boostUntil[type]) + BOOSTS[type].minutes * 60e3
      changed()
    },

    // --- Trails ---
    chooseTrail(id) {
      const t = TRAILS.find((x) => x.id === id)
      if (!S.trails.includes(id)) {
        if (S.wins < t.cost) return 'Not enough Wins!'
        S.wins -= t.cost
        S.trails.push(id)
      }
      S.trail = id
      changed()
    },

    // --- Playtime Rewards: seconds left, 0 = ready, -1 = claimed ---
    playtimeLeft(i) {
      if (S.playClaimed.includes(i)) return -1
      return Math.max(0, Math.ceil(PLAYTIME[i].at * 60 - (now() - S.playStart) / 1000))
    },
    // The soonest unclaimed reward's seconds left (-1 = all claimed), for the HUD Gifts tile.
    nextPlaytime() {
      let best = -1
      PLAYTIME.forEach((_, i) => {
        const l = api.playtimeLeft(i)
        if (l >= 0 && (best < 0 || l < best)) best = l
      })
      return best
    },
    claimPlaytime(i) {
      const left = api.playtimeLeft(i)
      if (left < 0) return 'Already claimed!'
      if (left > 0) return 'Not ready yet!'
      S.playClaimed.push(i)
      grant(PLAYTIME[i])
      changed()
    },

    // --- Daily Rewards ---
    dailyIndex: dailyStreak,
    dailyLeft,
    dailyReady: () => dailyLeft() === 0,
    // A finished week shows all seven ticked until the next day opens.
    dailyClaimed: (i) => (S.daily.streak && !dailyStreak() && !api.dailyReady() ? true : i < dailyStreak()),
    claimDaily(i) {
      if (!api.dailyReady()) return 'Come back tomorrow!'
      if (i !== dailyStreak()) return `Claim Day ${dailyStreak() + 1} first!`
      S.daily = { streak: i + 1, last: now() }
      grant(DAILY.days[i])
      changed()
    },
  }
  return api
}
