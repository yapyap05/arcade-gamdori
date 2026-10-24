// 더미 인증: Firebase 가입 전 개발용. 이메일+닉네임만 입력하면 즉시 로그인(이 브라우저에만 저장).
const KEY = 'gamdori:user'
const listeners = new Set()

export const mockAuth = {
  async getUser() {
    try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
  },
  async signIn({ email, nickname }) {
    const user = { id: 'mock:' + email.toLowerCase(), email, nickname }
    localStorage.setItem(KEY, JSON.stringify(user))
    listeners.forEach((cb) => cb(user))
    return { user }
  },
  async verify() {
    throw new Error('더미 모드에서는 인증 코드가 필요 없어요.')
  },
  async signOut() {
    localStorage.removeItem(KEY)
    listeners.forEach((cb) => cb(null))
  },
  onChange(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
}
