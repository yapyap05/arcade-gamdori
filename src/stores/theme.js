import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref(document.documentElement.dataset.theme || 'light')

  function set(next) {
    theme.value = next
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('gamdori:theme', next) } catch {}
  }
  const toggle = () => set(theme.value === 'dark' ? 'light' : 'dark')

  return { theme, set, toggle }
})
