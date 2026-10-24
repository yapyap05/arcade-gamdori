/**
 * Firebase 설정
 *
 * Firebase 가입 → 프로젝트 생성 → 웹 앱 추가 후 나오는 firebaseConfig 값을
 *   A) 프로젝트 루트의 .env.local 에 VITE_FIREBASE_* 로 넣거나  (권장)
 *   B) 아래 'YOUR_...' 자리에 직접 붙여 넣으세요.
 *
 * 값이 비어 있거나 YOUR_ 로 시작하면 자동으로 "더미 모드"(src/services/mock, localStorage)로 동작합니다.
 * 설정만 채우면 코드 수정 없이 실제 Firebase(로그인 + Firestore 랭킹)로 전환됩니다.
 */
const env = import.meta.env

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
  appId: env.VITE_FIREBASE_APP_ID || 'YOUR_APP_ID',
}

const filled = (v) => typeof v === 'string' && v.trim() !== '' && !v.startsWith('YOUR_')

export const isFirebaseEnabled = ['apiKey', 'projectId', 'appId'].every((k) => filled(firebaseConfig[k]))
