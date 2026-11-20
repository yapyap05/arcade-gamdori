<script setup>
import PixelIcon from '../../components/PixelIcon.vue'
import { useGameCtx } from './context'

/**
 * 모든 게임 공통 상태 칩 + 종료 버튼
 * stats: [{ label, value }]  — value 가 hearts() 값이면 도트 하트로 표시
 */
defineProps({
  stats: { type: Array, default: () => [] },
  quit: { type: Boolean, default: true },
})
const emit = defineEmits(['quit'])
const ctx = useGameCtx()

const isLives = (v) => v && typeof v === 'object' && 'lives' in v
function onQuit() {
  ctx.quitting = true // 그만하기 → 이번 판 점수는 기록하지 않음
  emit('quit')
}
</script>

<template>
  <div class="hud">
    <div class="stats">
      <span v-for="s in stats" :key="s.label" class="chip">
        <small>{{ s.label }}</small>
        <span v-if="isLives(s.value)" class="lives" :aria-label="`${s.value.lives}개`">
          <PixelIcon v-for="n in s.value.max" :key="n" :name="n <= s.value.lives ? 'heart' : 'heart-empty'" :size="14" />
        </span>
        <b v-else class="num">{{ s.value }}</b>
      </span>
    </div>
    <button v-if="quit" type="button" class="btn btn-sm" @click="onQuit">그만하기</button>
  </div>
</template>

<style scoped>
.hud { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.stats { display: flex; gap: 6px; flex-wrap: wrap; }
.chip {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px;
  border-radius: 999px; background: var(--surface-2); border: var(--bw) solid var(--bc);
}
.chip small { color: var(--muted); font-weight: 700; font-size: 11px; }
.chip b { font-size: 14px; }
.lives { display: inline-flex; gap: 2px; }
.btn { flex: none; height: 30px; padding: 0 12px; font-size: 13px; }
</style>
