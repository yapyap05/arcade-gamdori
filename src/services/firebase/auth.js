import { getFirebase } from './client'

const EMAIL_KEY = 'gamdori:emailForSignIn'
const NICK_KEY = 'gamdori:pendingNickname'
const nickId = (nick) => encodeURIComponent(nick.toLowerCase()) // 문서 ID에 '/' 금지

// 메일의 로그인 링크로 돌아왔을 때 로그인 마무리
async function completeEmailLink() {
  const { auth, authMod } = await getFirebase()
  if (!authMod.isSignInWithEmailLink(auth, location.href)) return
  const email = localStorage.getItem(EMAIL_KEY) || window.prompt('로그인을 요청할 때 사용한 이메일을 입력해 주세요')
  try {
    if (email) {
      await authMod.signInWithEmailLink(auth, email, location.href)
      localStorage.removeItem(EMAIL_KEY)
    }
  } finally {
    history.replaceState(null, '', location.origin + location.pathname + location.hash) // ?oobCode=… 제거
  }
}

// profiles/{uid} 가 없으면 만들고, 닉네임 중복이면 #코드를 붙인다
async function loadProfile(fbUser) {
  if (!fbUser) return null
  const { db, fsMod } = await getFirebase()
  const { doc, getDoc, runTransaction, serverTimestamp } = fsMod
  const profileRef = doc(db, 'profiles', fbUser.uid)
  const snap = await getDoc(profileRef)
  if (snap.exists()) return { id: fbUser.uid, email: fbUser.email, nickname: snap.data().nickname }

  const wanted = (localStorage.getItem(NICK_KEY) || fbUser.email?.split('@')[0] || 'player').trim().slice(0, 12)
  const nickname = await runTransaction(db, async (tx) => {
    let nick = wanted
    let nickRef = doc(db, 'nicknames', nickId(nick))
    let taken = await tx.get(nickRef)
    if (taken.exists() && taken.data().uid !== fbUser.uid) {
      nick = wanted.slice(0, 7) + '#' + fbUser.uid.slice(0, 4)
      nickRef = doc(db, 'nicknames', nickId(nick))
      taken = await tx.get(nickRef)
      if (taken.exists() && taken.data().uid !== fbUser.uid) throw new Error('닉네임을 만들지 못했어요. 다른 닉네임으로 시도해 주세요.')
    }
    tx.set(nickRef, { uid: fbUser.uid })
    tx.set(profileRef, { nickname: nick, createdAt: serverTimestamp() })
    return nick
  })
  localStorage.removeItem(NICK_KEY)
  return { id: fbUser.uid, email: fbUser.email, nickname }
}

export const firebaseAuth = {
  async getUser() {
    await completeEmailLink()
    const { auth, authMod } = await getFirebase()
    const fbUser = await new Promise((resolve) => {
      const off = authMod.onAuthStateChanged(auth, (u) => { off(); resolve(u) })
    })
    return loadProfile(fbUser)
  },

  // 비밀번호 없는 이메일 링크 로그인. 닉네임은 첫 로그인 때 프로필에 저장된다.
  async signIn({ email, nickname }) {
    const { auth, authMod } = await getFirebase()
    await authMod.sendSignInLinkToEmail(auth, email, {
      url: location.origin + location.pathname,
      handleCodeInApp: true,
    })
    localStorage.setItem(EMAIL_KEY, email)
    localStorage.setItem(NICK_KEY, nickname)
    return { pending: true, method: 'link', message: `${email} 로 로그인 링크를 보냈어요.` }
  },

  async verify() {
    throw new Error('Firebase는 메일의 로그인 링크를 눌러 주세요.')
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
      off = authMod.onAuthStateChanged(auth, async (u) => cb(await loadProfile(u).catch(() => null)))
    })
    return () => { stopped = true; off() }
  },
}
