const KEY = 'gamdori:user'

// 같은 이메일이면 항상 같은 id가 나오도록 간단한 해시를 사용합니다.
function idFromEmail(email) {
  let h = 5381
  for (let i = 0; i < email.length; i++) h = ((h << 5) + h + email.charCodeAt(i)) >>> 0
  return 'local-' + h.toString(36)
}

export default {
  async getSession() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || null
    } catch {
      return null
    }
  },
  async signIn({ email, nickname }) {
    const user = { id: idFromEmail(email), email, nickname }
    localStorage.setItem(KEY, JSON.stringify(user))
    return user
  },
  async signOut() {
    localStorage.removeItem(KEY)
  }
}
