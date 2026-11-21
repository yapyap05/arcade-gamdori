<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import GamePad from '../shared/GamePad.vue'
import { useKeys, useLoop } from '../shared/kit'
import { setupCanvas, useThemeColors } from '../shared/canvas'
import { sfx } from '../shared/sfx'
import { tetrisPadOn } from '../shared/prefs'
import {
  COLS, ROWS, shapeOf, createGame, move as mv, rotate as rot, update, softDrop as soft,
  hardDrop as hard, holdPiece, ghostY, previewTypes,
} from './engine'

defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const CELL = 20
const MINI = { w: 64, h: 40 }
const COLORS = { I: '#22D3EE', O: '#FBBF24', T: '#A855F7', S: '#4ADE80', Z: '#F87171', J: '#3B82F6', L: '#FB923C' }

const status = ref('idle')
const score = ref(0)
const lines = ref(0)
const level = ref(1)
const boardEl = ref(null)
const holdEl = ref(null)
const nextEls = ref([])

let g = null // 엔진 상태 (렌더용 → 비반응형)
let bctx, hctx, nctx = []
const colors = useThemeColors(['board-bg', 'board-grid'], () => draw())

const stats = computed(() => [
  { label: '점수', value: score.value.toLocaleString() },
  { label: '줄', value: lines.value },
  { label: '레벨', value: level.value },
])

function sync() {
  score.value = g.score
  lines.value = g.lines
  level.value = g.level
  if (g.over) finish()
}

function start() {
  g = createGame()
  status.value = 'playing'
  sync()
  draw()
}

function finish() {
  if (status.value !== 'playing') return
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: g?.score ?? score.value, meta: { lines: g?.lines ?? 0, level: g?.level ?? 1 } })
}

// 고정 결과 처리: cleared = 지운 줄 수 (-1 이면 고정 안 됨)
function afterLock(cleared) {
  if (cleared > 0) sfx.correct()
  else if (cleared === 0) sfx.tick()
}

const act = {
  left: () => mv(g, -1, 0),
  right: () => mv(g, 1, 0),
  rotate: () => rot(g, 1),
  rotateBack: () => rot(g, -1),
  down: () => soft(g),
  drop: () => afterLock(hard(g)),
  hold: () => holdPiece(g),
}
function run(name) {
  if (status.value !== 'playing' || !g) return
  act[name]()
  sync()
  draw()
}

useLoop((dt) => {
  if (status.value !== 'playing') return
  const cleared = update(g, dt)
  if (cleared >= 0) afterLock(cleared)
  sync()
}, draw)

/* ───── 입력 ───── */
const KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down', ArrowUp: 'rotate', KeyW: 'rotate', KeyX: 'rotate', KeyZ: 'rotateBack', Space: 'drop', KeyC: 'hold', ShiftLeft: 'hold', ShiftRight: 'hold' }
const NO_REPEAT = new Set(['rotate', 'rotateBack', 'drop', 'hold'])
useKeys((e) => {
  const name = KEYS[e.code]
  if (!name || status.value !== 'playing') return
  e.preventDefault()
  if (e.repeat && NO_REPEAT.has(name)) return // 누르고 있어도 회전·바로 내리기는 한 번만
  run(name)
})
// 플로팅 조작부. keys 는 데스크탑에서 버튼 모서리에 보이는 키 안내
const PAD = [
  { id: 'drop', icon: 'up', label: '바로 내리기', area: 'up', keys: ['Space'] },
  { id: 'left', icon: 'left', label: '왼쪽', area: 'left', repeat: true, keys: ['←'] },
  { id: 'right', icon: 'right', label: '오른쪽', area: 'right', repeat: true, keys: ['→'] },
  { id: 'down', icon: 'down', label: '한 칸 내리기', area: 'down', repeat: true, keys: ['↓'] },
  { id: 'hold', icon: 'swap', label: '홀드', area: 'hold', group: 'right', keys: ['C'] },
  { id: 'rotateBack', icon: 'ccw', label: '왼쪽으로 회전', area: 'ccw', group: 'right', keys: ['Z'] },
  { id: 'rotate', icon: 'cw', label: '오른쪽으로 회전', area: 'cw', group: 'right', keys: ['↑', 'X'] },
]
// 조작부를 숨겼을 때 보여 줄 키 안내
const KEY_GUIDE = [
  { keys: ['←', '→'], text: '이동' },
  { keys: ['↓'], text: '내리기' },
  { keys: ['Space'], text: '바로 내리기' },
  { keys: ['↑', 'X'], text: '회전' },
  { keys: ['Z'], text: '반대 회전' },
  { keys: ['C'], text: '홀드' },
]

// 데스크탑(마우스) 여부 — 데스크탑은 조작부 숨기기를 고를 수 있음, 모바일은 항상 표시
const desktopMq = window.matchMedia('(hover: hover) and (pointer: fine)')
const isDesktop = ref(desktopMq.matches)
const onMq = (e) => (isDesktop.value = e.matches)
desktopMq.addEventListener?.('change', onMq)
onBeforeUnmount(() => desktopMq.removeEventListener?.('change', onMq))
const showPad = computed(() => !isDesktop.value || tetrisPadOn.value)
function togglePad(e) {
  tetrisPadOn.value = !tetrisPadOn.value
  e.currentTarget.blur() // 포커스가 남으면 스페이스(바로 내리기)가 버튼을 다시 누르게 됨
}

