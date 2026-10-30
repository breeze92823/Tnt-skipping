# Bloxity Integration & Responsive UI Requirements

> Reference doc. NOT loaded automatically (intentionally kept out of CLAUDE.md).
> Read it before touching `src/bloxity.js`, HUD/menu UI, `src/touch.*`, leaderboards, or hosting/deploy.
> Sources: https://docs.bloxity.io/#html5 and https://hosting.bloxity.io/docs (verified 2026-10-30).
> The SDK global is `window.Legion.SDK` (the platform is Bloxity/Boxity; the API namespace is `Legion`).

## 1. Hard rules (must hold whenever the game is implemented or changed)

1. **Bloxity integration must work correctly** in both embedded (iframe on bloxity.io) and standalone modes.
2. **Leaderboards must be integrated with Bloxity** (define, submit, open) for every competitive score.
3. **Mobile friendly + responsive UI/UX**: scalable, changeable UI elements; must work correctly in **both portrait and landscape**, including live rotation.
4. Do not build UI Bloxity already draws (menu, chat, emote picker, invites, leaderboard trophy, sign-in/logout).

## 2. SDK integration checklist

### Load & init
- Load by script tag, never bundle: `<script src="https://sdk.bloxity.io/v1/legion-sdk.min.js"></script>` (pinned `v1`; use the unminified build only for debugging).
- Call `Legion.SDK.init({ gameSlug: '<slug>' })` **once**; it is synchronous and the portal replies later. Always pass `gameSlug`.
- Immediately after `init()`, **before** `loadingEnd()`, register: `auth.onUserChanged`, `settings.listen(...)`, `ads.onBreakStart/onBreakEnd`.
- Never read `getUser()` right after `init()` and assume it is populated. `onUserChanged` is the single source of truth for user state.
- Don't hardcode hostnames or detect the environment yourself: use `Legion.SDK.environment()` -> `{ env, apiUrl, playUrl, portalUrl, staticUrl }` and `onEnvironmentChanged`.
- Call `game.loadingStep('text')` while loading, then `game.loadingEnd()` exactly once when ready (only if "LoadingEnd Support" is on for the game; otherwise the portal auto-dismisses after 1.5 s).
- Call `game.gameplayStart()` / `game.gameplayEnd()` around real play sessions (analytics).
- Call `registerFeature('emotes')` only after `init()` (earlier calls silently do nothing) if emotes are used.
- Call `updateRoom(roomId)` before inviting friends, or invites land on the front page.
- Must degrade gracefully when `window.Legion` is missing (local dev, offline): wrap every call, never throw, game remains playable.

### Auth
- Inside Bloxity do **not** call `showAuthPopup()` / `logout()` and do not draw sign-in buttons. A "Log in" button may exist only when running outside Bloxity.
- `auth.getToken()` gives the JWT for our backend; `auth.authenticateWithServer(url)` POSTs `{ token, user }`.

### Ads (required parts)
- `ads.onBreakStart` -> pause simulation + mute audio; `ads.onBreakEnd` -> resume + restore audio. Breaks can start at any time. **Required in every game.**
- Rewarded ads (only if rewards exist): show "Watch ad" only when `ads.isAvailable()`; `ads.showRewarded('placement-name')` (lowercase/digits/hyphens, never rejects); reward only when `status === 'completed'`. With a server, verify `rewardToken` via `POST {apiUrl}/v1/ads/reward/verify { gameSlug, rewardToken }` (one-time, 5 min).
- Screen ads (optional, recommended): `ads.screen('menu'|'lobby'|'results'|'panel'|'gameplay')`, `ads.hideScreen()`.
- Death screen (required where players can die): `deathScreen.show()`, `onCountdown`, respawn only when `respawn()` returns `true` (never on a timer), `deathScreen.hide()` if the round ends while dead.

