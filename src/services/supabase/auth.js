import { getSupabase } from './client'
import { rememberReturn, takePendingCode } from './redirect'
import { NICK_RULE } from '../nickname'

/**
 * Supabase 로그인 (구글)
 *  - 구글 화면으로 이동했다가 돌아오는 방식 → 돌아오면 getUser() 에서 세션 완성
 *  - 로그인만으로는 아무것도 쓰지 않음. 첫 로그인이면 needsNickname: true → registerNickname()
 * user = { id, email, nickname, needsNickname }
 */
async function loadProfile(sb, sbUser) {
  if (!sbUser) return null
  const { data, error } = await sb.from('profiles').select('nickname').eq('id', sbUser.id).maybeSingle()
  if (error) throw error
  const nickname = data?.nickname ?? null
  return { id: sbUser.id, email: sbUser.email, nickname, needsNickname: !nickname }
}

export const supabaseAuth = {
  async getUser() {
    const sb = await getSupabase()
    const code = takePendingCode()
    if (code) {
      const { error } = await sb.auth.exchangeCodeForSession(code)
      if (error) console.warn('[gamdori] 로그인 마무리 실패', error.message)
    }
    const { data } = await sb.auth.getSession()
    return loadProfile(sb, data.session?.user)
  },

  async signInWithGoogle() {
    const sb = await getSupabase()
    rememberReturn()
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname },
    })
    if (error) throw new Error('로그인 화면을 열지 못했어요. 잠시 후 다시 시도해 주세요.')
    return new Promise(() => {}) // 곧 구글 화면으로 이동
  },

  /** 닉네임 등록 + 프로필 생성 (한 계정에 한 번) */
  async registerNickname(nickname) {
    const nick = nickname.trim()
    if (!NICK_RULE.test(nick)) throw new Error('닉네임은 2~12자의 한글·영문·숫자·_ 만 쓸 수 있어요.')
    const sb = await getSupabase()
    const { data } = await sb.auth.getSession()
    const u = data.session?.user
    if (!u) throw new Error('먼저 로그인해 주세요.')
    const { error } = await sb.from('profiles').insert({ id: u.id, nickname: nick })
    if (error) {
      if (error.code === '23505') {
        throw new Error(error.message.includes('profiles_pkey') ? '이미 닉네임을 정했어요.' : '이미 쓰는 닉네임이에요. 다른 닉네임을 입력해 주세요.')
      }
      if (error.code === '23514') throw new Error('닉네임은 2~12자의 한글·영문·숫자·_ 만 쓸 수 있어요.')
      throw new Error('닉네임을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
    return { id: u.id, email: u.email, nickname: nick, needsNickname: false }
  },

  async signOut() {
    const sb = await getSupabase()
    await sb.auth.signOut()
  },

  onChange(cb) {
    let off = () => {}
    let stopped = false
    getSupabase().then((sb) => {
      if (stopped) return
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') return cb(null)
        if (event !== 'SIGNED_IN' && event !== 'USER_UPDATED') return
        // 콜백 안에서 바로 Supabase 를 호출하면 잠금이 걸릴 수 있어 다음 틱으로 미룸
        setTimeout(async () => {
          try {
            cb(await loadProfile(sb, session?.user))
          } catch {
            // 프로필을 읽지 못해도 로그아웃 상태로 바꾸지 않음 (일시적인 네트워크 오류 등)
          }
        })
      })
      off = () => data.subscription.unsubscribe()
    })
    return () => { stopped = true; off() }
  },
}
