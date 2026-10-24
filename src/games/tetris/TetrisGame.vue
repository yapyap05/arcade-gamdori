<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const COLS = 10, ROWS = 20, CELL = 28
const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
}
const COLORS = { I: '#22d3ee', O: '#fbbf24', T: '#a855f7', S: '#4ade80', Z: '#f87171', J: '#3b82f6', L: '#fb923c' }
const LINE_POINTS = [0, 100, 300, 500, 800]

// HUD (반응형)
const score = ref(0)
const lines = ref(0)
const level = ref(1)
const status = ref('idle') // idle | playing | paused | over

const boardEl = ref(null)
const nextEl = ref(null)
const holdEl = ref(null)

// 게임 상태 (렌더용 → 비반응형)
let board, piece, queue, holdType, canHold
let raf = 0, last = 0, acc = 0, styles = null

const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null))
const rotateCW = (m) => m[0].map((_, x) => m.map((row) => row[x]).reverse())
const rotateCCW = (m) => m[0].map((_, x) => m.map((row) => row[row.length - 1 - x]))

function refillQueue() {
  const bag = Object.keys(SHAPES)
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  queue.push(...bag)
}

function collides(m, x, y) {
  for (let r = 0; r < m.length; r++)
    for (let c = 0; c < m[r].length; c++) {
      if (!m[r][c]) continue
      const nx = x + c, ny = y + r
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true
      if (ny >= 0 && board[ny][nx]) return true
    }
  return false
}

function makePiece(type) {
  const m = SHAPES[type].map((r) => [...r])
  return { type, m, x: Math.floor((COLS - m[0].length) / 2), y: type === 'I' ? -1 : 0 }
}

function spawn(type) {
  if (!type) {
    if (queue.length < 7) refillQueue()
    type = queue.shift()
  }
  piece = makePiece(type)
  canHold = canHold ?? true
  if (collides(piece.m, piece.x, piece.y)) endGame()
}

function dropInterval() {
  return Math.max(80, 800 - (level.value - 1) * 70)
}

function start() {
  board = emptyBoard()
  queue = []
  holdType = null
  canHold = true
  score.value = 0
  lines.value = 0
  level.value = 1
  acc = 0
  status.value = 'playing'
  spawn()
}

function endGame() {
  if (status.value === 'over') return
  status.value = 'over'
  emit('gameover', { score: score.value, meta: { lines: lines.value, level: level.value } })
}

function lockPiece() {
  piece.m.forEach((row, r) =>
    row.forEach((v, c) => {
      const y = piece.y + r
      if (v && y >= 0) board[y][piece.x + c] = piece.type
    }),
  )
  const remaining = board.filter((row) => row.some((cell) => !cell))
  const cleared = ROWS - remaining.length
  if (cleared) {
    board = [...Array.from({ length: cleared }, () => Array(COLS).fill(null)), ...remaining]
    lines.value += cleared
    score.value += LINE_POINTS[cleared] * level.value
    level.value = Math.floor(lines.value / 10) + 1
  }
  canHold = true
  spawn()
}

function move(dx) {
  if (status.value !== 'playing') return
  if (!collides(piece.m, piece.x + dx, piece.y)) piece.x += dx
}

function softDrop(manual = true) {
  if (status.value !== 'playing') return
  if (!collides(piece.m, piece.x, piece.y + 1)) {
    piece.y++
    if (manual) score.value += 1
  } else lockPiece()
  acc = 0
}

function hardDrop() {
  if (status.value !== 'playing') return
  let dist = 0
  while (!collides(piece.m, piece.x, piece.y + 1)) { piece.y++; dist++ }
  score.value += dist * 2
  lockPiece()
  acc = 0
}

function rotate(cw = true) {
  if (status.value !== 'playing') return
  const m = cw ? rotateCW(piece.m) : rotateCCW(piece.m)
  for (const kick of [0, -1, 1, -2, 2]) {
    if (!collides(m, piece.x + kick, piece.y)) {
      piece.m = m
      piece.x += kick
      return
    }
  }
}

