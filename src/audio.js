// Synthesised sounds (no audio files): the UI's, training's and the throw's (rising skip
// notes, fuse hiss, the layered blast, brick clatter, the Wins jingle). The context is
// created on the first user gesture (browsers keep audio locked until then); every call is
// a no-op until it exists or if Web Audio is missing.
let ctx = null
let master = null
let echo = null // input of the slapback the big sounds also feed

function unlock() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return
  }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0.4
  // Keeps the blast big without clipping when everything fires at once.
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -9
  limiter.ratio.value = 12
  limiter.attack.value = 0.002
  limiter.release.value = 0.2
  master.connect(limiter).connect(ctx.destination)
  const delay = ctx.createDelay(1)
  delay.delayTime.value = 0.21
  const feedback = ctx.createGain()
  feedback.gain.value = 0.32
  const wet = ctx.createGain()
  wet.gain.value = 0.34
  echo = ctx.createGain()
  echo.connect(delay).connect(feedback).connect(delay)
  delay.connect(wet).connect(master)
}
document.addEventListener('visibilitychange', () => {
  if (!ctx) return
  if (document.hidden) ctx.suspend().catch(() => {})
  else ctx.resume().catch(() => {})
})
window.addEventListener('pointerdown', unlock, { capture: true })
window.addEventListener('keydown', unlock, { capture: true })

function tone(freq, decay, gain, type = 'sine', at = 0, slide = 1, wet = false) {
  if (!ctx) return
  const t = ctx.currentTime + at
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  o.frequency.exponentialRampToValueAtTime(freq * slide, t + decay)
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + decay)
  o.connect(g).connect(master)
  if (wet) g.connect(echo)
  o.start(t)
  o.stop(t + decay + 0.05)
}

// A burst of filtered noise (whoosh / blast); the filter sweeps from `from` to `to` Hz.
let noiseBuf = null
const whiteNoise = () =>
  (noiseBuf ??= (() => {
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    return b
  })())
function noise(decay, gain, from, to, at = 0) {
  if (!ctx) return
  whiteNoise()
  const t = ctx.currentTime + at
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(from, t)
  f.frequency.exponentialRampToValueAtTime(to, t + decay)
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + decay)
  src.connect(f).connect(g).connect(master)
  src.start(t)
  src.stop(t + decay + 0.05)
}

// The same with a free filter type, an attack and the echo (crack, roar, dust, whoosh).
function shaped(decay, gain, { type = 'lowpass', f0 = 1000, f1 = f0, q = 0.7, at = 0, attack = 0.002, wet = false } = {}) {
  if (!ctx) return
  const t = ctx.currentTime + at
  const src = ctx.createBufferSource()
  src.buffer = whiteNoise()
  src.loop = true
  const f = ctx.createBiquadFilter()
  f.type = type
  f.Q.value = q
  f.frequency.setValueAtTime(f0, t)
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + decay)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + attack)
  g.gain.exponentialRampToValueAtTime(0.001, t + decay)
  src.connect(f).connect(g).connect(master)
  if (wet) g.connect(echo)
  src.start(t, Math.random() * 1.8)
  src.stop(t + decay + 0.05)
}

// The fuse: a looping hiss, quiet in flight and loud once the TNT has stopped.
let hiss = null
const fuse = {
  start() {
    if (!ctx || hiss) return
    const src = ctx.createBufferSource()
    src.buffer = whiteNoise()
    src.loop = true
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 5200
    f.Q.value = 1.4
    const g = ctx.createGain()
    g.gain.value = 0.05
    src.connect(f).connect(g).connect(master)
    src.start()
    hiss = { src, g, f }
  },
  hot() {
    if (!hiss) return
    hiss.g.gain.setTargetAtTime(0.2, ctx.currentTime, 0.12)
    hiss.f.frequency.setTargetAtTime(7400, ctx.currentTime, 0.2)
  },
  // Crackle: the hiss flutters a little every frame.
  update() {
    if (hiss) hiss.f.Q.value = 1 + Math.random() * 2.4
  },
  stop() {
    if (!hiss) return
    hiss.src.stop()
    hiss = null
  },
}

const SCALE = [0, 2, 4, 7, 9] // major pentatonic: the skips climb a tune, never a clash

