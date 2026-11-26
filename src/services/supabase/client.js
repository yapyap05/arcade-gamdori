import { supabaseUrl, supabaseKey } from '../config'

let cached
/** Supabase SDK를 처음 쓸 때만 불러온다 → 오프라인 모드에서는 번들에 영향 없음 */
export function getSupabase() {
  cached ||= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(supabaseUrl, supabaseKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // 해시 라우터와 충돌하지 않게 redirect.js 에서 직접 처리
        storageKey: 'gamdori:auth',
      },
    }),
  )
  return cached
}
