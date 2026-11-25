import { isFirebaseEnabled } from './config'
import { mockAuth } from './mock/auth'
import { firebaseAuth } from './firebase/auth'

/**
 * AuthAdapter 인터페이스 (mock / firebase 동일)
 *  user = { id, email, nickname, needsNickname }
 *  getUser()                 -> user | null        (앱 시작 시 현재 로그인 상태)
 *  signInWithGoogle()        -> user | null        (null = 사용자가 창을 닫음)
 *  registerNickname(nick)    -> user               (첫 로그인 때 한 번, 중복이면 에러)
 *  signOut()
 *  onChange(cb)              -> unsubscribe 함수
 */
export const authService = isFirebaseEnabled ? firebaseAuth : mockAuth