/* ───── 그리기 ───── */
function cell(c, x, y, color, size, alpha = 1) {
  c.globalAlpha = alpha
  c.fillStyle = color
  c.beginPath()
  c.roundRect(x * size + 1, y * size + 1, size - 2, size - 2, 4)
  c.fill()
  c.globalAlpha = 1
}

function drawMini(c, type) {
  c.clearRect(0, 0, MINI.w, MINI.h)
  if (!type) return
  const m = shapeOf(type).filter((row) => row.some(Boolean))
  const size = 10
  const ox = (MINI.w - m[0].length * size) / 2 / size
  const oy = (MINI.h - m.length * size) / 2 / size
  m.forEach((row, r) => row.forEach((v, cIdx) => v && cell(c, cIdx + ox, r + oy, COLORS[type], size)))
}

function draw() {
  if (!bctx) return
  bctx.fillStyle = colors['board-bg']
  bctx.fillRect(0, 0, COLS * CELL, ROWS * CELL)
  bctx.strokeStyle = colors['board-grid']
  bctx.lineWidth = 1
  bctx.beginPath()
  for (let x = 1; x < COLS; x++) { bctx.moveTo(x * CELL, 0); bctx.lineTo(x * CELL, ROWS * CELL) }
  for (let y = 1; y < ROWS; y++) { bctx.moveTo(0, y * CELL); bctx.lineTo(COLS * CELL, y * CELL) }
  bctx.stroke()
  if (!g) return
  g.board.forEach((row, y) => row.forEach((t, x) => t && cell(bctx, x, y, COLORS[t], CELL)))
  if (status.value === 'playing') {
    const p = g.piece
    const gy = ghostY(g)
    p.m.forEach((row, r) => row.forEach((v, c) => {
      if (!v) return
      cell(bctx, p.x + c, gy + r, COLORS[p.type], CELL, 0.22)
      cell(bctx, p.x + c, p.y + r, COLORS[p.type], CELL)
    }))
  }
  drawMini(hctx, g.hold)
  previewTypes(g, 3).forEach((t, i) => nctx[i] && drawMini(nctx[i], t))
}

onMounted(() => {
  bctx = setupCanvas(boardEl.value, COLS * CELL, ROWS * CELL)
  hctx = setupCanvas(holdEl.value, MINI.w, MINI.h)
  nctx = nextEls.value.map((el) => setupCanvas(el, MINI.w, MINI.h))
  draw()
})
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" :stats="stats" title="테트리스"
    :summary="`${lines}줄 · 레벨 ${level}`" @start="start" @quit="finish">
    <div class="play" :class="{ 'with-pad': showPad }">
      <div class="side">
        <span class="lbl">홀드</span>
        <canvas ref="holdEl" class="mini" />
      </div>
      <canvas ref="boardEl" class="board" />
      <div class="side">
        <span class="lbl">다음</span>
        <canvas v-for="n in 3" :key="n" ref="nextEls" class="mini" />
      </div>
      <GamePad v-if="showPad" :buttons="PAD" layout="float" :disabled="status !== 'playing'" @press="run" />
    </div>
    <template v-if="isDesktop" #controls>
      <div class="desk">
        <ul v-if="!showPad" class="guide" aria-label="키보드 조작">
          <li v-for="g in KEY_GUIDE" :key="g.text"><kbd v-for="k in g.keys" :key="k">{{ k }}</kbd>{{ g.text }}</li>
        </ul>
        <button type="button" class="toggle" :aria-pressed="showPad" @click="togglePad($event)">
          {{ showPad ? '조작 버튼 숨기기' : '조작 버튼 보이기' }}
        </button>
      </div>
    </template>
  </GameScreen>
</template>

<style scoped>
.play { position: relative; display: flex; justify-content: center; align-items: flex-start; gap: 8px; }
/* 플로팅 조작부가 있으면 게임판 아래쪽만 살짝 덮도록 아래 여백 확보 */
.play.with-pad { padding-bottom: 100px; }
.desk { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.guide { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 12px; font-size: 12px; color: var(--muted); }
.guide li { display: inline-flex; align-items: center; gap: 4px; }
kbd {
  min-width: 22px; padding: 1px 6px; border-radius: 5px; text-align: center;
  font-family: var(--font-num); font-size: 11px; font-weight: 700; color: var(--text);
  background: var(--surface); border: var(--bw) solid var(--bc); box-shadow: 0 2px 0 var(--bc);
}
.toggle {
  height: 32px; padding: 0 12px; border-radius: 999px; font-size: 12px; font-weight: 700;
  background: transparent; color: var(--muted); border: var(--bw) solid var(--bc);
}
.board {
  display: block; width: min(calc(100% - 152px), 32vh, 260px); aspect-ratio: 1 / 2; height: auto;
  border-radius: var(--r-md); border: var(--bw) solid var(--bc); box-shadow: var(--sh); touch-action: none;
}
.side { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 68px; flex: none; }
.lbl { font-size: 11px; font-weight: 700; color: var(--muted); }
.mini {
  width: 64px; height: 40px; border-radius: 10px;
  background: var(--surface-2); border: var(--bw) solid var(--bc);
}
</style>
