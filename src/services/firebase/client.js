import { firebaseConfig, isEmulator } from '../config'

let cached
/** Firebase SDK를 처음 쓸 때만 불러온다 → 더미 모드에서는 번들에 영향 없음 */
export function getFirebase() {
  cached ||= (async () => {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ])
    const app = initializeApp(firebaseConfig)
    const auth = authMod.getAuth(app)
    const db = fsMod.getFirestore(app)
    if (isEmulator) {
      // 같은 Wi-Fi 의 휴대폰에서 접속해도 되도록 지금 접속한 호스트의 에뮬레이터로 연결
      const host = location.hostname || '127.0.0.1'
      authMod.connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
      fsMod.connectFirestoreEmulator(db, host, 8080)
    }
    return { app, auth, db, authMod, fsMod }
  })()
  return cached
}
