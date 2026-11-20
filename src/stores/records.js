import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 내 최고 기록 (이 기기에만 저장, 로그인 불필요)
 * localStorage 'gamdori:best' = { [gameId]: { casual?: {score, at}, competitive?: {score, at} } }
 */
const KEY = 'gamdori:best'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} }
}

export const useRecordsStore = defineStore('records', () => {
  const best = ref(load())

  /** 최고 기록이면 저장하고 true 반환 */
  function submit(gameId, mode, score) {
    if (!(score > 0)) return false
    const prev = best.value[gameId]?.[mode]?.score ?? 0
    if (score <= prev) return false
    best.value = { ...best.value, [gameId]: { ...best.value[gameId], [mode]: { score, at: Date.now() } } }
    try { localStorage.setItem(KEY, JSON.stringify(best.value)) } catch {}
    return true
  }

  /** 모드 무관 최고 점수 (없으면 null) */
  function bestOf(gameId) {
    const r = best.value[gameId]
    if (!r) return null
    const s = Math.max(r.casual?.score ?? 0, r.competitive?.score ?? 0)
    return s > 0 ? s : null
  }

  return { best, submit, bestOf }
})
