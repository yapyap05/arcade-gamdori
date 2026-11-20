<script setup>
import { onBeforeUnmount } from 'vue'
import Icon from '../../components/Icon.vue'
import { useGameCtx } from './context'

/**
 * 공통 터치 조작 버튼
 * buttons: [{ id, icon, label, repeat?, area? }]
 *   repeat : 누르고 있으면 반복 입력 (처음 170ms 뒤부터 50ms 간격)
 *   area   : layout 이 'dpad' 일 때 'up' | 'left' | 'right' | 'down'
 * layout : 'grid' (3열) | 'dpad' (십자)
 */
defineProps({
  buttons: { type: Array, required: true },
  layout: { type: String, default: 'grid' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['press'])
const ctx = useGameCtx()

let delay = 0, every = 0
function stop() { clearTimeout(delay); clearInterval(every); delay = every = 0 }
function press(b) {
  if (ctx.paused) return
  emit('press', b.id)
  if (!b.repeat) return
  stop()
  delay = setTimeout(() => {
    every = setInterval(() => (ctx.paused ? stop() : emit('press', b.id)), 50)
  }, 170)
}
// 키보드(Enter/Space)로 누른 경우만 click 으로 처리 — 포인터는 pointerdown 에서 처리
const onClick = (e, b) => { if (e.detail === 0) press(b) }
onBeforeUnmount(stop)
</script>

<template>
  <div class="pad" :class="layout" role="group" aria-label="조작 버튼">
    <button
      v-for="b in buttons"
      :key="b.id"
      type="button"
      class="key"
      :class="b.area"
      :aria-label="b.label"
      :disabled="disabled"
      @pointerdown.prevent="press(b)"
      @pointerup="stop"
      @pointerleave="stop"
      @pointercancel="stop"
      @click="onClick($event, b)"
    >
      <Icon :name="b.icon" />
    </button>
  </div>
</template>

<style scoped>
.pad { display: grid; gap: 8px; touch-action: none; }
.grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.dpad {
  grid-template-columns: repeat(3, 64px); justify-content: center;
  grid-template-areas: '. up .' 'left . right' '. down .';
}
.up { grid-area: up; } .left { grid-area: left; } .right { grid-area: right; } .down { grid-area: down; }
.key {
  height: 52px; display: grid; place-items: center; padding: 0;
  border-radius: var(--r-btn2); border: var(--bw) solid var(--bc);
  background: var(--surface); color: var(--text); box-shadow: var(--sh-sm);
}
.key:active { background: var(--accent); color: var(--accent-text); }
.key:disabled { opacity: 0.5; }
.key :deep(svg) { width: 26px; height: 26px; }
</style>
