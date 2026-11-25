<script setup>
import { ANIMALS } from '../../fortune/data'
import { animal } from '../../fortune/art'
import FortuneArt from './FortuneArt.vue'

/** 12띠 캐릭터 고르기 */
defineProps({ modelValue: { type: Number, default: null } })
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="animals" role="radiogroup" aria-label="띠 고르기">
    <button
      v-for="(n, i) in ANIMALS"
      :key="n"
      type="button"
      class="ani"
      :class="{ on: modelValue === i }"
      role="radio"
      :aria-checked="modelValue === i"
      @click="emit('update:modelValue', i)"
    >
      <FortuneArt :svg="animal(i, 40)" />
      <span>{{ n }}</span>
    </button>
  </div>
</template>

<style scoped>
.animals { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.ani {
  display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 0;
  border-radius: var(--r-btn2); border: var(--bw) solid var(--bc); background: var(--surface); color: var(--text);
  font-size: 12px; font-weight: 700; box-shadow: var(--sh-sm);
}
.ani.on { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
</style>
