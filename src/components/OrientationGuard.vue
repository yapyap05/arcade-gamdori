<script setup>
import Icon from './Icon.vue'
</script>

<template>
  <!-- 표시 여부는 App.vue (useLandscapeLock)가 결정 -->
  <div class="guard" role="alertdialog" aria-modal="true" aria-labelledby="guard-title">
    <div class="box">
      <span class="ico"><Icon name="rotate" /></span>
      <p id="guard-title" class="title">세로 모드로 플레이해 주세요</p>
      <p class="sub">기기를 세로로 돌리면 바로 이어서 할 수 있어요.</p>
    </div>
  </div>
</template>

<style scoped>
.guard {
  position: fixed; inset: 0; z-index: 100;
  display: grid; place-items: center; padding: 24px;
  background: var(--scrim);
}
.box {
  display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
  max-width: 340px; padding: 28px 24px; border-radius: var(--r-lg);
  background: var(--surface); color: var(--text); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
}
.ico {
  width: 56px; height: 56px; border-radius: 999px; display: grid; place-items: center;
  background: var(--accent); color: var(--accent-text);
  animation: tilt 1.6s ease-in-out infinite;
}
.ico :deep(svg) { width: 28px; height: 28px; }
.title { margin: 4px 0 0; font-family: var(--font-display); font-weight: var(--display-weight); font-size: 20px; }
.sub { margin: 0; font-size: 14px; color: var(--muted); }
@keyframes tilt { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-90deg); } }
</style>
