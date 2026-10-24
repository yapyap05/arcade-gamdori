<script setup>
defineProps({
  stats: { type: Array, default: () => [] },
  quit: { type: Boolean, default: true },
})
defineEmits(['quit'])
</script>

<template>
  <div class="hud">
    <div class="stats">
      <span v-for="s in stats" :key="s.label" class="chip"><small>{{ s.label }}</small><b>{{ s.value }}</b></span>
    </div>
    <button v-if="quit" class="btn btn-sm" @click="$emit('quit')">종료</button>
  </div>
</template>

<style scoped>
.hud { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.stats { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { display: inline-flex; align-items: baseline; gap: 6px; background: var(--surface-2); padding: 6px 12px; border-radius: 999px; }
.chip small { color: var(--muted); font-weight: 700; font-size: 12px; }
.chip b { font-variant-numeric: tabular-nums; }
</style>
