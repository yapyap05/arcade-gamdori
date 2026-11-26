import { NICK_RULE, nickKey } from '../nickname'

/**
 * 더미 로그인: Supabase 설정 전 개발용 (이 브라우저에만 저장)
 * 실제와 같은 흐름 — '구글로 계속하기' → 처음이면 닉네임 정하기
 */
const USER_KEY = 'gamdori:user'
const NICKS_KEY = 'gamdori:mock-nicknames' // { 닉네임키: uid }
const MOCK_UID = 'mock:local-user'
const listeners = new Set()

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
const emit = (u) => listeners.forEach((cb) => cb(u))

export const mockAuth = {
  async getUser() {
    const u = read(USER_KEY, null)
    return u ? { ...u, needsNickname: !u.nickname } : null
  },

  async signInWithGoogle() {
    const prev = read(USER_KEY, null)
    const user = prev ?? { id: MOCK_UID, email: 'player@example.com', nickname: null }
    write(USER_KEY, user)
    const out = { ...user, needsNickname: !user.nickname }
    emit(out)
    return out
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
