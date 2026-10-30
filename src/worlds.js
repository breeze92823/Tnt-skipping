import { WORLD_FADE, WORLDS } from './config.js'
import { sfx } from './audio.js'

// Worlds: the same lobby, lanes, eggs, shop and throw under another look (WORLDS). The world is
// swapped in place, never by a reload, because a guest's progress lasts the page. progress.js
// holds the rules and the save (`state.world`, `state.worlds`); whenever `state.world` differs from
// what is on screen (the portal, or a save that loaded) update() closes the screen, swaps the look
// once no throw is running, and opens it again. The first visit builds that world's scenery.

const byId = (id) => WORLDS.find((w) => w.id === id) ?? WORLDS[0]

export function createWorlds({ progress, hud, lobby, run, lighting, world }) {
  const S = progress.state
  const screen = document.createElement('div')
  screen.className = 'world-travel'
  screen.innerHTML = '<div class="world-travel-text"></div>'
  document.body.appendChild(screen)

  let here = WORLDS[0]
  let moving = false

  function swap(w) {
    here = w
    lobby.setWorld(w)
    run.setWorld(w)
    lighting.setMoods(w.sky)
    world.setSea(w.sea ?? null)
    moving = false
    requestAnimationFrame(() => requestAnimationFrame(() => screen.classList.remove('show')))
  }

  function travel(w) {
    moving = true
    screen.firstChild.textContent = `Sailing to ${w.name}...`
    screen.classList.add('show')
    sfx.zone()
    setTimeout(() => swap(w), WORLD_FADE) // the screen is closed before the first visit's build hitch
  }

  const next = () => byId(here.portal.to)

  // The portal's sign follows the unlock.
  const syncPortal = () => lobby.setPortalOpen(progress.worldOpen(next()))
  progress.onChange(syncPortal)
  syncPortal()
  progress.onWorldUnlock((w) => {
    hud.toast(`${w.name} unlocked! Press E at the portal to go!`)
    sfx.levelUp()
  })

  return {
    get busy() {
      return moving
    },
    get here() {
      return here
    },
    // The prompt at the portal: "Press E to <label>".
    portalLabel() {
      const w = next()
      return progress.worldOpen(w) ? `enter ${w.name}` : `enter ${w.name} (${here.portal.sub.replace('NEEDS ', '').replace('SKILL', 'Skill')})`
    },
    usePortal() {
      const err = progress.goToWorld(next())
      if (err) {
        sfx.deny()
        hud.toast(err)
      }
    },
    update() {
      if (moving || run.busy || S.world === here.id) return
      const w = byId(S.world)
      if (progress.worldOpen(w)) travel(w)
      else S.world = here.id // a save that no longer reaches its world stays where it is
    },
  }
}
