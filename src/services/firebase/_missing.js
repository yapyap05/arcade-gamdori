// firebase 패키지가 아직 설치되지 않았을 때 vite.config.js 가 대신 연결해 주는 빈 모듈입니다.
// 더미 모드에서는 이 모듈의 함수가 호출되지 않으므로 아무 일도 일어나지 않아요.
// 다음 주 Firebase 연결 때 `npm install` 을 하면 자동으로 진짜 패키지로 바뀝니다.
const missing = () => {
  throw new Error('firebase 패키지가 설치되지 않았어요. 터미널에서 npm install 을 실행한 뒤 다시 시도해 주세요.')
}
export const initializeApp = missing
export const getAuth = missing
export const getFirestore = missing
export default {}