### Settings / events
- `settings.listen(key, cb)` / `get` / `getAll` / `onChanged` / `triggerAll` / `refresh`; all values are strings. Parse `music_volume` defensively (can arrive very low). `enable_chat` is not delivered; drive chat visibility from `chat_message_sent`.
- Fullscreen via `portal.requestFullscreen()` only; do **not** add our own fullscreen button and do not bind **P** (opens Bloxity pause menu). Open pause menu with `portal.showMenu(true)`.
- Player events: `player.onEvent(...)` (`respawn_request`, `chat_message_sent`, `pointer_lock_changed`, `play_emote`).

## 3. Leaderboards (mandatory)

- Required for any game with a competitive score. Ask the owner which boards they want if unclear.
- **Declare once, right after `init()`** (always call `define()` - it also shows the trophy button):
  ```js
  Legion.SDK.leaderboard.define([
    { id: 'coins', label: 'Coins', order: 'desc', mode: 'best', format: 'compact', reset: 'weekly' },
    { id: 'fastest', label: 'Best time', order: 'asc', format: 'time' },
  ]);
  ```
  - `id`: `a-z 0-9 _ -`, max 32 chars, **permanent**. Max 10 boards. First declaration creates the board; later code changes are ignored (the dashboard owns it).
  - `order` `desc|asc`; `mode` `best|sum|latest`; `format` `number|compact|time`; `reset` `none|daily|weekly(Mon 00:00 UTC)|monthly`.
- **Submit only when a score is final** (end of run/round), never per frame:
  `const r = await Legion.SDK.leaderboard.submit('coins', Number(score));` -> `{ board, results:[{period,rank,score,improved}] } | null` (null = no Bloxity player). For `sum` mode send the gain; for `best`/`latest` send the score.
- **Read**: `getTop(id, { period: 'current'|'all', limit })` -> `{ rows, me, total }`; `getMine(id)`.
- **Open panel**: `leaderboard.open(id)`; returns `false` outside Bloxity -> hide/disable our trophy/leaderboard button in that case.
- **Server-authoritative games on Bloxity hosting** (our `Tnt-skipping-backend`): submit from the **server**, not the client:
  `POST {apiUrl}/v1/leaderboards/hosted/{BLOXITY_GAME_ID}/report`, header `Authorization: Bearer {BLOXITY_REPORT_TOKEN}`, body `{ boards?, scores:[{ board, userId:'legion_<id>', score }] }`, max 200 scores/call, batch every 10-30 s and at round end, use only server-owned state (never client-sent values). The client must still call `define()`.

## 4. Hosting / backend (hosting.bloxity.io)

- Frontend: zip the build and upload on My Games, or `POST https://api.bloxity.io/v1/hosting/games/<gameId>/frontend?channel=dev&version=<sha>` (`Content-Type: application/zip`, `version` required). Served at `https://<gameId>.play.bloxity.io` (prod) / `.dev.play.bloxity.io` (dev).
- Backend image: listen on `PORT` (2567), fast `GET /health` -> 200, run as non-root, trap SIGTERM and drain. HTTP + WebSocket share one port (Colyseus ok). Injected env: `PORT, NODE_ENV, CLIENT_ORIGIN, JWT_SECRET, MONGODB_URI, BLOXITY_GAME_ID, BLOXITY_CHANNEL, POD_NAME`.
- Deploy: GitHub Actions builds `./Server` image to ghcr.io, then `POST https://legion.bloxity.io/v1/apps/<gameId>/deploy` (`channel, image, version, seatCap`); secret `LEGION_DEPLOY_TOKEN` (+ `_STAGE` for stage). `seatCap` must match Colyseus `maxClients`. Make the GHCR package public after first push.
- **Never connect the socket directly to `<gameId>.host.bloxity.io`.** Use the matchmaker:
  ```js
  const { endpoint } = await Legion.SDK.net.resolveEndpoint('<gameId>');
  const client = new Client(endpoint); // NEW Client per resolve
  ```
  Retry with backoff (cold start up to ~45 s, give up ~60 s); if a room closes unexpectedly, resolve and rejoin. Custom-domain frontends hit prod unless `{ version: 'preview' }`.
