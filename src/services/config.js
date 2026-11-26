/**
 * Supabase 설정
 *
 * 1) 실제 Supabase: 프로젝트 루트 .env.local 에 아래 두 값 입력 (docs/supabase-setup.md 참고)
 *      VITE_SUPABASE_URL=https://<프로젝트ref>.supabase.co
 *      VITE_SUPABASE_ANON_KEY=<공개용 키 (anon 또는 publishable)>
 *    ⚠ service_role / secret 키는 절대 넣지 않아요.
 * 2) 값이 없으면 "오프라인 모드"(src/services/mock, 이 브라우저 localStorage)로 동작
 */
const env = import.meta.env

export const supabaseUrl = (env.VITE_SUPABASE_URL || '').trim()
export const supabaseKey = (env.VITE_SUPABASE_ANON_KEY || '').trim()

export const isSupabaseEnabled = /^https:\/\/\S+$/.test(supabaseUrl) && supabaseKey.length > 20
