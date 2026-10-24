<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  COLS, ROWS, createGame, move, rotate, tick, softDrop, hardDrop, holdPiece,
  ghostY, levelInterval, previewTypes, shapeOf
} from './engine'
import { useThemeStore } from '../../stores/theme'

const emit = defineEmits(['score', 'gameover'])

const CELL = 30
const PIECE_COLORS = {
  I: '#35d6ff', O: '#ffd43b', T: '#b968ff', S: '#4cd964', Z: '#ff5d73', J: '#4f7dff', L: '#ff9f43'
}

const theme = useThemeStore()
const boardEl = ref(null)
const holdEl = ref(null)
const nextEl = ref(null)

const phase = ref('ready') // ready | playing | paused | over
const stats = ref({ score: 0, lines: 0, level: 1 })

let game = createGame()
let raf = 0
let last = 0
let acc = 0
let colors = { board: '#0f1230', grid: 'rgba(255,255,255,.06)' }

function readColors() {
  const cs = getComputedStyle(document.documentElement)
  colors = { board: cs.getPropertyValue('--board').trim(), grid: cs.getPropertyValue('--grid').trim() }
}

// ───────── 그리기 ─────────
function drawCell(ctx, x, y, color, size, alpha = 1) {
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2)
  ctx.globalAlpha = alpha * 0.35
  ctx.fillStyle = '#fff'
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4)
  ctx.globalAlpha = 1
}

function drawBoard() {
  const cv = boardEl.value
  if (!cv) return
  const ctx = cv.getContext('2d')
  ctx.fillStyle = colors.board
  ctx.fillRect(0, 0, cv.width, cv.height)
  ctx.strokeStyle = colors.grid
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 1; x < COLS; x++) { ctx.moveTo(x * CELL + 0.5, 0); ctx.lineTo(x * CELL + 0.5, ROWS * CELL) }
  for (let y = 1; y < ROWS; y++) { ctx.moveTo(0, y * CELL + 0.5); ctx.lineTo(COLS * CELL, y * CELL + 0.5) }
  ctx.stroke()

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const t = game.board[r][c]
      if (t) drawCell(ctx, c, r, PIECE_COLORS[t] || '#888', CELL)
    }

  if (!game.over) {
    const p = game.piece
    const gy = ghostY(game)
    p.m.forEach((row, r) => row.forEach((v, c) => {
      if (!v) return
      if (gy + r >= 0) drawCell(ctx, p.x + c, gy + r, PIECE_COLORS[p.type], CELL, 0.22)
    }))
    p.m.forEach((row, r) => row.forEach((v, c) => {
      if (v && p.y + r >= 0) drawCell(ctx, p.x + c, p.y + r, PIECE_COLORS[p.type], CELL)
    }))
  }
}

function drawMini(cv, types) {
  if (!cv) return
  const ctx = cv.getContext('2d')
  const S = 20
  ctx.clearRect(0, 0, cv.width, cv.height)
  types.forEach((t, i) => {
    if (!t) return
    const m = shapeOf(t)
    // 채워진 영역만 잘라 가운데 정렬
    const rows = m.map((r, i2) => (r.some(Boolean) ? i2 : -1)).filter((i2) => i2 >= 0)
    const cols = m[0].map((_, c) => (m.some((r) => r[c]) ? c : -1)).filter((c) => c >= 0)
    const w = cols.length, h = rows.length
    const ox = Math.floor((cv.width / S - w) / 2) - cols[0]
    const oy = i * 3 + Math.floor((3 - h) / 2) - rows[0] + (types.length === 1 ? 0 : 0)
    m.forEach((row, r) => row.forEach((v, c) => { if (v) drawCell(ctx, ox + c, oy + r, PIECE_COLORS[t], S) }))
  })
}

function render() {
  drawBoard()
  drawMini(holdEl.value, game.hold ? [game.hold] : [])
  drawMini(nextEl.value, previewTypes(game, 3))
}

function sync() {
  const s = game
  if (s.score !== stats.value.score || s.lines !== stats.value.lines || s.level !== stats.value.level) {
    stats.value = { score: s.score, lines: s.lines, level: s.level }
    emit('score', s.score)
  }
  if (s.over && phase.value === 'playing') {
    phase.value = 'over'
    cancelAnimationFrame(raf)
    render()
    emit('gameover', s.score)
  }
}

// ───────── 루프 ─────────
function frame(now) {
  if (phase.value !== 'playing') return
  acc += now - last
  last = now
  const interval = levelInterval(game.level)
  while (acc >= interval && !game.over) { tick(game); acc -= interval }
  render()
  sync()
  if (phase.value === 'playing') raf = requestAnimationFrame(frame)
}

function start() {
  game = createGame()
  stats.value = { score: 0, lines: 0, level: 1 }
  emit('score', 0)
  acc = 0
  last = performance.now()
  phase.value = 'playing'
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(frame)
}

function togglePause() {
  if (phase.value === 'playing') { phase.value = 'paused'; cancelAnimationFrame(raf) }
  else if (phase.value === 'paused') {
    phase.value = 'playing'; last = performance.now(); raf = requestAnimationFrame(frame)
  }
}

