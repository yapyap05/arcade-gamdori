import { isSupabaseEnabled } from './config'
import { mockAuth } from './mock/auth'
import { supabaseAuth } from './supabase/auth'

/**
 * AuthAdapter 인터페이스 (mock / supabase 동일)
 *  user = { id, email, nickname, needsNickname }
 *  getUser()                 -> user | null        (앱 시작 시 현재 로그인 상태)
 *  signUp({ email, password, nickname }) -> user   (가입 후 바로 로그인, 중복 이메일·닉네임이면 에러)
 *  signIn({ email, password })           -> user   (틀리면 에러)
 *  registerNickname(nick)    -> user               (닉네임 없이 남은 계정만, 중복이면 에러)
 *  signOut()
 *  onChange(cb)              -> unsubscribe 함수
 */
export const authService = isSupabaseEnabled ? supabaseAuth : mockAuth
