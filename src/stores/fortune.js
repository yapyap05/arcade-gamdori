import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { ymd } from '../fortune/seed'

/**
 * 운세: 내 정보 · 입력값 기억 · 지난 운세 (이 기기에만 저장)
 * 고정 난수 기준 = 오늘 날짜 + (로그인 계정 ID 또는 이름+생년월일)
 */
const PROFILE_KEY = 'gamdori:fortune-profile'
const HISTORY_KEY = 'gamdori:fortune-history'
const MAX_HISTORY = 100

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

export const useFortuneStore = defineStore('fortune', () => {
  const auth = useAuthStore()
  const profile = ref({ name: '', birth: '', gender: '', ddi: null, inputs: {}, ...read(PROFILE_KEY, {}) })
  const history = ref(read(HISTORY_KEY, []))

  const hasProfile = computed(() => !!profile.value.birth)
  const seedId = computed(() => auth.user?.id || `${profile.value.name}${profile.value.birth}` || 'guest')

  /** 오늘·사용자 기준 시드 문자열 */
  const seed = (...parts) => ymd(new Date()) + seedId.value + parts.join(',')

  function saveProfile(p) {
    profile.value = { ...profile.value, ...p }
    write(PROFILE_KEY, profile.value)
  }
  /** 메뉴 입력값 기억 (다음에 열면 미리 채움) */
  function rememberInputs(values) {
    saveProfile({ inputs: { ...profile.value.inputs, ...values } })
  }

  /** 메뉴 입력칸 기본값: 내 정보 → 지난 입력값 순 */
  function defaultsFor(fields = []) {
    const p = profile.value
    const base = { birth: p.birth, name: p.name, n1: p.name, b1: p.birth }
    return Object.fromEntries(fields.map((f) => [f.name, p.inputs?.[f.name] ?? base[f.name] ?? (f.options ? f.options[0] : '')]))
  }

  function addHistory(menu, summary) {
    if (!summary) return
    const d = ymd(new Date())
    if (history.value.some((x) => x.d === d && x.m === menu && x.s === summary)) return
    history.value = [...history.value, { d, m: menu, s: summary }].slice(-MAX_HISTORY)
    write(HISTORY_KEY, history.value)
  }
  function clearHistory() {
    history.value = []
    write(HISTORY_KEY, [])
  }

  return { profile, history, hasProfile, seed, saveProfile, rememberInputs, defaultsFor, addHistory, clearHistory }
})
