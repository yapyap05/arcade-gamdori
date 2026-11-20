<script setup>
import { ref, computed, watch } from 'vue'
import PixelIcon from './PixelIcon.vue'

/** 게임 튜토리얼 (단계형). 닫으면 'close' */
const props = defineProps({
  game: { type: Object, required: true },
  steps: { type: Array, default: () => [] },
})
const emit = defineEmits(['close'])
const i = ref(0)
watch(() => props.game.id, () => (i.value = 0))
const step = computed(() => props.steps[i.value])
const last = computed(() => i.value >= props.steps.length - 1)
const next = () => (last.value ? emit('close') : i.value++)
</script>

<template>
  <Teleport to="body">
    <div class="backdrop" @click.self="emit('close')" @keydown.esc="emit('close')">
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="tut-title">
        <div class="head">
          <PixelIcon :name="game.id" :size="48" />
          <div class="col">
            <span class="kicker">플레이 방법</span>
            <span class="game">{{ game.title }}</span>
          </div>
        </div>
        <div v-if="step" class="step">
          <h2 id="tut-title">{{ step.title }}</h2>
          <p>{{ step.body }}</p>
        </div>
        <div class="dots" aria-hidden="true"><i v-for="(s, n) in steps" :key="n" :class="{ on: n === i }" /></div>
        <div class="actions">
          <button v-if="!last" type="button" class="btn ghost" @click="emit('close')">건너뛰기</button>
          <button v-else-if="i > 0" type="button" class="btn ghost" @click="i--">이전</button>
          <button type="button" class="btn btn-primary" @click="next">{{ last ? '시작하기' : '다음' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 20px; background: var(--scrim); }
.sheet {
  width: min(380px, 100%); display: flex; flex-direction: column; gap: 16px; padding: 22px;
  border-radius: var(--r-lg); background: var(--surface); color: var(--text);
  border: var(--bw) solid var(--bc); box-shadow: var(--sh); font-family: var(--font-body);
}
.head { display: flex; align-items: center; gap: 12px; }
.col { display: flex; flex-direction: column; }
.kicker { font-size: 12px; font-weight: 700; color: var(--muted); }
.game { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 18px; }
.step { min-height: 104px; }
h2 { margin: 0 0 6px; font-family: var(--font-display); font-weight: var(--display-weight); font-size: 22px; }
p { margin: 0; font-size: 15px; line-height: 1.6; }
.dots { display: flex; gap: 6px; justify-content: center; }
.dots i { width: 8px; height: 8px; border-radius: 999px; background: var(--surface-2); border: var(--bw) solid var(--bc); }
.dots i.on { background: var(--accent); border-color: var(--accent); }
.actions { display: flex; gap: 10px; }
.actions .btn { flex: 1; height: 50px; }
.ghost { background: var(--surface); }
</style>
