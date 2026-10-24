import { isFirebaseEnabled } from './config'
import { mockAuth } from './mock/auth'
import { firebaseAuth } from './firebase/auth'

/**
 * AuthAdapter 인터페이스 (mock / firebase 동일)
 *  getUser()                    -> { id, email, nickname } | null
 *  signIn({ email, nickname })  -> { user } | { pending: true, message, method: 'link' | 'code' }
 *  verify({ email, code })      -> { user }   (method 'code' 일 때만)
 *  signOut()
 *  onChange(cb)                 -> unsubscribe 함수
 */
export const authService = isFirebaseEnabled ? firebaseAuth : mockAuth
