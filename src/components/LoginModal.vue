<script setup>
import { ref, watch, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth'
import { NICK_RULE } from '../services/nickname'

/** 로그인 창: 'Google로 계속하기' → 처음이면 닉네임 정하기 */
const auth = useAuthStore()
const logo = `${import.meta.env.BASE_URL}logo.png`
const nickname = ref('')
const error = ref('')
const loading = ref(false)
const nickInput = ref(null)

watch(() => auth.modalOpen, (open) => {
  if (!open) return
  error.value = ''
  loading.value = false
})
watch(() => auth.needsNickname && auth.modalOpen, (on) => {
  if (on) nextTick(() => nickInput.value?.focus())
})

async function google() {
  error.value = ''
  loading.value = true
  try {
    await auth.signInWithGoogle()
  } catch (e) {
    error.value = e?.message || '로그인하지 못했어요.'
  } finally {
    loading.value = false
  }
}

async function saveNickname() {
  error.value = ''
  const nick = nickname.value.trim()
  if (!NICK_RULE.test(nick)) return (error.value = '닉네임은 2~12자의 한글·영문·숫자·_ 만 쓸 수 있어요.')
  loading.value = true
  try {
    await auth.registerNickname(nick)
    nickname.value = ''
  } catch (e) {
    error.value = e?.message || '닉네임을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'
  } finally {
    loading.value = false
  }
}

// 닉네임을 정하지 않고 닫으면 로그인도 취소 (반쯤 로그인된 상태로 남지 않게)
async function close() {
  if (auth.needsNickname) await auth.signOut()
  auth.closeLogin()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="auth.modalOpen" class="backdrop" @click.self="close" @keydown.esc="close">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <img :src="logo" alt="겜돌이 월드" width="64" height="64" class="logo" />

        <template v-if="!auth.needsNickname">
          <h2 id="login-title">겜돌이 월드 로그인</h2>
          <p class="desc muted">로그인하면 경쟁 모드와 랭킹에 참여할 수 있어요.</p>
          <button type="button" class="btn google" :disabled="loading" @click="google">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
              <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z" />
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
            </svg>
            {{ loading ? '로그인 중…' : 'Google로 계속하기' }}
          </button>
          <p v-if="auth.isLocalMode" class="note muted">더미 모드: 실제 구글 계정 없이 이 브라우저에만 저장돼요</p>
          <p v-else-if="auth.isEmulator" class="note muted">에뮬레이터 모드: 연습용 계정으로 로그인해요</p>
        </template>

        <form v-else class="nick" @submit.prevent="saveNickname">
          <h2 id="login-title">닉네임을 정해 주세요</h2>
          <p class="desc muted">랭킹에 표시되는 이름이에요. 한 번 정하면 바꿀 수 없어요.</p>
          <label>
            <span class="sr-only">닉네임</span>
            <input ref="nickInput" v-model="nickname" maxlength="12" autocomplete="nickname" placeholder="2~12자 (한글·영문·숫자·_)" />
          </label>
          <button class="btn btn-primary submit" :disabled="loading">{{ loading ? '저장 중…' : '시작하기' }}</button>
        </form>

        <p v-if="error" class="err" role="alert">{{ error }}</p>
        <button type="button" class="btn btn-sm close" @click="close">{{ auth.needsNickname ? '취소' : '닫기' }}</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 50; background: var(--scrim); display: grid; place-items: center; padding: 20px; }
.modal {
  width: min(380px, 100%); padding: 24px; display: grid; gap: 12px; text-align: center;
  background: var(--surface); color: var(--text);
  border-radius: var(--r-lg); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
}
.logo { width: 64px; height: 64px; border-radius: 50%; border: var(--bw) solid var(--bc); justify-self: center; }
h2 { margin: 0; font-family: var(--font-display); font-weight: var(--display-weight); font-size: 22px; }
.desc { margin: 0; font-size: 14px; }
.google {
  height: 52px; display: flex; align-items: center; justify-content: center; gap: 10px;
  background: #FFFFFF; color: #1F1F1F; border: 1px solid #DADCE0; font-size: 16px;
}
.note { margin: 0; font-size: 12px; }
.nick { display: grid; gap: 12px; }
input {
  width: 100%; height: 50px; padding: 0 14px; border-radius: var(--r-btn2); border: var(--bw) solid var(--bc);
  background: var(--bg); color: var(--text); font-size: 16px; text-align: center;
}
input:focus { border-color: var(--accent); outline: none; }
.submit { height: 52px; font-size: 16px; }
.err { color: var(--danger); margin: 0; font-size: 14px; }
.close { justify-self: center; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
