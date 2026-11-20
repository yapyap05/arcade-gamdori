<script setup>
/** 모든 게임 공통 타이머 막대 — GameScreen 의 timer prop 으로 사용 */
defineProps({ pct: { type: Number, default: 0 }, text: { type: String, default: '' }, label: { type: String, default: '' } })
</script>

<template>
  <div class="tb" role="timer" :aria-label="`${label} ${text}초`">
    <span v-if="label" class="lbl">{{ label }}</span>
    <div class="bar"><i :style="{ width: pct + '%' }" :class="{ low: pct < 30 }" /></div>
    <span class="t num">{{ text }}</span>
  </div>
</template>

<style scoped>
.tb { display: flex; align-items: center; gap: 10px; }
.lbl { flex: none; font-size: 12px; font-weight: 700; color: var(--muted); }
.bar { flex: 1; height: 10px; border-radius: 999px; overflow: hidden; background: var(--surface-2); border: var(--bw) solid var(--bc); }
.bar i { display: block; height: 100%; background: var(--accent); border-radius: 999px; transition: width 0.06s linear; }
.bar i.low { background: var(--danger); }
.t { flex: none; min-width: 36px; text-align: right; font-size: 14px; }
</style>
