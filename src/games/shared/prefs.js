import { ref, watch } from 'vue'

/** 게임 공통 설정 (localStorage) */
function stored(key, fallback = true) {
  let v = fallback
  try {
    const s = localStorage.getItem(key)
    if (s === 'on') v = true
    else if (s === 'off') v = false
  } catch {}
  const r = ref(v)
  watch(r, (on) => { try { localStorage.setItem(key, on ? 'on' : 'off') } catch {} })
  return r
}

/** 진동 (안드로이드 등 navigator.vibrate 지원 기기만 동작) */
export const vibrateOn = stored('gamdori:vibrate')
/** 앱 전환·화면 잠금 시 자동 일시정지 */
export const autoPauseOn = stored('gamdori:auto-pause')

export function haptic(pattern) {
  if (!vibrateOn.value) return
  try { navigator.vibrate?.(pattern) } catch {}
}
