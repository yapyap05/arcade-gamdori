<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const email = ref('')
const nickname = ref('')
const code = ref('')
const step = ref('form') // form | code(숫자 코드 입력) | sent(메일 링크 안내)
const error = ref('')
const info = ref('')
const loading = ref(false)

watch(() => auth.modalOpen, (open) => {
  if (open) { error.value = ''; info.value = ''; step.value = 'form'; code.value = '' }
})

const fail = (e, fallback) => (error.value = e?.message || fallback)

async function submit() {
  error.value = ''
  const nick = nickname.value.trim()
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) return (error.value = '이메일 형식을 확인해 주세요.')
  if (nick.length < 2 || nick.length > 12) return (error.value = '닉네임은 2~12자로 입력해 주세요.')
  loading.value = true
  try {
    const res = await auth.signIn({ email: email.value.trim(), nickname: nick })
    if (res.pending) { info.value = res.message; step.value = res.method === 'code' ? 'code' : 'sent' }
  } catch (e) {
    fail(e, '메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.')
  } finally {
    loading.value = false
  }
}

async function verify() {
  error.value = ''
  if (!/^\d{6,8}$/.test(code.value.trim())) return (error.value = '메일에 적힌 숫자 코드를 입력해 주세요.')
  loading.value = true
  try {
    await auth.verify({ email: email.value.trim(), code: code.value.trim() })
  } catch (e) {
    fail(e, '코드가 올바르지 않거나 만료됐어요.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="auth.modalOpen" class="backdrop" @click.self="auth.closeLogin()" @keydown.esc="auth.closeLogin()">
      <div class="card modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <h2 id="login-title">닉네임으로 바로 시작하기</h2>
        <p class="muted desc">
          비밀번호 없이 이메일과 닉네임만 있으면 랭킹에 도전할 수 있어요.
          <span v-if="auth.isLocalMode">(더미 모드: 이 브라우저에만 저장돼요)</span>
        </p>

        <form v-if="step === 'form'" @submit.prevent="submit">
          <label>이메일<input v-model="email" type="email" autocomplete="email" placeholder="you@example.com" autofocus /></label>
          <label>닉네임<input v-model="nickname" maxlength="12" autocomplete="nickname" placeholder="랭킹에 표시될 이름 (처음 가입할 때만 저장)" /></label>
          <p v-if="error" class="err" role="alert">{{ error }}</p>
          <button class="btn btn-cta submit" :disabled="loading">{{ loading ? '처리 중…' : '시작하기' }}</button>
        </form>

        <div v-else-if="step === 'sent'" class="sent">
          <p class="ok" role="status">{{ info }}<br />메일의 <b>링크를 누르면</b> 바로 로그인돼요. (스팸함도 확인해 주세요)</p>
          <button type="button" class="btn btn-sm back" @click="step = 'form'">← 이메일 다시 입력</button>
        </div>

        <form v-else @submit.prevent="verify">
          <p class="ok" role="status">{{ info }}<br />메일의 <b>링크를 누르거나</b>, 아래에 <b>숫자 코드</b>를 입력하세요.</p>
          <label>인증 코드<input v-model="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456" autofocus /></label>
          <p v-if="error" class="err" role="alert">{{ error }}</p>
          <button class="btn btn-cta submit" :disabled="loading">{{ loading ? '확인 중…' : '코드 확인' }}</button>
          <button type="button" class="btn btn-sm back" @click="step = 'form'">← 이메일 다시 입력</button>
        </form>

        <button class="btn btn-sm close" @click="auth.closeLogin()">닫기</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 50; background: rgba(10, 12, 30, 0.55); display: grid; place-items: center; padding: 20px; }
.modal { width: min(420px, 100%); padding: 28px; display: grid; gap: 12px; }
h2 { margin: 0; font-size: 22px; }
.desc { margin: 0; font-size: 14px; }
form, .sent { display: grid; gap: 14px; }
label { display: grid; gap: 6px; font-weight: 600; font-size: 14px; }
input { padding: 12px 14px; border-radius: 12px; border: 2px solid var(--line); background: var(--bg); }
input:focus { border-color: var(--accent); outline: none; }
.err { color: var(--danger); margin: 0; font-size: 14px; }
.ok { margin: 0; padding: 14px; border-radius: 12px; background: var(--surface-2); font-size: 14px; }
.submit { padding: 12px; font-size: 16px; }
.back { justify-self: start; }
.close { justify-self: end; }
</style>
