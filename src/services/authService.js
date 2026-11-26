import { isSupabaseEnabled } from './config'
import { mockAuth } from './mock/auth'
import { supabaseAuth } from './supabase/auth'

/**
 * AuthAdapter 인터페이스 (mock / supabase 동일)
 *  user = { id, email, nickname, needsNickname }
 *  getUser()                 -> user | null        (앱 시작 시 현재 로그인 상태)
 *  signInWithGoogle()        -> user | null        (null = 사용자가 취소. supabase 는 구글 화면으로 이동)
 *  registerNickname(nick)    -> user               (첫 로그인 때 한 번, 중복이면 에러)
 *  signOut()
 *  onChange(cb)              -> unsubscribe 함수
 */
export const authService = isSupabaseEnabled ? supabaseAuth : mockAuth
