/**
 * 인증 서비스 진입점.
 *
 * 어댑터 계약(Contract):
 *   getSession(): Promise<User | null>
 *   signIn({ email, nickname }): Promise<User>
 *   signOut(): Promise<void>
 *
 * User = { id: string, email: string, nickname: string }
 * VITE_BACKEND=supabase 로 바꾸면 화면 코드 수정 없이 교체됩니다.
 */
const backend = import.meta.env.VITE_BACKEND || 'local'

let adapterPromise
function load() {
  if (!adapterPromise) {
    adapterPromise =
      backend === 'supabase' ? import('./supabaseAdapter.js') : import('./localAdapter.js')
  }
  return adapterPromise.then((m) => m.default)
}

export const authService = {
  backend,
  getSession: async () => (await load()).getSession(),
  signIn: async (payload) => (await load()).signIn(payload),
  signOut: async () => (await load()).signOut()
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function validateLogin({ email, nickname }) {
  const e = (email || '').trim().toLowerCase()
  const n = (nickname || '').trim()
  if (!EMAIL_RE.test(e)) return { ok: false, message: '이메일 형식을 확인해 주세요.' }
  if (n.length < 2 || n.length > 12) return { ok: false, message: '닉네임은 2~12자로 입력해 주세요.' }
  return { ok: true, value: { email: e, nickname: n } }
}
