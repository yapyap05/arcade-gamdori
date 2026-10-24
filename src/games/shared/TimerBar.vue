<script setup>
defineProps({ pct: { type: Number, default: 0 }, text: { type: String, default: '' }, label: { type: String, default: '' } })
</script>

<template>
  <div class="tb">
    <div class="bar"><i :style="{ width: pct + '%' }" :class="{ low: pct < 30 }" /></div>
    <span class="t">{{ label }} {{ text }}s</span>
  </div>
</template>

<style scoped>
.tb { display: flex; align-items: center; gap: 12px; }
.bar { flex: 1; height: 10px; background: var(--surface-2); border-radius: 999px; overflow: hidden; }
.bar i { display: block; height: 100%; background: var(--accent); border-radius: 999px; transition: width 0.06s linear; }
.bar i.low { background: var(--danger); }
.t { min-width: 84px; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
</style>
