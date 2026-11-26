import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '../services/authService'
import { isSupabaseEnabled } from '../services/config'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null) // { id, email, nickname, needsNickname }
  const ready = ref(false)
  const modalOpen = ref(false)

  /** 닉네임까지 정해진 상태 = 랭킹에 참여 가능 */
  const isLoggedIn = computed(() => !!user.value?.nickname)
  /** 구글 로그인은 했지만 닉네임을 아직 안 정함 */
  const needsNickname = computed(() => !!user.value && !user.value.nickname)

  function apply(u) {
    user.value = u
    if (u && !u.nickname) modalOpen.value = true // 닉네임 정하기로 바로 안내
  }

  async function init() {
    try { apply(await authService.getUser()) } catch { user.value = null }
    ready.value = true
    authService.onChange((u) => {
      user.value = u
      if (u?.nickname) modalOpen.value = false
    })
  }

  async function signInWithGoogle() {
    const u = await authService.signInWithGoogle()
    if (!u) return null // 창을 닫음
    apply(u)
    if (u.nickname) modalOpen.value = false
    return u
  }

  async function registerNickname(nick) {
    const u = await authService.registerNickname(nick)
    user.value = u
    modalOpen.value = false
    return u
  }

  async function signOut() {
    await authService.signOut()
    user.value = null
  }

  const openLogin = () => (modalOpen.value = true)
  const closeLogin = () => (modalOpen.value = false)

  return {
    user, ready, modalOpen, isLoggedIn, needsNickname,
    isLocalMode: !isSupabaseEnabled,
    init, signInWithGoogle, registerNickname, signOut, openLogin, closeLogin,
  }
})