function hold() {
  if (status.value !== 'playing' || !canHold) return
  const current = piece.type
  const next = holdType
  holdType = current
  canHold = false
  if (next) piece = makePiece(next)
  else {
    if (queue.length < 7) refillQueue()
    piece = makePiece(queue.shift())
  }
  if (collides(piece.m, piece.x, piece.y)) endGame()
}

function togglePause() {
  // 경쟁 모드에서는 일시정지 불가 (공정성)
  if (props.mode === 'competitive') return
  if (status.value === 'playing') status.value = 'paused'
  else if (status.value === 'paused') status.value = 'playing'
}

function onKey(e) {
  const k = e.code
  if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'].includes(k) && status.value !== 'idle') e.preventDefault()
  if (k === 'Enter' && (status.value === 'idle' || status.value === 'over')) return start()
  if (k === 'KeyP' || k === 'Escape') return togglePause()
  if (k === 'ArrowLeft') move(-1)
  else if (k === 'ArrowRight') move(1)
  else if (k === 'ArrowDown') softDrop()
  else if (k === 'ArrowUp' || k === 'KeyX') rotate(true)
  else if (k === 'KeyZ') rotate(false)
  else if (k === 'Space') hardDrop()
  else if (k === 'KeyC' || k === 'ShiftLeft' || k === 'ShiftRight') hold()
}

// ───── 렌더링 ─────
function readStyles() {
  const cs = getComputedStyle(boardEl.value)
  styles = { bg: cs.getPropertyValue('--board-bg').trim(), grid: cs.getPropertyValue('--board-grid').trim() }
}

function drawCell(ctx, x, y, color, size = CELL, alpha = 1) {
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x * size + 1, y * size + 1, size - 2, size - 2, 5)
  ctx.fill()
  ctx.globalAlpha = 1
}

function drawMini(canvas, type) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!type) return
  const m = SHAPES[type], size = 20
  const ox = (canvas.width - m[0].length * size) / 2 / size
  const oy = (canvas.height - m.length * size) / 2 / size
  m.forEach((row, r) => row.forEach((v, c) => v && drawCell(ctx, c + ox, r + oy, COLORS[type], size)))
}

function draw() {
  if (!board) return
  const ctx = boardEl.value.getContext('2d')
  ctx.fillStyle = styles.bg
  ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL)
  ctx.strokeStyle = styles.grid
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 1; x < COLS; x++) { ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, ROWS * CELL) }
  for (let y = 1; y < ROWS; y++) { ctx.moveTo(0, y * CELL); ctx.lineTo(COLS * CELL, y * CELL) }
  ctx.stroke()

  board.forEach((row, y) => row.forEach((t, x) => t && drawCell(ctx, x, y, COLORS[t])))

  if (status.value === 'playing' || status.value === 'paused') {
    let gy = piece.y
    while (!collides(piece.m, piece.x, gy + 1)) gy++
    piece.m.forEach((row, r) =>
      row.forEach((v, c) => {
        if (!v) return
        drawCell(ctx, piece.x + c, gy + r, COLORS[piece.type], CELL, 0.22)
        drawCell(ctx, piece.x + c, piece.y + r, COLORS[piece.type])
      }),
    )
  }
  drawMini(nextEl.value, queue?.[0])
  drawMini(holdEl.value, holdType)
}

function frame(t) {
  raf = requestAnimationFrame(frame)
  const dt = Math.min(t - last, 100)
  last = t
  if (status.value === 'playing') {
    acc += dt
    if (acc >= dropInterval()) { acc = 0; softDrop(false) }
  }
  draw()
}