export const sfx = {
  whoosh: () => noise(0.28, 0.35, 500, 3200),
  boom: (k = 1) => {
    noise(0.7, 0.9 * k, 2400, 90)
    tone(95, 0.55, 0.7 * k, 'sine', 0, 0.35)
    tone(50, 0.7, 0.5 * k, 'triangle', 0, 0.5)
  },
  click: () => tone(660, 0.07, 0.25, 'triangle', 0, 1.4),
  deny: () => {
    tone(220, 0.12, 0.3, 'square', 0, 0.8)
    tone(170, 0.16, 0.25, 'square', 0.09, 0.8)
  },
  claim: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 0.25, 'triangle', i * 0.07)),
  rattle: () => [0, 0.12, 0.24, 0.36, 0.5, 0.62].forEach((at) => tone(300 + Math.random() * 80, 0.06, 0.2, 'square', at)),
  reveal: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.3, 0.22, 'sine', i * 0.06)),

  // --- The throw down the lane ---
  fuse,
  windup: () => shaped(0.32, 0.16, { type: 'bandpass', f0: 240, f1: 820, q: 1.6, attack: 0.16 }),
  throwWhoosh: () => {
    shaped(0.5, 0.75, { type: 'bandpass', f0: 420, f1: 3000, q: 1.1, attack: 0.05 })
    tone(190, 0.16, 0.5, 'triangle', 0, 2.1)
  },
  whooshBack: () => shaped(0.95, 0.42, { type: 'bandpass', f0: 2600, f1: 260, q: 1, attack: 0.25 }),
  // One skip: the thump on the lane, the dirt, and a note a step above the last one.
  skip: (i, k) => {
    const step = Math.floor(i * 0.62)
    const note = SCALE[step % 5] + 12 * Math.floor(step / 5)
    const f = 311 * 2 ** (note / 12)
    tone(f, 0.17, 0.2, 'triangle')
    tone(f * 2, 0.09, 0.07, 'sine')
    tone(150 + 60 * k, 0.1 + 0.08 * k, 0.32 + 0.4 * k, 'sine', 0, 0.42)
    shaped(0.08 + 0.05 * k, 0.16 + 0.3 * k, { type: 'bandpass', f0: 1500, f1: 600, q: 0.8 })
  },
  // The fuse's last beats, higher as t -> 1.
  tick: (t) => {
    tone(880 + 900 * t, 0.07, 0.26, 'square', 0, 0.96)
    tone(1760 + 1800 * t, 0.05, 0.1, 'sine')
  },
  // The blast: click, crack, chest thump, roar, rumble, crumble, then the echo off the banks.
  blast: () => {
    tone(330, 0.08, 0.9, 'square', 0, 0.16, true)
    shaped(0.14, 1.5, { type: 'highpass', f0: 2200, wet: true })
    tone(120, 1.1, 1.5, 'sine', 0, 0.2, true)
    tone(62, 2.3, 1.3, 'sine', 0, 0.45)
    tone(180, 0.5, 0.7, 'sawtooth', 0, 0.16)
    shaped(1.5, 1.9, { type: 'lowpass', f0: 3600, f1: 150, q: 1, attack: 0.004, wet: true })
    shaped(3.4, 0.8, { type: 'lowpass', f0: 460, f1: 60, at: 0.08, attack: 0.1 })
    for (let i = 0; i < 26; i++) shaped(0.06 + Math.random() * 0.08, 0.2 * (1 - i / 34), { type: 'bandpass', f0: 500 + Math.random() * 2600, q: 2, at: 0.2 + Math.random() * 1.9 })
    // The fire keeps crackling in the crater.
    for (let i = 0; i < 26; i++) shaped(0.03, 0.06 + Math.random() * 0.08, { type: 'highpass', f0: 2600 + Math.random() * 3000, at: 0.9 + i * 0.11 + Math.random() * 0.08 })
  },
  // An aftershock along the rim.
  pop: () => {
    tone(170 + Math.random() * 60, 0.22, 0.7, 'sine', 0, 0.3)
    shaped(0.28, 0.75, { type: 'lowpass', f0: 3000, f1: 300, wet: true })
  },
  // A lego brick landing: a short plastic clack, v = how hard (0..1).
  clack: (v) => {
    const f = 900 + Math.random() * 1500
    tone(f, 0.04, 0.08 + 0.2 * v, 'square', 0, 0.55)
    tone(f * 0.5, 0.06, 0.08 + 0.14 * v, 'triangle', 0, 0.7)
  },
  zone: () => [523, 784, 1047].forEach((f, i) => tone(f, 0.34, 0.2, 'triangle', i * 0.08)),
  win: () => {
    ;[659, 880, 1175, 1568, 1976].forEach((f, i) => {
      tone(f, 0.26, 0.22, 'triangle', i * 0.075)
      tone(f * 2, 0.16, 0.08, 'sine', i * 0.075)
    })
    tone(2637, 0.6, 0.12, 'sine', 0.38, 1)
  },
  levelUp: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 0.2, 'square', i * 0.055, 1.01)),
}
