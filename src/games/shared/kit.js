import { ref, computed, onBeforeUnmount } from 'vue'

export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 카운트다운 타이머 (초 단위, 컴포넌트 해제 시 자동 정리) */
export function useTimer() {
  const remain = ref(0)
  const total = ref(1)
  let id = 0
  const pct = computed(() => Math.max(0, Math.min(100, (remain.value / total.value) * 100)))
  const text = computed(() => remain.value.toFixed(1))
  function stop() { clearInterval(id); id = 0 }
  function start(sec, onExpire) {
    stop()
    total.value = sec
    remain.value = sec
    const end = performance.now() + sec * 1000
    id = setInterval(() => {
      remain.value = Math.max(0, (end - performance.now()) / 1000)
      if (remain.value <= 0) { stop(); onExpire?.() }
    }, 50)
  }
  onBeforeUnmount(stop)
  return { remain, total, pct, text, start, stop }
}

/** setTimeout 모음 (해제 시 전부 취소) */
export function useLater() {
  const ids = new Set()
  const later = (fn, ms) => {
    const id = setTimeout(() => { ids.delete(id); fn() }, ms)
    ids.add(id)
    return id
  }
  const clearAll = () => { ids.forEach(clearTimeout); ids.clear() }
  onBeforeUnmount(clearAll)
  return { later, clearAll }
}

export const hearts = (n) => (n > 0 ? '❤️'.repeat(n) : '💀')
