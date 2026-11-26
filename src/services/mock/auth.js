import { NICK_RULE, nickKey } from '../nickname'

/**
 * 오프라인 모드 로그인: Supabase 설정 전 개발용 (이 브라우저에만 저장)
 * 실제와 같은 흐름 — 이메일·닉네임·비밀번호로 가입 → 바로 로그인 / 이메일·비밀번호로 로그인
 * ⚠ 개발용이라 비밀번호를 그대로 localStorage 에 저장함 (실제 비밀번호를 쓰지 마세요)
 */
const USER_KEY = 'gamdori:user'
const ACCOUNTS_KEY = 'gamdori:mock-accounts' // { 이메일: { id, password, nickname } }
const NICKS_KEY = 'gamdori:mock-nicknames' // { 닉네임키: uid }
const listeners = new Set()

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
const emit = (u) => listeners.forEach((cb) => cb(u))
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function login(email, acc) {
  const user = { id: acc.id, email, nickname: acc.nickname }
  write(USER_KEY, user)
  const out = { ...user, needsNickname: !user.nickname }
  emit(out)
  return out
}

export const mockAuth = {
  async getUser() {
    const u = read(USER_KEY, null)
    return u ? { ...u, needsNickname: !u.nickname } : null
  },

  async signUp({ email, password, nickname }) {
    const mail = email.trim().toLowerCase()
    const nick = nickname.trim()
    if (!EMAIL_RULE.test(mail)) throw new Error('이메일 주소를 다시 확인해 주세요.')
    if (!NICK_RULE.test(nick)) throw new Error('닉네임은 2~12자의 한글·영문·숫자·_ 만 쓸 수 있어요.')
    if (password.length < 6) throw new Error('비밀번호는 6자 이상으로 입력해 주세요.')
    const accounts = read(ACCOUNTS_KEY, {})
    if (accounts[mail]) throw new Error('이미 가입한 이메일이에요. 로그인해 주세요.')
    const nicks = read(NICKS_KEY, {})
    if (nicks[nickKey(nick)]) throw new Error('이미 쓰는 닉네임이에요. 다른 닉네임을 입력해 주세요.')
    const acc = { id: `mock:${Date.now().toString(36)}`, password, nickname: nick }
    accounts[mail] = acc
    nicks[nickKey(nick)] = acc.id
    write(ACCOUNTS_KEY, accounts)
    write(NICKS_KEY, nicks)
    return login(mail, acc)
  },

  async signIn({ email, password }) {
    const mail = email.trim().toLowerCase()
    const acc = read(ACCOUNTS_KEY, {})[mail]
    if (!acc || acc.password !== password) throw new Error('이메일 또는 비밀번호가 맞지 않아요.')
    return login(mail, acc)
  },

  async registerNickname(nickname) {
    const nick = nickname.trim()
    if (!NICK_RULE.test(nick)) throw new Error('닉네임은 2~12자의 한글·영문·숫자·_ 만 쓸 수 있어요.')
    const user = read(USER_KEY, null)
    if (!user) throw new Error('먼저 로그인해 주세요.')
    const nicks = read(NICKS_KEY, {})
    const owner = nicks[nickKey(nick)]
    if (owner && owner !== user.id) throw new Error('이미 쓰는 닉네임이에요. 다른 닉네임을 입력해 주세요.')
    nicks[nickKey(nick)] = user.id
    write(NICKS_KEY, nicks)
    const accounts = read(ACCOUNTS_KEY, {})
    if (accounts[user.email]) { accounts[user.email].nickname = nick; write(ACCOUNTS_KEY, accounts) }
    const next = { ...user, nickname: nick }
    write(USER_KEY, next)
    const out = { ...next, needsNickname: false }
    emit(out)
    return out
  },

  async signOut() {
    try { localStorage.removeItem(USER_KEY) } catch {}
    emit(null)
  },

  onChange(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
}
