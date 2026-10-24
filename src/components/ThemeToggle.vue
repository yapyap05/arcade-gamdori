<script setup>
import { useThemeStore } from '../stores/theme'
const theme = useThemeStore()
</script>

<template>
  <button
    class="toggle"
    type="button"
    :aria-label="theme.theme === 'dark' ? '밝은 테마로 전환' : '어두운 테마로 전환'"
    :title="theme.theme === 'dark' ? '밝은 테마' : '어두운 테마'"
    @click="theme.toggle()"
  >
    <span aria-hidden="true">{{ theme.theme === 'dark' ? '☀️' : '🌙' }}</span>
  </button>
</template>

<style scoped>
.toggle {
  width: 40px; height: 40px; border-radius: 50%; border: 0;
  background: var(--surface-2); font-size: 1.1rem; display: grid; place-items: center;
}
.toggle:hover { filter: brightness(1.12); }
</style>
