// @supabase/supabase-js 패키지가 아직 설치되지 않았을 때 vite.config.js 가 대신 연결해 주는 빈 모듈입니다.
// 터미널에서 `npm install` 을 하면 자동으로 진짜 패키지로 바뀝니다.
export function createClient() {
  throw new Error('@supabase/supabase-js 패키지가 설치되지 않았어요. 터미널에서 npm install 을 실행한 뒤 다시 시도해 주세요.')
}
