<script setup>
import FortuneArt from './FortuneArt.vue'

/**
 * 카드 고르기 (타로·화투·고스톱·오미쿠지 공통)
 * 고른 카드는 위로 올라오고, 다 고르면(done) 앞면으로 뒤집힘
 */
defineProps({
  n: { type: Number, required: true }, // 펼친 카드 수
  cnt: { type: Number, required: true }, // 골라야 할 장수
  back: { type: String, required: true }, // 뒷면 svg
  front: { type: Function, required: true }, // (자리 번호) → 앞면 svg
  selected: { type: Array, default: () => [] }, // 고른 자리 번호
  done: { type: Boolean, default: false },
})
const emit = defineEmits(['pick'])
</script>

<template>
  <div class="wrap">
    <p class="guide"><b class="num">{{ selected.length }}</b> / {{ cnt }}장 골랐어요</p>
    <div class="deck" :class="{ many: n > 12 }">
      <button
        v-for="i in n"
        :key="i"
        type="button"
        class="cb"
        :class="{ on: selected.includes(i - 1), flip: done && selected.includes(i - 1) }"
        :disabled="done || selected.includes(i - 1) || selected.length >= cnt"
        :aria-label="`${i}번째 카드`"
        @click="emit('pick', i - 1)"
      >
        <FortuneArt :svg="done && selected.includes(i - 1) ? front(i - 1) : back" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.wrap { display: flex; flex-direction: column; gap: 10px; }
.guide { margin: 0; text-align: center; font-size: 14px; }
.guide b { color: var(--accent); font-size: 18px; }
.deck { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; justify-items: center; padding-top: 8px; }
.deck.many { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.cb { padding: 0; border: 0; background: none; cursor: pointer; transition: transform 0.15s; touch-action: manipulation; }
.cb:disabled { cursor: default; }
.cb.on { transform: translateY(-8px); filter: drop-shadow(0 4px 0 var(--accent)); }
.cb.flip { transform: none; filter: none; animation: flip 0.35s ease; }
@keyframes flip { from { transform: rotateY(90deg); } to { transform: rotateY(0); } }
</style>
