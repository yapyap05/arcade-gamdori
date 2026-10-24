<script setup>
import AppHeader from './components/AppHeader.vue'
import LoginModal from './components/LoginModal.vue'
</script>

<template>
  <AppHeader />
  <main class="container page"><RouterView /></main>
  <footer class="container foot muted">Gamdori Arcade · 당신의 시간을 없애 드림</footer>
  <LoginModal />
</template>

<style scoped>
.page { padding-top: 24px; padding-bottom: 48px; min-height: 70vh; }
.foot { padding: 24px 20px 40px; font-size: 13px; text-align: center; }
</style>
