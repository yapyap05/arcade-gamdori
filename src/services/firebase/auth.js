import { getFirebase } from './client'
import { NICK_RULE, nickKey } from '../nickname'

/**
 * Firebase 로그인 (구글)
 *  - 로그인과 프로필(닉네임) 생성을 분리: 로그인만으로는 아무것도 쓰지 않음 → 프로필 중복 생성 충돌 없음
 *  - 첫 로그인이면 needsNickname: true → registerNickname() 으로 닉네임 예약 + 프로필 생성을 한 번에(트랜잭션)
 * user = { id, email, nickname, needsNickname }
 */
async function loadProfile(fbUser) {
  if (!fbUser) return null
  const { db, fsMod } = await getFirebase()
  const snap = await fsMod.getDoc(fsMod.doc(db, 'profiles', fbUser.uid))
  const nickname = snap.exists() ? snap.data().nickname : null
  return { id: fbUser.uid, email: fbUser.email, nickname, needsNickname: !nickname }
}

function friendly(e) {
  const code = e?.code || ''
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null // 사용자가 창을 닫음
  if (code === 'auth/popup-blocked') return '팝업이 차단됐어요. 브라우저에서 팝업을 허용한 뒤 다시 눌러 주세요.'
  if (code === 'auth/unauthorized-domain') return '이 주소에서는 로그인할 수 없어요. (Firebase 승인된 도메인 설정 필요)'
  if (code === 'auth/network-request-failed') return '네트워크 연결을 확인해 주세요.'
  return '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.'
}

export const firebaseAuth = {
  async getUser() {
    const { auth, authMod } = await getFirebase()
    const fbUser = await new Promise((resolve) => {
      const off = authMod.onAuthStateChanged(auth, (u) => { off(); resolve(u) })
    })
    return loadProfile(fbUser)
  },

  async signInWithGoogle() {
    const { auth, authMod } = await getFirebase()
    try {
      const cred = await authMod.signInWithPopup(auth, new authMod.GoogleAuthProvider())
      return await loadProfile(cred.user)
    } catch (e) {
      const msg = friendly(e)
      if (!msg) return null
      throw new Error(msg)
    }
  },

  /** 닉네임 예약 + 프로필 생성 (한 계정에 한 번) */
  async registerNickname(nickname) {
    const nick = nickname.trim()
    if (!NICK_RULE.test(nick)) throw new Error('닉네임은 2~12자의 한글·영문·숫자·_ 만 쓸 수 있어요.')
    const { auth, db, fsMod } = await getFirebase()
    const u = auth.currentUser
    if (!u) throw new Error('먼저 로그인해 주세요.')
    const { doc, runTransaction, serverTimestamp } = fsMod
    const profileRef = doc(db, 'profiles', u.uid)
    const nickRef = doc(db, 'nicknames', nickKey(nick))
    await runTransaction(db, async (tx) => {
      const [p, n] = await Promise.all([tx.get(profileRef), tx.get(nickRef)])
      if (p.exists()) throw new Error('이미 닉네임을 정했어요.')
      if (n.exists()) throw new Error('이미 쓰는 닉네임이에요. 다른 닉네임을 입력해 주세요.')
      tx.set(nickRef, { uid: u.uid })
      tx.set(profileRef, { nickname: nick, createdAt: serverTimestamp() })
    })
    return { id: u.uid, email: u.email, nickname: nick, needsNickname: false }
  },

  async signOut() {
    const { auth, authMod } = await getFirebase()
    await authMod.signOut(auth)
  },

  onChange(cb) {
    let off = () => {}
    let stopped = false
    getFirebase().then(({ auth, authMod }) => {
      if (stopped) return
      off = authMod.onAuthStateChanged(auth, async (u) => {
        if (!u) return cb(null)
        try {
          cb(await loadProfile(u))
        } catch {
          // 프로필을 읽지 못해도 로그아웃 상태로 바꾸지 않음 (일시적인 네트워크 오류 등)
        }
      })
    })
    return () => { stopped = true; off() }
  },
}
