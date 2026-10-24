import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))

// firebase 패키지가 설치돼 있지 않으면 빈 모듈로 연결 → 더미 모드에서 import 에러가 나지 않게 함
// (npm install 로 firebase 를 설치하면 이 우회는 자동으로 꺼집니다)
const hasFirebase = existsSync(here('./node_modules/firebase/package.json'))
if (!hasFirebase) {
  console.log('[gamdori] firebase 패키지가 없어 더미 모드로 실행합니다. (연결할 때 npm install 필요)')
}

// base './' + hash router => GitHub Pages(yapyap05.github.io/arcade-gamdori/)에서 그대로 동작
export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: hasFirebase
      ? []
      : [{ find: /^firebase\/(app|auth|firestore)$/, replacement: here('./src/services/firebase/_missing.js') }],
  },
})
