import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** .env 에 키가 없으면 false → 로컬 모드(localStorage)로 동작 */
export const isSupabaseEnabled = Boolean(url && key)

export const supabase = isSupabaseEnabled
  ? createClient(url, key, {
      auth: {
        // 해시 라우터(#/…)와 토큰(#access_token=…)이 충돌하지 않도록 PKCE(?code=…) 사용
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
