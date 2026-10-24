import { ref, watch } from 'vue'

export const soundOn = ref(localStorage.getItem('gamdori:sound') !== 'off')
watch(soundOn, (v) => { try { localStorage.setItem('gamdori:sound', v ? 'on' : 'off') } catch {} })

let ctx
function tone(freq, dur, type = 'sine', gain = 0.06, delay = 0) {
  if (!soundOn.value) return
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)()
    ctx.resume?.()
    const t0 = ctx.currentTime + delay
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = freq
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g).connect(ctx.destination)
    o.start(t0)
    o.stop(t0 + dur + 0.02)
  } catch {}
}

export const sfx = {
  correct() { tone(660, 0.07, 'triangle', 0.07); tone(880, 0.09, 'triangle', 0.08, 0.07); tone(990, 0.11, 'sine', 0.08, 0.16) },
  wrong() { tone(220, 0.12, 'sawtooth', 0.06); tone(180, 0.14, 'sawtooth', 0.06, 0.12) },
  tick() { tone(600, 0.05, 'sine', 0.05) },
  key() { tone(800 + Math.random() * 200, 0.05, 'sine', 0.03) },
  levelUp() { tone(523, 0.08); tone(659, 0.08, 'sine', 0.06, 0.08); tone(784, 0.12, 'sine', 0.07, 0.16) },
  over() { tone(300, 0.15, 'square', 0.05); tone(200, 0.3, 'square', 0.05, 0.15) },
}