// ───────── 입력 ─────────
function act(fn) {
  if (phase.value !== 'playing') return
  fn()
  render()
  sync()
}
const actions = {
  left: () => act(() => move(game, -1, 0)),
  right: () => act(() => move(game, 1, 0)),
  down: () => act(() => { softDrop(game); acc = 0 }),
  rotateCW: () => act(() => rotate(game, 1)),
  rotateCCW: () => act(() => rotate(game, -1)),
  drop: () => act(() => { hardDrop(game); acc = 0 }),
  hold: () => act(() => holdPiece(game))
}

const KEYMAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rotateCW',
  KeyX: 'rotateCW', KeyZ: 'rotateCCW', Space: 'drop', KeyC: 'hold', ShiftLeft: 'hold', ShiftRight: 'hold'
}

function onKey(e) {
  if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return }
  if (e.code === 'Enter' && (phase.value === 'ready' || phase.value === 'over')) { start(); return }
  const a = KEYMAP[e.code]
  if (!a) return
  e.preventDefault() // 방향키/스페이스로 페이지가 스크롤되지 않게
  if (e.repeat && (a === 'rotateCW' || a === 'rotateCCW' || a === 'drop' || a === 'hold')) return
  actions[a]()
}

// 탭이 가려지면 자동 일시정지
function onVisibility() { if (document.hidden && phase.value === 'playing') togglePause() }

onMounted(() => {
  readColors()
  render()
  window.addEventListener('keydown', onKey)
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('visibilitychange', onVisibility)
})
watch(() => theme.theme, () => { readColors(); render() })

defineExpose({ restart: start })
</script>

<template>
  <div class="tetris">
    <div class="col side">
      <div class="box">
        <h3>홀드 (C)</h3>
        <canvas ref="holdEl" width="100" height="60" aria-label="홀드한 블록"></canvas>
      </div>
      <div class="box info">
        <div><span>레벨</span><b>{{ stats.level }}</b></div>
        <div><span>줄</span><b>{{ stats.lines }}</b></div>
      </div>
    </div>

    <div class="boardwrap">
      <canvas ref="boardEl" :width="COLS * CELL" :height="ROWS * CELL" class="board" aria-label="테트리스 판"></canvas>

      <div v-if="phase !== 'playing'" class="overlay">
        <template v-if="phase === 'ready'">
          <p class="t">준비됐나요?</p>
          <button class="btn" type="button" @click="start">시작하기</button>
          <p class="hint">Enter 로도 시작할 수 있어요</p>
        </template>
        <template v-else-if="phase === 'paused'">
          <p class="t">일시정지</p>
          <button class="btn" type="button" @click="togglePause">계속하기</button>
        </template>
        <template v-else>
          <p class="t">게임 종료</p>
          <button class="btn" type="button" @click="start">다시 하기</button>
        </template>
      </div>
    </div>

    <div class="col side">
      <div class="box">
        <h3>다음</h3>
        <canvas ref="nextEl" width="100" height="180" aria-label="다음 블록"></canvas>
      </div>
      <div class="box keys">
        <h3>조작</h3>
        <p>← → 이동<br />↑ / X 회전 · Z 반대로<br />↓ 천천히 · Space 한 번에<br />C 홀드 · P 일시정지</p>
      </div>
    </div>

    <div class="pad" aria-label="터치 조작">
      <button type="button" @pointerdown.prevent="actions.left">◀</button>
      <button type="button" @pointerdown.prevent="actions.rotateCW">⟳</button>
      <button type="button" @pointerdown.prevent="actions.right">▶</button>
      <button type="button" @pointerdown.prevent="actions.down">▼</button>
      <button type="button" @pointerdown.prevent="actions.drop">⤓</button>
      <button type="button" @pointerdown.prevent="actions.hold">홀드</button>
    </div>
  </div>
</template>

<style scoped>
.tetris { display: grid; grid-template-columns: 130px auto 130px; gap: 16px; justify-content: center; align-items: start; }
.col { display: grid; gap: 12px; }
.box { background: var(--bg); border-radius: 16px; padding: 10px 12px; }
.box h3 { margin: 0 0 6px; font-size: 0.8125rem; color: var(--muted); }
.box canvas { width: 100%; height: auto; display: block; }
.info { display: grid; gap: 6px; }
.info div { display: flex; justify-content: space-between; align-items: baseline; }
.info span { color: var(--muted); font-size: 0.8125rem; }
.info b { font-size: 1.15rem; font-variant-numeric: tabular-nums; }
.keys p { margin: 0; font-size: 0.78rem; line-height: 1.7; color: var(--muted); }

.boardwrap { position: relative; border-radius: 14px; overflow: hidden; box-shadow: 0 0 0 3px var(--surface-2); }
.board { display: block; width: min(300px, 62vw); height: auto; }
.overlay {
  position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 10px;
  background: color-mix(in srgb, var(--bg-deep) 78%, transparent); text-align: center;
}
.overlay .t { margin: 0; font-size: 1.4rem; font-weight: 900; }
.overlay .hint { margin: 0; font-size: 0.78rem; color: var(--muted); }

.pad { display: none; grid-column: 1 / -1; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 360px; margin: 6px auto 0; width: 100%; }
.pad button { height: 54px; border: 0; border-radius: 16px; background: var(--surface-2); font-size: 1.25rem; font-weight: 800; touch-action: manipulation; }
.pad button:active { background: var(--accent); color: var(--accent-ink); }

@media (max-width: 720px) {
  .tetris { grid-template-columns: 76px auto 76px; gap: 8px; }
  .keys { display: none; }
  .box { padding: 8px; }
}
@media (pointer: coarse) { .pad { display: grid; } .keys { display: none; } }
</style>
