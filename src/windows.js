import './windows.css'
import { BOOSTS, DAILY, EGGS, PET_KINDS, PET_VARIANTS, PETS, PLAYTIME, REBIRTH, TRAILS } from './config.js'
import { fmt } from './hud.js'
import { sfx } from './audio.js'
import { coinIcon, eggIcon, ICON, pawIcon, potionIcon, rebirthIcon, tntIcon, trailIcon } from './icons.js'
import { createHatchOverlay, petName, petSvg, RARITY_NAME } from './pets.js'
import { btn, closeTopWindow, createWindow, el, shake } from './ui.js'

// The popup windows, laid out like the owner's reference screenshots:
//  - Rebirth: Before / After x SKILL, "Resets your LEVEL and SKILL!", the level bar,
//    Rebirth | Skip Rebirth (premium price badge)
//  - Inventory: My TNT, My Pets, My Eggs, My Boosts (tabs down the left)
//  - Pet Index: Normal / Golden / Diamond / Exclusive, the luck milestone bar, MY PETS | CLAIM ALL
//  - Trails: coloured rows, x Wins Boost, bought with Wins
//  - Playtime Rewards: 4 x 3 tiles, Claim or the time left
//  - Daily Rewards: days 1-6 and the tall Limited! day 7, CLAIM YOUR REWARD under it
//  - Egg panel (hold E at a lobby egg): pet tiles with their odds, Hatch 1 | 3 | 8 under them
// The HUD buttons open them (hud.on); progress.js owns the state and the rules.

const pad2 = (n) => String(n).padStart(2, '0')
const hms = (s) => `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`
const ms = (s) => `${Math.floor(s / 60)}:${pad2(s % 60)}`
const s = (text) => `<span class="stroke">${text}</span>`
const mult = (m) => (m < 100 ? `${+m.toFixed(2)}` : fmt(m)) // pets have fractional mults (x2.5)
const INV_TABS = [
  { id: 'tnt', label: 'TNT', icon: ICON.tnt, title: 'My TNT' },
  { id: 'pets', label: 'Pets', icon: ICON.paw, title: 'My Pets' },
  { id: 'eggs', label: 'Eggs', icon: ICON.egg, title: 'My Eggs' },
  { id: 'boosts', label: 'Boosts', icon: ICON.potion, title: 'My Boosts' },
]
const INDEX_TABS = [
  { id: 'normal', icon: pawIcon('#3aa8ff') },
  { id: 'golden', icon: pawIcon('gold') },
  { id: 'diamond', icon: pawIcon('diamond') },
  { id: 'exclusive', icon: pawIcon('rainbow') },
]

// A reward's caption and icon (Playtime tiles, Daily cards).
function rewardText(r) {
  if (r.kind === 'skill') return `+${fmt(r.n)} SKILL`
  if (r.kind === 'wins') return `+${fmt(r.n)} WINS`
  if (r.kind === 'egg') return EGGS[r.egg].name.toUpperCase()
  if (r.kind === 'boost') return `+${r.n} ${BOOSTS[r.boost].label.toUpperCase()} POTION${r.n > 1 ? 'S' : ''}`
  return r.label ?? ''
}
function rewardIcon(game, r) {
  if (r.kind === 'skill') return ICON.bolt
  if (r.kind === 'wins') return ICON.trophy
  if (r.kind === 'egg') return eggIcon(EGGS[r.egg])
  if (r.kind === 'boost') return potionIcon(BOOSTS[r.boost])
  if (r.kind === 'pet') return petSvg(r.pet)
  if (r.kind === 'tnt') return tntIcon(game.tntOf(r.tnt))
  return ''
}

