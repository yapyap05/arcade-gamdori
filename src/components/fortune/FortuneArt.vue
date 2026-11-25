<script setup>
/**
 * 운세 도트 그림 표시
 * svg 는 src/fortune/art.js 가 만든 문자열만 받음 (사용자 입력이 들어가지 않으므로 v-html 안전)
 */
defineProps({
  svg: { type: String, required: true },
  label: { type: String, default: '' },
  reversed: { type: Boolean, default: false },
})
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <span class="fart" :class="{ rv: reversed }" :role="label ? 'img' : undefined" :aria-label="label || undefined" :aria-hidden="label ? undefined : 'true'" v-html="svg" />
</template>

<style scoped>
.fart { display: inline-grid; place-items: center; line-height: 0; }
.fart :deep(svg) { display: block; image-rendering: pixelated; max-width: 100%; height: auto; }
.rv :deep(svg) { transform: rotate(180deg); }
</style>
