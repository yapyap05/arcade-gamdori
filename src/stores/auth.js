import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '../services/authService'
import { isFirebaseEnabled } from '../services/config'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const ready = ref(false)
  const modalOpen = ref(false)
  const isLoggedIn = computed(() => !!user.value)

  async function init() {
    user.value = await authService.getUser()
    ready.value = true
    authService.onChange((u) => { user.value = u; if (u) modalOpen.value = false })
  }
  async function signIn(payload) {
    const res = await authService.signIn(payload)
    if (res.user) modalOpen.value = false
    return res
  }
  async function verify(payload) {
    const res = await authService.verify(payload)
    if (res.user) { user.value = res.user; modalOpen.value = false }
    return res
  }
  const signOut = () => authService.signOut()
  const openLogin = () => (modalOpen.value = true)
  const closeLogin = () => (modalOpen.value = false)

  return { user, ready, modalOpen, isLoggedIn, isLocalMode: !isFirebaseEnabled, init, signIn, verify, signOut, openLogin, closeLogin }
})