- Pods: 1 vCPU / 512 MB; idle games scale to zero. Gems webhooks can hit any pod: store grants keyed by `transactionId`, return 200.

## 5. Responsive / mobile UI-UX requirements

Applies to HUD, menus, modals, leaderboard button, death/ad-screen UI, loading UI and touch controls.

**Layout**
- Mobile-first; must be usable from ~320 px wide up to desktop, **portrait and landscape**, and must adapt live on `resize` / `orientationchange` (no reload required, no state loss).
- Renderer/canvas: size from the container (`visualViewport` / `ResizeObserver`), update camera aspect + `setPixelRatio(min(devicePixelRatio, cap))`; adjust FOV or framing so the playable area stays visible in portrait.
- Use `100dvh/100dvw`, `env(safe-area-inset-*)`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; no page scroll/bounce/zoom during play (`touch-action: none` on canvas).
- **Scalable UI**: all sizes through CSS custom properties / a single UI-scale variable (e.g. `--ui-scale`, `clamp()`, `rem`/`vmin`), never fixed px layouts. Scale must be changeable from one place (config) and optionally by a player setting.
- Per-orientation layouts via `@media (orientation: portrait|landscape)` (or a JS layout flag); rearrange, don't just shrink.
- Minimum touch target 44x44 CSS px, spacing so thumbs don't overlap; text readable (>= 14 px effective).
- HUD anchors: keep clear of Bloxity's reserved areas - read `Legion.SDK.ui.onReservedAreasChange(areas => ...)` and CSS vars `--boxity-ui-top` / `--boxity-ui-left` (top-left toolbar/chat). Death UI and ad-screen UI stay **centered** (Bloxity banners use edges/corners).
- Touch controls (`src/touch.js` / `touch.css`): virtual stick/buttons reposition per orientation, honor safe areas, support multi-touch, and show only on touch devices.
- Handle `visibilitychange`/blur (pause) and ad breaks (pause + mute).
- Performance on mobile: capped DPR, lighter post-FX/shadows on low-end, no long main-thread stalls.

**Acceptance checks (do before calling a UI task done)**
- [ ] 360x640 portrait, 640x360 landscape, 390x844, 844x390, tablet 768x1024 / 1024x768, desktop 1920x1080.
- [ ] Rotate during gameplay and in menus: layout re-flows, nothing clipped or overlapping, game state intact.
- [ ] Notch/safe-area respected; no horizontal/vertical page scroll.
- [ ] Change UI scale value in one place -> all UI scales consistently.
- [ ] Embedded in Bloxity iframe: HUD avoids reserved top-left area; works with and without `window.Legion`.

## 6. Integration verification checklist

- [ ] SDK loaded from `sdk.bloxity.io/v1`, `init({gameSlug})` once, callbacks registered before `loadingEnd()`.
- [ ] `loadingStep` / `loadingEnd` / `gameplayStart` / `gameplayEnd` wired.
- [ ] Ad break pause/mute works; death screen (if deaths) uses `respawn()` gating.
- [ ] `leaderboard.define` called; `submit` on final score; trophy/open button hidden when `open()` is `false`; hosted games report from server.
- [ ] No own sign-in/menu/chat/fullscreen/P-key UI inside Bloxity.
- [ ] No hardcoded Bloxity hostnames; socket via `net.resolveEndpoint`.
- [ ] Section 5 acceptance checks pass.

## 7. Known gaps in this doc
The upstream HTML5 page is very long and the last ~70k characters were not read; verify against https://docs.bloxity.io/#html5 for any save-data API, leaderboard rate limits, or publishing checklist before release. No generic cloud-save API was found; progress persistence belongs in our backend (MongoDB via `MONGODB_URI`).
