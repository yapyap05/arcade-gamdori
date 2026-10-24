import { firebaseConfig } from '../config'

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
    return { app, auth: authMod.getAuth(app), db: fsMod.getFirestore(app), authMod, fsMod }
  })()
  return cached
}
