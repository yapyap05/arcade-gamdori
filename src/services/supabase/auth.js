import { getSupabase } from './client'
import { NICK_RULE } from '../nickname'

/**
 * Supabase 로그인 (이메일 + 비밀번호)
 *  - 회원가입: 닉네임 중복 확인 → 계정 생성 → 프로필(닉네임) 저장 → 바로 로그인
 *    (Supabase 설정에서 Confirm email 을 꺼야 바로 로그인됨)
 *  - 닉네임 저장만 실패한 계정은 로그인 때 가입 시 닉네임으로 다시 시도, 그래도 없으면 needsNickname
 * user = { id, email, nickname, needsNickname }
 */
const NICK_MSG = '닉네임은 2~12자의 한글·영문·숫자·_ 만 쓸 수 있어요.'
const DUP_NICK = '이미 쓰는 닉네임이에요. 다른 닉네임을 입력해 주세요.'

function authError(e) {
  const m = (e?.message || '').toLowerCase()
  if (m.includes('invalid login credentials')) return new Error('이메일 또는 비밀번호가 맞지 않아요.')
  if (m.includes('already registered') || m.includes('already exists')) return new Error('이미 가입한 이메일이에요. 로그인해 주세요.')
  if (m.includes('password')) return new Error('비밀번호는 6자 이상으로 입력해 주세요.')
  if (m.includes('email not confirmed')) return new Error('메일 인증이 필요해요. Supabase 설정에서 Confirm email 을 꺼 주세요.')
  if (m.includes('invalid') && m.includes('email')) return new Error('이메일 주소를 다시 확인해 주세요.')
  if (m.includes('rate limit') || e?.status === 429) return new Error('요청이 너무 많아요. 잠시 후 다시 시도해 주세요.')
  return new Error('로그인하지 못했어요. 잠시 후 다시 시도해 주세요.')
}

async function insertProfile(sb, id, nick) {
  const { error } = await sb.from('profiles').insert({ id, nickname: nick })
  if (!error) return
  if (error.code === '23505') throw new Error(error.message.includes('profiles_pkey') ? '이미 닉네임을 정했어요.' : DUP_NICK)
  if (error.code === '23514') throw new Error(NICK_MSG)
  throw new Error('닉네임을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
}

async function loadProfile(sb, sbUser) {
  if (!sbUser) return null
  const { data, error } = await sb.from('profiles').select('nickname').eq('id', sbUser.id).maybeSingle()
  if (error) throw error
  let nickname = data?.nickname ?? null
  // 가입 때 닉네임 저장이 실패했으면 한 번 더 시도
  const wanted = sbUser.user_metadata?.nickname
  if (!nickname && wanted && NICK_RULE.test(wanted)) {
    try {
      await insertProfile(sb, sbUser.id, wanted)
      nickname = wanted
    } catch {
      // 다른 탭·로그인 이벤트가 먼저 저장했을 수 있음 → 다시 읽고, 그래도 없으면 닉네임 정하기 창으로
      const { data: again } = await sb.from('profiles').select('nickname').eq('id', sbUser.id).maybeSingle()
      nickname = again?.nickname ?? null
    }
  }
  return { id: sbUser.id, email: sbUser.email, nickname, needsNickname: !nickname }
}

export const supabaseAuth = {
  async getUser() {
    const sb = await getSupabase()
    const { data } = await sb.auth.getSession()
    return loadProfile(sb, data.session?.user)
  },

  async signUp({ email, password, nickname }) {
    const nick = nickname.trim()
    if (!NICK_RULE.test(nick)) throw new Error(NICK_MSG)
    const sb = await getSupabase()
    const { data: ok, error: e1 } = await sb.rpc('nickname_available', { p_nickname: nick })
    if (e1) throw new Error('닉네임을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.')
    if (!ok) throw new Error(DUP_NICK)
    const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { data: { nickname: nick } } })
    if (error) throw authError(error)
    // 이미 가입한 이메일이면 identities 가 비어서 옴
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('이미 가입한 이메일이에요. 로그인해 주세요.')
    if (!data.session) throw new Error('가입 메일을 확인해 주세요. (Supabase 설정에서 Confirm email 을 끄면 바로 로그인돼요)')
    return loadProfile(sb, data.session.user)
  },

  async signIn({ email, password }) {
    const sb = await getSupabase()
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw authError(error)
    return loadProfile(sb, data.user)
  },

  /** 닉네임 등록 (닉네임 없이 남은 계정용) */
  async registerNickname(nickname) {
    const nick = nickname.trim()
    if (!NICK_RULE.test(nick)) throw new Error(NICK_MSG)
    const sb = await getSupabase()
    const { data } = await sb.auth.getSession()
    const u = data.session?.user
    if (!u) throw new Error('먼저 로그인해 주세요.')
    await insertProfile(sb, u.id, nick)
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
