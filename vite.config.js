import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))

// @supabase/supabase-js 가 설치돼 있지 않으면 빈 모듈로 연결 → 더미 모드에서 import 에러가 나지 않게 함
// (npm install 로 설치하면 이 우회는 자동으로 꺼집니다)
const hasSupabase = existsSync(here('./node_modules/@supabase/supabase-js/package.json'))
if (!hasSupabase) {
  console.log('[gamdori] @supabase/supabase-js 패키지가 없어 더미 모드로 실행합니다. (연결할 때 npm install 필요)')
}

// base './' + hash router => 정적 호스팅(Render 등) 하위 경로에서도 그대로 동작
export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: hasSupabase
      ? []
      : [{ find: /^@supabase\/supabase-js$/, replacement: here('./src/services/supabase/_missing.js') }],
  },
})
