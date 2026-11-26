<script setup>
import { ref, watch, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth'
import { NICK_RULE } from '../services/nickname'

/** 로그인 창: 로그인(이메일·비밀번호) / 회원가입(이메일·닉네임·비밀번호) */
const auth = useAuthStore()
const logo = `${import.meta.env.BASE_URL}logo.png`
const tab = ref('login') // 'login' | 'signup'
const email = ref('')
const password = ref('')
const nickname = ref('')
const error = ref('')
const loading = ref(false)
const firstInput = ref(null)
const nickInput = ref(null)

const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NICK_MSG = '닉네임은 2~12자의 한글·영문·숫자·_ 만 쓸 수 있어요.'

watch(() => auth.modalOpen, (open) => {
  if (!open) return
  error.value = ''
  loading.value = false
  password.value = ''
  nextTick(() => firstInput.value?.focus())
})
watch(() => auth.needsNickname && auth.modalOpen, (on) => {
  if (on) nextTick(() => nickInput.value?.focus())
})
watch(tab, () => { error.value = '' })

async function submit() {
  error.value = ''
  const mail = email.value.trim()
  if (!EMAIL_RULE.test(mail)) return (error.value = '이메일 주소를 다시 확인해 주세요.')
  if (tab.value === 'signup' && !NICK_RULE.test(nickname.value.trim())) return (error.value = NICK_MSG)
  if (password.value.length < 6) return (error.value = '비밀번호는 6자 이상으로 입력해 주세요.')
  loading.value = true
  try {
    if (tab.value === 'signup') await auth.signUp({ email: mail, password: password.value, nickname: nickname.value })
    else await auth.signIn({ email: mail, password: password.value })
    password.value = ''
    nickname.value = ''
  } catch (e) {
    error.value = e?.message || '로그인하지 못했어요.'
  } finally {
    loading.value = false
  }
}

async function saveNickname() {
  error.value = ''
  const nick = nickname.value.trim()
  if (!NICK_RULE.test(nick)) return (error.value = NICK_MSG)
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
          <h2 id="login-title">{{ tab === 'signup' ? '겜돌이 월드 회원가입' : '겜돌이 월드 로그인' }}</h2>
          <p class="desc muted">로그인하면 경쟁 모드와 랭킹에 참여할 수 있어요.</p>
          <div class="tabs" role="tablist" aria-label="로그인 방식">
            <button type="button" role="tab" :aria-selected="tab === 'login'" :class="{ on: tab === 'login' }" @click="tab = 'login'">로그인</button>
            <button type="button" role="tab" :aria-selected="tab === 'signup'" :class="{ on: tab === 'signup' }" @click="tab = 'signup'">회원가입</button>
          </div>
          <form class="form" novalidate @submit.prevent="submit">
            <label>
              <span>이메일</span>
              <input ref="firstInput" v-model="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" />
            </label>
            <label v-if="tab === 'signup'">
              <span>닉네임 <small class="muted">랭킹에 표시돼요 · 바꿀 수 없어요</small></span>
              <input v-model="nickname" maxlength="12" autocomplete="nickname" placeholder="2~12자 (한글·영문·숫자·_)" />
            </label>
            <label>
              <span>비밀번호</span>
              <input v-model="password" type="password" :autocomplete="tab === 'signup' ? 'new-password' : 'current-password'" placeholder="6자 이상" />
            </label>
            <button class="btn btn-primary submit" :disabled="loading">
              {{ loading ? (tab === 'signup' ? '가입 중…' : '로그인 중…') : (tab === 'signup' ? '가입하고 시작하기' : '로그인') }}
            </button>
          </form>
          <p v-if="auth.isLocalMode" class="note muted">오프라인 모드: 계정이 이 브라우저에만 저장돼요. 실제 비밀번호는 쓰지 마세요.</p>
        </template>

        <form v-else class="form" @submit.prevent="saveNickname">
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
.backdrop { position: fixed; inset: 0; z-index: 50; background: var(--scrim); display: grid; place-items: center; padding: 20px; overflow-y: auto; }
.modal {
  width: min(380px, 100%); padding: 24px; display: grid; gap: 12px; text-align: center;
  background: var(--surface); color: var(--text);
  border-radius: var(--r-lg); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
}
.logo { width: 64px; height: 64px; border-radius: 50%; border: var(--bw) solid var(--bc); justify-self: center; }
h2 { margin: 0; font-family: var(--font-display); font-weight: var(--display-weight); font-size: 22px; }
.desc { margin: 0; font-size: 14px; }
.tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 999px; border: var(--bw) solid var(--bc); background: var(--bg); }
.tabs button { height: 38px; border: 0; border-radius: 999px; background: none; color: var(--muted); font-weight: 700; font-size: 14px; }
.tabs button.on { background: var(--text); color: var(--bg); }
.form { display: grid; gap: 10px; text-align: left; }
.form label { display: grid; gap: 4px; }
.form label > span { font-size: 12px; font-weight: 700; color: var(--muted); }
.form small { font-weight: 500; }
input {
  width: 100%; height: 48px; padding: 0 14px; border-radius: var(--r-btn2); border: var(--bw) solid var(--bc);
  background: var(--bg); color: var(--text); font-size: 16px;
}
input:focus { border-color: var(--accent); outline: none; }
.submit { height: 52px; font-size: 16px; margin-top: 2px; }
.note { margin: 0; font-size: 12px; }
.err { color: var(--danger); margin: 0; font-size: 14px; }
.close { justify-self: center; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