onMounted(() => {
  readStyles()
  new MutationObserver(readStyles).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  window.addEventListener('keydown', onKey)
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="tetris">
    <div class="side">
      <div class="panel"><span class="label">홀드</span><canvas ref="holdEl" width="100" height="80" /></div>
      <div class="panel"><span class="label">점수</span><b>{{ score.toLocaleString() }}</b></div>
      <div class="panel"><span class="label">줄</span><b>{{ lines }}</b></div>
      <div class="panel"><span class="label">레벨</span><b>{{ level }}</b></div>
    </div>

    <div class="board-wrap">
      <canvas ref="boardEl" :width="COLS * CELL" :height="ROWS * CELL" class="board" />
      <div v-if="status !== 'playing'" class="overlay">
        <template v-if="status === 'idle'">
          <h2>테트리스</h2>
          <p>{{ mode === 'competitive' ? '경쟁 모드 · 일시정지 불가' : '캐주얼 모드' }}</p>
          <button class="btn btn-cta" @click="start">시작 (Enter)</button>
        </template>
        <template v-else-if="status === 'paused'">
          <h2>일시정지</h2>
          <button class="btn btn-cta" @click="togglePause">계속하기 (P)</button>
        </template>
        <template v-else>
          <h2>게임 종료</h2>
          <p>{{ score.toLocaleString() }}점 · {{ lines }}줄</p>
          <button class="btn btn-cta" @click="start">다시 하기 (Enter)</button>
        </template>
      </div>
    </div>

    <div class="side">
      <div class="panel"><span class="label">다음</span><canvas ref="nextEl" width="100" height="80" /></div>
      <ul class="keys muted">
        <li>← → 이동</li>
        <li>↑ / X 회전, Z 반대 회전</li>
        <li>↓ 소프트 드롭</li>
        <li>Space 하드 드롭</li>
        <li>C / Shift 홀드</li>
        <li>P 일시정지</li>
      </ul>
    </div>

    <div class="touch" aria-label="터치 조작">
      <button @click="move(-1)" aria-label="왼쪽">◀</button>
      <button @click="rotate(true)" aria-label="회전">⟳</button>
      <button @click="move(1)" aria-label="오른쪽">▶</button>
      <button @click="softDrop()" aria-label="아래">▼</button>
      <button @click="hardDrop()" aria-label="하드 드롭">⏬</button>
      <button @click="hold()" aria-label="홀드">HOLD</button>
    </div>
  </div>
</template>

<style scoped>
.tetris { display: grid; grid-template-columns: 120px auto 140px; gap: 16px; align-items: start; justify-content: center; }
.board-wrap { position: relative; }
.board { display: block; border-radius: 14px; border: 3px solid var(--line); max-width: 100%; height: auto; }
.side { display: grid; gap: 10px; }
.panel { background: var(--surface-2); border-radius: 14px; padding: 10px 12px; display: grid; gap: 4px; justify-items: center; }
.panel b { font-size: 22px; font-variant-numeric: tabular-nums; }
.label { font-size: 12px; color: var(--muted); font-weight: 700; }
.keys { list-style: none; margin: 0; padding: 0 4px; font-size: 12.5px; display: grid; gap: 4px; }
.overlay { position: absolute; inset: 0; border-radius: 12px; background: rgba(12, 14, 34, 0.78); color: #fff; display: grid; place-content: center; justify-items: center; gap: 10px; text-align: center; }
.overlay h2 { margin: 0; font-size: 28px; }
.overlay p { margin: 0; opacity: 0.85; }
.touch { display: none; grid-column: 1 / -1; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.touch button { padding: 14px 0; border: 0; border-radius: 14px; background: var(--surface-2); font-weight: 800; font-size: 18px; }
.touch button:active { background: var(--accent); color: var(--accent-text); }
@media (max-width: 700px) {
  .tetris { grid-template-columns: 1fr; justify-items: center; }
  .side { grid-template-columns: repeat(4, 1fr); width: 100%; order: -1; }
  .keys { display: none; }
  .touch { display: grid; }
}
@media (hover: none) { .keys { display: none; } }
</style>
