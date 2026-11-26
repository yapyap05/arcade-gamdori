import './services/supabase/redirect' // 구글 로그인 복귀 주소 정리 (라우터보다 먼저)
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useThemeStore } from './stores/theme'
import './assets/style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
useThemeStore()
useAuthStore().init()
app.mount('#app')
