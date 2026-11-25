/**
 * Firebase 설정
 *
 * 1) 에뮬레이터(내 PC 연습용):  npm run emulators  →  npm run dev:emu
 *    실제 키 없이 연습용 프로젝트 'demo-gamdori' 로 동작 (데이터는 내 PC 에만)
 * 2) 실제 Firebase: 프로젝트 루트 .env.local 에 VITE_FIREBASE_* 값 입력 (docs/firebase-setup.md 참고)
 * 3) 둘 다 아니면 "더미 모드"(src/services/mock, 이 브라우저 localStorage)로 동작
 */
const env = import.meta.env

/** npm run dev:emu (vite --mode emulator) 로 실행했을 때 */
export const isEmulator = env.MODE === 'emulator'

export const firebaseConfig = isEmulator
  ? { apiKey: 'demo-key', authDomain: 'demo-gamdori.firebaseapp.com', projectId: 'demo-gamdori', appId: 'demo-app' }
  : {
      apiKey: env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT_ID.firebaseapp.com',
      projectId: env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT_ID.appspot.com',
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
      appId: env.VITE_FIREBASE_APP_ID || 'YOUR_APP_ID',
    }

const filled = (v) => typeof v === 'string' && v.trim() !== '' && !v.startsWith('YOUR_')

export const isFirebaseEnabled = isEmulator || ['apiKey', 'projectId', 'appId'].every((k) => filled(firebaseConfig[k]))