export function createWindows(game, hud) {
  const S = game.state
  const W = {
    rebirth: createWindow({ title: 'Rebirth', icon: rebirthIcon(), className: 'rebirth-win', onOpen: () => render() }),
    inv: createWindow({ title: 'My TNT', icon: ICON.tnt, className: 'inv-win', onOpen: () => render() }),
    index: createWindow({ title: 'Pet Index', icon: ICON.pawBlue, className: 'inv-win index-win', onOpen: () => render() }),
    trails: createWindow({ title: 'Trails', icon: ICON.cloud, className: 'trails-win', onOpen: () => render() }),
    playtime: createWindow({ title: 'Playtime Rewards', icon: ICON.gift, className: 'playtime-win', onOpen: () => render() }),
    daily: createWindow({ title: 'Daily Rewards', icon: ICON.calendar, className: 'daily-win', onOpen: () => render() }),
    egg: createWindow({ title: 'Egg', className: 'egg-win', onOpen: () => render() }),
  }
  const hatch = createHatchOverlay(EGGS)
  game.onHatch((egg, results) => {
    closeTopWindow()
    hatch(egg, results)
  })
  let tab = 'tnt' // Inventory tab
  let indexTab = 'normal'
  let selTnt = null // TNT card shown in the footer (null = the equipped one)
  let selPet = null // pet id in the detail card
  let selBoost = 'skill' // potion described in the footer
  let eggKey = 'common' // egg shown in the panel

  const current = () => Object.values(W).find((w) => w.isOpen())
  // A refused action: toast + buzz + shake.
  const deny = (msg, node) => {
    hud.toast(msg, 'warn')
    sfx.deny()
    if (node) shake(node)
  }
  const act = (fn, node, good) => () => {
    const msg = fn()
    if (msg) deny(msg, node)
    else {
      sfx.click()
      if (good) hud.toast(good, 'good')
    }
  }

  function open(id, t) {
    if (id === 'inv' && t) tab = t
    if (W[id].isOpen()) render()
    else W[id].open()
  }

  // --- Redraw the open window. Scroll positions survive; a redraw that lands while a
  // finger / mouse button is down waits for the release so the click still lands.
  let pressing = false
  let pending = false
  document.addEventListener('pointerdown', (e) => (pressing = !!e.target.closest?.('.uiw')), true)
  document.addEventListener(
    'pointerup',
    () => {
      pressing = false
      if (pending) setTimeout(render, 0)
    },
    true,
  )
  function render() {
    const w = current()
    if (!w) return
    if (pressing) {
      pending = true
      return
    }
    pending = false
    const scrolls = [...w.root.querySelectorAll('[data-scroll]')].map((n) => [n.dataset.scroll, n.scrollTop])
    w.body.replaceChildren()
    w.side.replaceChildren()
    w.foot.replaceChildren()
    if (w === W.rebirth) renderRebirth(w)
    else if (w === W.inv) renderInventory(w)
    else if (w === W.index) renderIndex(w)
    else if (w === W.trails) renderTrails(w)
    else if (w === W.playtime) renderPlaytime(w)
    else if (w === W.egg) renderEgg(w)
    else renderDaily(w)
    for (const [key, top] of scrolls) {
      const n = w.root.querySelector(`[data-scroll="${key}"]`)
      if (n) n.scrollTop = top
    }
  }

  // --- Rebirth ------------------------------------------------------------------------
  function renderRebirth(w) {
    const n = 1 + S.rebirths
    const card = (head, v) => `<div class="rb-col"><div class="rb-head stroke">${head}</div><div class="rb-card studs"><span class="rb-bolt">${ICON.bolt}</span><span class="rb-val stroke"><b>x${fmt(v)}</b>SKILL</span></div></div>`
    const t = game.rebirthT()
    const wins = S.rebirths >= REBIRTH.winsFrom ? `x${REBIRTH.winsScale} WINS` : '' // the end-game bonus of this rebirth
    w.body.append(
      el('div', 'rb-cols', `${card('Before', n)}<span class="rb-arrow">${ICON.arrow}</span>${card('After', n + 1)}`),
      el('div', 'rb-warn stroke', wins ? `Resets LEVEL and SKILL! <span class="rb-wins">${wins}</span>` : 'Resets your LEVEL and SKILL!'),
      el('div', 'rb-bar studs', `<div class="rb-fill" style="width:${(t * 100).toFixed(1)}%"></div><span class="rb-label stroke">Level ${game.rebirthLevel()} / Level ${REBIRTH.level}</span>`),
    )
    const btns = el('div', 'rb-btns')
    btns.append(
      btn('rb-btn green studs', s('Rebirth'), act(game.doRebirth, w.body, `Rebirthed! +1x SKILL${wins ? `, ${wins}` : ''}`)),
      btn('rb-btn purple studs', `${s('Skip Rebirth')}<span class="rb-price stroke">${coinIcon}${REBIRTH.skipPrice}</span>`, act(game.skipRebirth, w.body)),
    )
    w.body.append(btns)
  }

  // --- Inventory: TNT, Pets, Eggs, Boosts ---------------------------------------------
  function sideTabs(w, tabs, active, pick) {
    for (const x of tabs) {
      w.side.append(btn(`uiw-tab${x.id === active ? ' active' : ''}`, `<span class="icon">${x.icon}</span><span class="label stroke">${x.label ?? PET_VARIANTS[x.id].label}</span>`, () => {
        sfx.click()
        pick(x.id)
        render()
      }))
    }
  }

  function renderInventory(w) {
    const info = INV_TABS.find((x) => x.id === tab)
    w.setTitle(info.title)
    w.setIcon(info.icon)
    sideTabs(w, INV_TABS, tab, (id) => (tab = id))
    w.root.dataset.tab = tab
    ;({ tnt: renderTnt, pets: renderPets, eggs: renderEggs, boosts: renderBoosts })[tab](w)
  }

  function renderTnt(w) {
    const all = game.allTnts()
    const owned = all.filter((t) => S.tnts.includes(t.id))
    w.body.append(el('div', 'inv-head stroke', `${owned.length} / ${all.length} TNT`))
    const well = el('div', 'inv-well item-grid')
    well.dataset.scroll = 'tnt'
    for (const t of all) {
      const on = S.tnt === t.id
      const card = btn(`item-card${on ? ' sel' : ''}${selTnt === t.id && !on ? ' pick' : ''}`, `<span class="item-img">${tntIcon(t)}</span><span class="item-mult stroke">${ICON.bolt}+${fmt(t.skill)}</span>${on ? `<span class="item-check">${ICON.check}</span>` : ''}`, () => {
        if (on) return
        // An unowned one: the first tap shows its price, the second buys it.
        if (!S.tnts.includes(t.id) && selTnt !== t.id) {
          selTnt = t.id
          sfx.click()
          return render()
        }
        selTnt = null
        act(() => game.equipTnt(t.id), card, `${t.name} equipped!`)()
      })
      card.title = t.name
      well.append(card)
    }
    w.body.append(well)
    const pick = selTnt && game.tntOf(selTnt)
    const eq = game.tntOf(S.tnt)
    w.foot.append(el('div', 'inv-foot-text stroke', pick ? `${pick.name}: +${fmt(pick.skill)} Skill for ${fmt(pick.cost)} Wins. Tap again to buy!` : `${eq.name} equipped: +${fmt(eq.skill)} Skill`))
  }

  const petCard = (kind, variant, badge = '') => `<span class="item-img">${petSvg(kind, variant)}</span><span class="item-mult stroke">${ICON.bolt}x${mult(PET_KINDS[kind].mult * PET_VARIANTS[variant].mult)}</span>${badge}`

  function renderPets(w) {
    const head = el('div', 'pets-head')
    const slotCost = game.petSlotCost()
    const plus = (fn, title) => {
      const b = btn('pets-plus', ICON.plus, fn)
      b.title = title
      return b
    }
    head.append(
      el('span', 'pets-bag', ICON.backpack),
      el('span', 'pets-count stroke', `${S.pets.length} / ${PETS.storage}`),
      plus(act(game.buyStorage, head), 'More storage'),
      el('span', 'pets-eq stroke', `Equipped: ${game.equippedPets().length} / ${S.petSlots}`),
      plus(act(game.buyPetSlot, head, 'Pet slot unlocked!'), slotCost === undefined ? 'All slots unlocked' : `+1 slot: ${fmt(slotCost)} Wins`),
    )
    w.body.append(head)

    const split = el('div', 'pets-split')
    const detail = el('div', 'pet-detail')
    const grid = el('div', 'inv-well item-grid pets-grid')
    grid.dataset.scroll = 'pets'
    const order = [...S.pets].sort((a, b) => b.equipped - a.equipped || game.petMult(b) - game.petMult(a))
    const sel = order.find((p) => p.id === selPet) ?? order[0]
    if (!order.length) {
      // Nothing hatched yet: you start with no pets.
      grid.append(el('div', 'inv-empty stroke', 'No pets yet. Hatch an egg!'))
    } else {
      for (const p of order) {
        const badge = p.equipped ? `<span class="item-check">${ICON.check}</span>` : p.locked ? `<span class="item-lock">${ICON.lock}</span>` : ''
        grid.append(btn(`item-card${p.id === sel?.id ? ' sel' : ''}`, petCard(p.kind, p.variant, badge), () => {
          selPet = p.id
          sfx.click()
          render()
        }))
      }
    }
    if (sel) {
      const k = PET_KINDS[sel.kind]
      detail.innerHTML = `<span class="pd-name stroke">${petName(sel.kind, sel.variant)}</span><span class="pd-img"><span class="pd-rays"></span>${petSvg(sel.kind, sel.variant)}</span><span class="pd-rarity stroke r-${k.rarity}">${RARITY_NAME[k.rarity]}</span><span class="pd-mult stroke">${ICON.bolt}x${mult(game.petMult(sel))}</span>`
      const lock = btn(`pd-lock${sel.locked ? ' on' : ''}`, ICON.lock, act(() => game.togglePetLock(sel.id), detail, sel.locked ? 'Pet unlocked' : 'Pet locked'))
      lock.title = sel.locked ? 'Locked: can\'t be deleted' : 'Lock this pet'
      detail.querySelector('.pd-img').append(lock)
      const row = el('div', 'pd-row')
      row.append(
        btn(`pd-btn ${sel.equipped ? 'red' : 'green'}`, s(sel.equipped ? 'UNEQUIP' : 'EQUIP'), act(() => game.togglePet(sel.id), detail)),
        btn('pd-btn del red', s('DELETE'), act(() => game.deletePet(sel.id), detail)),
      )
      detail.append(row)
    } else {
      detail.classList.add('empty')
      detail.append(el('span', 'stroke', 'No pets yet'))
    }
    split.append(detail, grid)
    w.body.append(split)

    const foot = el('div', 'pets-foot')
    foot.append(btn('pa blue index studs', s('INDEX'), () => {
      sfx.click()
      W.index.open()
    }))
    if (order.length) foot.append(btn('pa green best studs', s('EQUIP BEST'), act(game.equipBestPets, null, 'Best pets equipped!')))
    else foot.append(el('span', 'inv-foot-text stroke', 'No pets yet. Hatch an egg!'))
    w.foot.append(foot)
  }

  function renderEggs(w) {
    const mine = Object.entries(S.eggs).filter(([, n]) => n > 0)
    const total = mine.reduce((sum, [, n]) => sum + n, 0)
    w.body.append(el('div', 'inv-head stroke', `${total} Eggs`))
    const well = el('div', `inv-well${mine.length ? ' item-grid eggs' : ' empty'}`)
    well.dataset.scroll = 'eggs'
    if (!mine.length) well.append(el('div', 'inv-empty stroke', 'No eggs yet. Get eggs from Gifts!'))
    for (const [key, n] of mine) {
      const e = EGGS[key]
      const card = el('div', 'egg-card', `<span class="egg-count stroke">x${n}</span><span class="egg-img">${eggIcon(e)}</span><span class="egg-name stroke">${e.name}</span>`)
      card.append(btn('egg-open', s('Open'), act(() => game.hatchEgg(key), card)))
      well.append(card)
    }
    w.body.append(well)
  }

  function renderBoosts(w) {
    const types = Object.keys(BOOSTS)
    const total = types.reduce((sum, t) => sum + S.potions[t], 0)
    w.body.append(el('div', 'inv-head stroke', `${total} potion${total === 1 ? '' : 's'}. Click one to drink it`))
    const well = el('div', 'inv-well item-grid')
    for (const type of types) {
      const b = BOOSTS[type]
      const left = game.boostLeft(type)
      const card = btn(`item-card boost-card${left ? ' on' : ''}`, `<span class="item-img">${potionIcon(b)}</span><span class="item-mult stroke">x${S.potions[type]}</span>${left ? `<span class="boost-time stroke">${ms(left)}</span>` : ''}`, () => {
        selBoost = type
        act(() => game.useBoost(type), card, `${b.label} Potion: x${b.mult} ${b.label} for ${b.minutes} min!`)()
        render()
      })
      card.style.setProperty('--card', b.card)
      // Mouse hover describes it too (touch: the tap does).
      card.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || selBoost === type) return
        selBoost = type
        render()
      })
      well.append(card)
    }
    w.body.append(well)
    const b = BOOSTS[selBoost]
    const left = game.boostLeft(selBoost)
    w.foot.append(el('div', 'inv-foot-text stroke', `${b.label} Potion: x${b.mult} ${b.label} for ${b.minutes} minutes${left ? ` (${ms(left)} left)` : ''}`))
  }

  // --- Egg panel ------------------------------------------------------------------------
  function renderEgg(w) {
    const e = EGGS[eggKey]
    w.setTitle(e.name)
    const grid = el('div', 'egg-odds')
    for (const { kind, pct } of game.eggOdds(eggKey)) {
      const tile = el('div', `egg-pet r-${PET_KINDS[kind].rarity}`, `<span class="egg-pet-img">${petSvg(kind)}</span><span class="egg-pct stroke">${+pct.toFixed(1)}%</span>`)
      tile.title = PET_KINDS[kind].name
      grid.append(tile)
    }
    w.body.append(grid)
    const coin = e.robux ? coinIcon : ICON.trophy
    const row = el('div', 'egg-buys')
    PETS.hatchCounts.forEach((n, i) => {
      row.append(btn(`egg-buy b${i} studs`, `<span class="egg-cost stroke">${coin}${fmt(game.hatchPrice(eggKey, n))}</span><span class="egg-n stroke">Hatch ${n}</span>`, act(() => game.hatchNow(eggKey, n), row)))
    })
    w.foot.append(row, el('div', 'egg-price stroke', `${coin}${fmt(game.hatchPrice(eggKey, 1))}`))
  }

  // --- Pet Index ------------------------------------------------------------------------
  function renderIndex(w) {
    sideTabs(w, INDEX_TABS, indexTab, (id) => (indexTab = id))
    const prog = game.indexProgress()
    const head = el('div', 'idx-head')
    head.append(
      el('span', 'idx-count stroke', `${S.petsSeen.length} / ${game.indexTotal}`),
      el('span', 'idx-luck stroke', `Luck +${game.luckPct()}%`),
      el('span', 'idx-bar', `<span class="idx-fill" style="width:${(prog.have / prog.need) * 100}%"></span><span class="stroke">${prog.have} / ${prog.need}</span><span class="idx-clover">${ICON.clover}<b class="stroke">+${PETS.indexLuck}%</b></span>`),
      btn(`idx-claim ${prog.ready ? 'green' : 'grey'}`, s(prog.ready ? 'CLAIM' : 'LOCKED'), act(game.claimIndex, head, `+${PETS.indexLuck}% Luck!`)),
    )
    w.body.append(head)
    const grid = el('div', 'inv-well item-grid idx-grid')
    grid.dataset.scroll = `index-${indexTab}`
    for (const kind of Object.keys(PET_KINDS)) {
      const seen = S.petsSeen.includes(`${kind}:${indexTab}`)
      const card = el('div', `item-card${seen ? '' : ' unseen'}`, seen ? petCard(kind, indexTab) : `<span class="item-img">${petSvg(kind, indexTab)}</span>`)
      card.title = seen ? petName(kind, indexTab) : '???'
      grid.append(card)
    }
    w.body.append(grid)
    const foot = el('div', 'pets-foot')
    foot.append(
      btn('pa gold mypets studs', s('MY PETS'), () => {
        sfx.click()
        open('inv', 'pets')
      }),
      btn(`pa ${prog.ready ? 'green' : 'grey'} claimall studs`, s('CLAIM ALL'), act(game.claimIndex, foot, 'Luck milestones claimed!')),
    )
    w.foot.append(foot)
  }

  // --- Trails -------------------------------------------------------------------------
  function renderTrails(w) {
    const list = el('div', 'trails-list')
    list.dataset.scroll = 'trails'
    for (const t of TRAILS) {
      const owned = S.trails.includes(t.id)
      const on = S.trail === t.id
      const row = el('div', `trail-row studs${on ? ' on' : ''}`, `<span class="trail-icon">${trailIcon(t.colors)}</span><span class="trail-name stroke">${t.name}</span><span class="trail-boost stroke">${ICON.trophy}x${t.boost} Wins Boost</span>`)
      row.style.setProperty('--row', t.row)
      const label = on ? 'Equipped' : owned ? 'Equip' : `${fmt(t.cost)} Wins`
      row.append(btn(`trail-btn studs ${on ? 'blue' : 'green'}`, s(label), () => {
        if (!on) act(() => game.chooseTrail(t.id), row, `${t.name} equipped!`)()
      }))
      list.append(row)
    }
    w.body.append(list)
  }

  // --- Playtime Rewards ----------------------------------------------------------------
  function renderPlaytime(w) {
    const grid = el('div', 'play-grid')
    PLAYTIME.forEach((r, i) => {
      const left = game.playtimeLeft(i)
      const look = i === PLAYTIME.length - 1 ? 'rainbow' : ['blue', 'purple', 'gold'][Math.floor(i / 4)]
      const text = rewardText(r)
      // Long captions shrink to fit the tile, like the reference's.
      const tile = el('div', `play-tile studs ${look}${left < 0 ? ' claimed' : ''}`, `<span class="play-lbl stroke" style="--fs:${Math.min(31, 370 / text.length).toFixed(1)}">${text}</span><span class="play-icon">${rewardIcon(game, r)}</span>`)
      tile.append(left === 0
        ? btn('play-btn claim studs', s('Claim'), () => {
          const msg = game.claimPlaytime(i)
          if (msg) deny(msg, tile)
          else {
            sfx.claim()
            hud.toast(`${rewardText(r)}!`, 'good')
          }
        })
        : el('span', `play-btn ${left < 0 ? 'done' : 'wait'}`, s(left < 0 ? 'Claimed' : hms(left))))
      grid.append(tile)
    })
    w.body.append(grid)
  }

  // --- Daily Rewards -------------------------------------------------------------------
  function renderDaily(w) {
    const days = DAILY.days
    const at = game.dailyIndex() // the next day to claim
    const grid = el('div', 'daily-grid')
    days.forEach((r, i) => {
      const last = i === days.length - 1
      const claimed = game.dailyClaimed(i)
      const ready = game.dailyReady() && i === at
      const lbl = r.label.replace(/ (?=\S+$)/, '<br>')
      const html = last
        ? `<span class="day-tab special stroke">DAY ${i + 1}</span><span class="day-limited">Limited!</span><span class="day-icon">${rewardIcon(game, r)}</span><span class="day-lbl stroke">${r.label}</span>`
        : `<span class="day-tab studs stroke">DAY ${i + 1}</span><span class="day-lbl stroke${r.kind === 'pet' ? ' one' : ''}">${r.kind === 'pet' ? r.label : lbl}</span><span class="day-icon">${rewardIcon(game, r)}</span>`
      const cls = `day-card studs${last ? ' special' : ''}${claimed ? ' claimed' : ''}${ready ? ' ready' : ''}`
      const card = ready
        ? btn(cls, html, () => {
          const msg = game.claimDaily(i)
          if (msg) deny(msg, card)
          else {
            sfx.claim()
            hud.toast(`Day ${i + 1}: ${r.label}!`, 'good')
          }
        })
        : el('div', cls, html)
      if (claimed) card.append(el('span', 'day-tick', ICON.check))
      grid.append(card)
    })
    w.body.append(grid)
    const left = game.dailyLeft()
    w.foot.append(el('div', `daily-next${left ? ' wait' : ''}`, left ? `Next reward in ${hms(left)}` : 'CLAIM YOUR REWARD'))
  }

  // --- Wiring ---------------------------------------------------------------------------
  hud.on('rebirth', () => open('rebirth'))
  hud.on('tnt', () => open('inv', 'tnt'))
  hud.on('pets', () => open('inv', 'pets'))
  hud.on('trails', () => open('trails'))
  hud.on('gifts', () => open('playtime'))
  hud.on('calendar', () => open('daily'))
  game.onChange(() => current() && render())
  // Timers (Playtime, Daily, potions) tick once a second.
  setInterval(() => {
    const w = current()
    if (w === W.playtime || w === W.daily || (w === W.inv && tab === 'boosts')) render()
  }, 1000)

  return {
    open,
    closeTop: closeTopWindow,
    openEgg(key) {
      eggKey = key
      open('egg')
    },
    openEggKey: () => (W.egg.isOpen() ? eggKey : null),
  }
}
