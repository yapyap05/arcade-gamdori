<script setup>
import { watch, onBeforeUnmount } from 'vue'
import GameHeader from './GameHeader.vue'
import TimerBar from './TimerBar.vue'
import PixelIcon from '../../components/PixelIcon.vue'
import { useGameCtx } from './context'

/**
 * 모든 게임 공통 레이아웃
 *   [상태 칩 + 그만하기]  ← stats
 *   [타이머 막대]          ← timer { pct, text, label }
 *   [게임판]               ← 기본 슬롯 (+ toast 피드백)
 *   [조작 버튼]            ← controls 슬롯
 *   + 시작/종료 카드 (시작 단계 선택은 캐주얼 또는 freeStage 일 때만)
 */
const props = defineProps({
  status: { type: String, default: 'idle' }, // idle | playing | over
  title: String,
  desc: String, // (호환용, 표시하지 않음 — 설명은 튜토리얼에서)
  score: { type: Number, default: 0 },
  summary: String,
  mode: { type: String, default: 'casual' },
  stages: { type: Array, default: null },
  stage: { type: Number, default: 0 },
  freeStage: { type: Boolean, default: false },
  stageLabel: { type: String, default: '시작 단계' },
  stats: { type: Array, default: null },
  timer: { type: Object, default: null },
  toast: { type: String, default: '' },
  quit: { type: Boolean, default: true },
})
const emit = defineEmits(['start', 'update:stage', 'quit'])
const ctx = useGameCtx()
const showStage = () => props.stages && (props.mode === 'casual' || props.freeStage)

watch(() => props.status, (s) => {
  ctx.playing = s === 'playing'
  if (s !== 'playing') ctx.paused = false
}, { immediate: true })
onBeforeUnmount(() => { ctx.playing = false })

function start() {
  ctx.quitting = false
  emit('start')
}
</script>

<template>
  <div class="gs">
    <GameHeader v-if="stats" :stats="stats" :quit="quit && status === 'playing'" @quit="emit('quit')" />
    <TimerBar v-if="timer" :pct="timer.pct" :text="timer.text" :label="timer.label" />
    <div class="body">
      <slot />
      <p v-if="toast" class="toast" role="status">{{ toast }}</p>
    </div>
    <div v-if="$slots.controls" class="controls"><slot name="controls" /></div>

    <div v-if="status !== 'playing'" class="overlay">
      <div class="card">
        <PixelIcon v-if="ctx.game" :name="ctx.game.id" :size="56" />
        <h2>{{ status === 'over' ? '게임 종료' : title }}</h2>
        <template v-if="status === 'over'">
          <p class="big num">{{ score.toLocaleString() }}<small>점</small></p>
          <p v-if="summary" class="sub">{{ summary }}</p>
        </template>

        <label v-if="showStage()" class="opt">
          <span>{{ stageLabel }}</span>
          <select :value="stage" @change="emit('update:stage', Number($event.target.value))">
            <option v-for="(s, i) in stages" :key="i" :value="i">{{ s }}</option>
          </select>
        </label>
        <slot name="options" />

        <button type="button" class="btn btn-primary start" @click="start">{{ status === 'over' ? '다시 하기' : '시작' }}</button>
        <p class="mode">{{ mode === 'competitive' ? '경쟁 모드' : '캐주얼 모드' }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gs { position: relative; display: flex; flex-direction: column; gap: 12px; min-height: 420px; }
.body { position: relative; flex: 1; display: flex; flex-direction: column; justify-content: center; }
.controls { display: flex; flex-direction: column; gap: 10px; }
.toast {
  position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); z-index: 3; margin: 0;
  padding: 6px 14px; border-radius: 999px; white-space: nowrap; pointer-events: none;
  background: var(--text); color: var(--bg); font-size: 14px; font-weight: 700;
}
.overlay {
  position: absolute; inset: -4px; z-index: 5; border-radius: var(--r-md);
  display: grid; place-items: center; padding: 16px; background: var(--scrim);
}
.card {
  width: min(320px, 100%); display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center;
  padding: 22px 20px; border-radius: var(--r-lg);
  background: var(--surface); color: var(--text); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
}
h2 { margin: 2px 0 0; font-family: var(--font-display); font-weight: var(--display-weight); font-size: 24px; }
.big { margin: 0; font-size: 40px; line-height: 1.1; }
.big small { font-size: 16px; margin-left: 2px; color: var(--muted); }
.sub { margin: 0; font-size: 14px; color: var(--muted); }
.opt { display: flex; flex-direction: column; gap: 6px; width: 100%; font-size: 12px; font-weight: 700; color: var(--muted); text-align: left; }
.opt select {
  height: 44px; padding: 0 12px; border-radius: var(--r-btn2); border: var(--bw) solid var(--bc);
  background: var(--bg); color: var(--text); font-size: 15px; font-weight: 600;
}
.start { width: 100%; height: 52px; font-size: 17px; margin-top: 4px; }
.mode { margin: 0; font-size: 12px; color: var(--muted); }
</style>
