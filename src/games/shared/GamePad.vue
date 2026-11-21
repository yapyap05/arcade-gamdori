<script setup>
import { computed, onBeforeUnmount } from 'vue'
import Icon from '../../components/Icon.vue'
import { useGameCtx } from './context'

/**
 * 공통 터치 조작 버튼
 * buttons: [{ id, icon, label, repeat?, area?, group? }]
 *   repeat : 누르고 있으면 반복 입력 (처음 170ms 뒤부터 50ms 간격)
 *   area   : 버튼 자리 이름 (dpad·float 배치에서 사용)
 *   group  : float 배치에서 'left' | 'right' 묶음
 * layout
 *   grid  : 3열 버튼
 *   dpad  : 십자 (area: up·left·right·down)
 *   float : 게임판 위에 띄우는 반투명 조작부 — 왼쪽 십자(up·left·right·down) + 오른쪽 묶음(hold·ccw·cw)
 *           터치 기기에서만 보이고, 마우스를 쓰는 데스크탑에서는 숨김(키보드 사용)
 *           부모 요소는 position: relative 여야 함
 */
const props = defineProps({
  buttons: { type: Array, required: true },
  layout: { type: String, default: 'grid' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['press'])
const ctx = useGameCtx()

const groups = computed(() =>
  props.layout === 'float'
    ? [
        { cls: 'g-left', list: props.buttons.filter((b) => b.group !== 'right') },
        { cls: 'g-right', list: props.buttons.filter((b) => b.group === 'right') },
      ]
    : [{ cls: props.layout, list: props.buttons }],
)

let delay = 0, every = 0
function stop() { clearTimeout(delay); clearInterval(every); delay = every = 0 }
function press(b) {
  if (ctx.paused || props.disabled) return
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
    <div v-for="g in groups" :key="g.cls" class="cluster" :class="g.cls">
      <button
        v-for="b in g.list"
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
  </div>
</template>

<style scoped>
.pad { touch-action: none; }
.cluster { display: grid; gap: 8px; }
.key {
  height: 52px; display: grid; place-items: center; padding: 0;
  border-radius: var(--r-btn2); border: var(--bw) solid var(--bc);
  background: var(--surface); color: var(--text); box-shadow: var(--sh-sm);
}
.key:active { background: var(--accent); color: var(--accent-text); }
.key:disabled { opacity: 0.5; }
.key :deep(svg) { width: 26px; height: 26px; }
.up { grid-area: up; } .left { grid-area: left; } .right { grid-area: right; } .down { grid-area: down; }
.hold { grid-area: hold; } .ccw { grid-area: ccw; } .cw { grid-area: cw; }

/* grid: 3열 */
.grid .cluster { grid-template-columns: repeat(3, minmax(0, 1fr)); }

/* dpad: 십자 */
.dpad .cluster { grid-template-columns: repeat(3, 64px); justify-content: center; grid-template-areas: '. up .' 'left . right' '. down .'; }

/* float: 게임판 위 반투명 조작부 */
.float {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
  display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; padding: 0 2px 2px;
  pointer-events: none; /* 버튼 사이 빈 곳은 게임판으로 통과 */
}
.float .cluster { gap: 6px; pointer-events: none; }
.float .g-left { grid-template-columns: repeat(3, 52px); grid-template-areas: '. up .' 'left . right' '. down .'; }
.float .g-right { grid-template-columns: repeat(2, 56px); grid-template-areas: '. hold' 'ccw cw'; }
.float .key {
  pointer-events: auto; width: 100%; height: 52px;
  background: color-mix(in srgb, var(--surface) 45%, transparent);
  border-color: color-mix(in srgb, var(--bc) 70%, transparent);
  box-shadow: none; -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
}
.float .g-right .key { height: 56px; border-radius: 999px; }
.float .key:active { background: color-mix(in srgb, var(--accent) 80%, transparent); color: var(--accent-text); }
/* 데스크탑(마우스)에서는 숨김 → 키보드로 조작 */
@media (hover: hover) and (pointer: fine) {
  .float { display: none; }
}
</style>
