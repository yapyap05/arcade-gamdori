<script setup>
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
const auth = useAuthStore()
const theme = useThemeStore()
</script>

<template>
  <header class="bar">
    <div class="container inner">
      <RouterLink to="/" class="logo">🎮 <b>Gamdori</b></RouterLink>
      <nav class="nav">
        <RouterLink to="/" class="link">게임</RouterLink>
        <RouterLink to="/ranking" class="link">랭킹</RouterLink>
      </nav>
      <div class="right">
        <button class="btn btn-sm icon" :aria-label="theme.theme === 'dark' ? '밝은 테마로 전환' : '어두운 테마로 전환'" @click="theme.toggle()">
          {{ theme.theme === 'dark' ? '☀️' : '🌙' }}
        </button>
        <template v-if="auth.isLoggedIn">
          <span class="nick">{{ auth.user.nickname }}</span>
          <button class="btn btn-sm" @click="auth.signOut()">로그아웃</button>
        </template>
        <button v-else class="btn btn-sm btn-cta" @click="auth.openLogin()">로그인</button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.bar { position: sticky; top: 0; z-index: 20; background: var(--surface); box-shadow: 0 1px 0 var(--line); }
.inner { display: flex; align-items: center; gap: 24px; height: 60px; }
.logo { font-size: 20px; display: flex; gap: 6px; align-items: center; }
.nav { display: flex; gap: 4px; flex: 1; }
.link { padding: 8px 14px; border-radius: 999px; font-weight: 600; color: var(--muted); }
.link:hover { background: var(--surface-2); }
.link.router-link-exact-active { background: var(--accent); color: var(--accent-text); }
.right { display: flex; align-items: center; gap: 10px; }
.nick { font-weight: 700; font-size: 14px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.icon { width: 36px; padding: 6px 0; }
@media (max-width: 560px) { .nick { display: none; } .inner { gap: 8px; } }
</style>
