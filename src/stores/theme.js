import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

/**
 * 테마 모드
 *  choice : 사용자가 고른 테마 'candy' | 'minimal' | 'minimal-dark'
 *  followSystem : 켜면 미니멀 계열은 OS 라이트/다크를 따름 (캔디 팝은 라이트 전용)
 *  resolved : 실제 적용 값 → <html data-theme>
 * 첫 페인트용 동일 로직이 index.html 에도 있음
 */
export const THEMES = [
  { id: 'candy', label: '캔디 팝', preview: { bg: '#FFF7EC', border: '#2B1B12', colors: ['#FFC93C', '#5B9BFF', '#FF8FB8'] } },
  { id: 'minimal', label: '미니멀', preview: { bg: '#F6F5F2', border: '#E3E1DC', colors: ['#111111', '#2F5BEA', '#E3E1DC'] } },
  { id: 'minimal-dark', label: '미니멀 다크', preview: { bg: '#121212', border: '#2E2E2E', colors: ['#F2F2F2', '#7C95FF', '#2E2E2E'] } },
]
const IDS = THEMES.map((t) => t.id)
const THEME_COLOR = { candy: '#FFF7EC', minimal: '#F6F5F2', 'minimal-dark': '#121212' }

function read(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function write(key, value) {
  try { localStorage.setItem(key, value) } catch {}
}

export const useThemeStore = defineStore('theme', () => {
  const saved = read('gamdori:theme')
  const choice = ref(IDS.includes(saved) ? saved : 'minimal')
  const followSystem = ref(read('gamdori:follow-system') !== 'off')

  const media = window.matchMedia?.('(prefers-color-scheme: dark)')
  const systemDark = ref(!!media?.matches)
  media?.addEventListener?.('change', (e) => (systemDark.value = e.matches))

  const resolved = computed(() =>
    choice.value !== 'candy' && followSystem.value ? (systemDark.value ? 'minimal-dark' : 'minimal') : choice.value,
  )

  watch(
    resolved,
    (t) => {
      document.documentElement.dataset.theme = t
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[t])
    },
    { immediate: true },
  )

  function setChoice(id) {
    if (!IDS.includes(id)) return
    choice.value = id
    write('gamdori:theme', id)
    // 다크/라이트를 직접 고르면 시스템 따라가기는 끔
    if (id !== 'candy' && followSystem.value) setFollowSystem(false)
  }
  function setFollowSystem(on) {
    followSystem.value = on
    write('gamdori:follow-system', on ? 'on' : 'off')
  }

  return { choice, followSystem, resolved, setChoice, setFollowSystem }
})
