import { createClient } from '@supabase/supabase-js'

let client = null

/** Supabase 클라이언트는 실제로 필요할 때 한 번만 만듭니다. */
export function getSupabase() {
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 .env 에 설정해 주세요.')
  }
  client = createClient(url, key)
  return client
}
