import { getSupabase } from '../supabaseClient.js'

/**
 * "캐주얼 로그인" = 익명 로그인 + profiles 테이블(이메일/닉네임).
 *  - 비밀번호/메일 인증 없이 바로 시작할 수 있습니다.
 *  - 단, 이메일은 '인증되지 않은 연락처'라서 다른 기기에서 같은 계정으로 이어지지 않습니다.
 *  - 계정 연속성이 필요해지면 signIn 안에서 supabase.auth.signInWithOtp({ email })
 *    (매직링크)로 교체하세요. 화면 코드는 바뀌지 않습니다.
 */
export default {
  async getSession() {
    const sb = getSupabase()
    const { data } = await sb.auth.getSession()
    const uid = data.session?.user?.id
    if (!uid) return null
    const { data: p } = await sb.from('profiles').select('id,email,nickname').eq('id', uid).maybeSingle()
    return p || null
  },

  async signIn({ email, nickname }) {
    const sb = getSupabase()
    let { data: s } = await sb.auth.getSession()
    if (!s.session) {
      const { error } = await sb.auth.signInAnonymously()
      if (error) throw new Error(error.message)
      ;({ data: s } = await sb.auth.getSession())
    }
    const id = s.session.user.id
    const { data, error } = await sb
      .from('profiles')
      .upsert({ id, email, nickname }, { onConflict: 'id' })
      .select('id,email,nickname')
      .single()
    if (error) {
      if (error.code === '23505') throw new Error('이미 사용 중인 닉네임이에요.')
      throw new Error(error.message)
    }
    return data
  },

  async signOut() {
    await getSupabase().auth.signOut()
  }
}
