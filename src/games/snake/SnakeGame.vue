<script setup>
import { ref, computed, onMounted } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import { useKeys, useLoop, arrowDir, pick } from '../shared/kit'
import { useGameCtx } from '../shared/context'
import { setupCanvas, useThemeColors, drawPixel } from '../shared/canvas'
import { sfx } from '../shared/sfx'

defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const COLS = 18, ROWS = 18, CELL = 20
const DIR = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }

const status = ref('idle')
const score = ref(0)
const length = ref(3)
const canvas = ref(null)

let snake = [], dir = DIR.R, queue = [], food = null
let acc = 0, eaten = 0, c2d = null
const colors = useThemeColors(['board-bg', 'board-grid', 'accent'], () => draw())

const stats = computed(() => [
  { label: '점수', value: score.value },
  { label: '길이', value: length.value },
])
// 먹을수록 빨라짐 (최소 간격 60ms)
const interval = () => Math.max(60, 150 - eaten * 3)

// 빈 칸 중 하나에 먹이. 빈 칸이 없으면 판을 다 채운 것 → 종료
function placeFood() {
  const taken = new Set(snake.map((s) => s.y * COLS + s.x))
  const free = []
  for (let i = 0; i < COLS * ROWS; i++) if (!taken.has(i)) free.push(i)
  if (!free.length) { food = null; return false }
  const i = pick(free)
  food = { x: i % COLS, y: Math.floor(i / COLS) }
  return true
}

function start() {
  const cy = Math.floor(ROWS / 2)
  snake = [{ x: 6, y: cy }, { x: 5, y: cy }, { x: 4, y: cy }]
  dir = DIR.R
  queue = []
  eaten = 0; acc = 0
  score.value = 0; length.value = 3
  placeFood()
  status.value = 'playing'
  draw()
}

// 방향 바꾸기. 바꿨으면 true (같은 방향·정반대·입력이 2개 쌓였으면 false)
function turn(d) {
  if (status.value !== 'playing') return false
  const [x, y] = DIR[d]
  const last = queue.length ? queue[queue.length - 1] : dir
  if ((last[0] === -x && last[1] === -y) || (last[0] === x && last[1] === y)) return false // 반대·같은 방향 무시
  if (queue.length >= 2) return false
  queue.push([x, y]) // 빠른 연속 회전 허용
  return true
}

function tick() {
  if (queue.length) dir = queue.shift()
  const head = { x: snake[0].x + dir[0], y: snake[0].y + dir[1] }
  const willEat = food && head.x === food.x && head.y === food.y
  const body = willEat ? snake : snake.slice(0, -1)
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || body.some((s) => s.x === head.x && s.y === head.y)) return finish()
  snake.unshift(head)
  if (willEat) {
    eaten++
    score.value += 10 + Math.floor(eaten / 5) * 5 // 5개 먹을 때마다 보너스 증가
    length.value = snake.length
    sfx.correct()
    if (!placeFood()) finish()
  } else snake.pop()
}

function finish() {
  if (status.value !== 'playing') return
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { length: length.value, eaten } })
}

useLoop((dt) => {
  if (status.value !== 'playing') return
  acc += dt
  while (acc >= interval() && status.value === 'playing') { acc -= interval(); tick() }
}, draw)

function draw() {
  if (!c2d) return
  c2d.fillStyle = colors['board-bg']
  c2d.fillRect(0, 0, COLS * CELL, ROWS * CELL)
  c2d.strokeStyle = colors['board-grid']
  c2d.lineWidth = 1
  c2d.beginPath()
  for (let i = 1; i < COLS; i++) { c2d.moveTo(i * CELL, 0); c2d.lineTo(i * CELL, ROWS * CELL) }
  for (let i = 1; i < ROWS; i++) { c2d.moveTo(0, i * CELL); c2d.lineTo(COLS * CELL, i * CELL) }
  c2d.stroke()
  if (!snake.length) return
  if (food) drawPixel(c2d, 'apple', food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL - 2)
  snake.forEach((s, i) => {
    c2d.globalAlpha = i === 0 ? 1 : Math.max(0.45, 1 - i * 0.025)
    c2d.fillStyle = colors.accent
    c2d.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2)
  })
  c2d.globalAlpha = 1
  const h = snake[0]
  c2d.fillStyle = '#FFFFFF'
  ;[[-4, -3], [3, -3]].forEach(([ox, oy]) => {
    c2d.fillRect(h.x * CELL + CELL / 2 + ox + dir[0] * 2, h.y * CELL + CELL / 2 + oy + dir[1] * 2, 3, 3)
  })
}

useKeys((e) => {
  const d = arrowDir(e.code)
  if (!d || status.value !== 'playing') return
  e.preventDefault()
  turn(d)
})
/* ───── 게임판 터치·클릭 ─────
 * 조금만 움직이고 떼면 '탭' → 누른 위치 쪽으로 꺾기
 * 많이 움직이면 '스와이프' → 민 방향으로 꺾기
 */
const ctx = useGameCtx()
const SWIPE = 24
let sx = 0, sy = 0, down = false

// 탭한 위치(게임판 좌표)를 기준으로 머리에서 더 먼 축의 방향 → 못 꺾으면 다른 축
function turnToward(px, py) {
  const h = snake[0]
  if (!h) return
  const dx = px - (h.x + 0.5) * CELL
  const dy = py - (h.y + 0.5) * CELL
  const hz = dx > 0 ? 'R' : 'L'
  const vt = dy > 0 ? 'D' : 'U'
  const [first, second] = Math.abs(dx) >= Math.abs(dy) ? [hz, vt] : [vt, hz]
  if (!turn(first)) turn(second)
}
function onDown(e) { down = true; sx = e.clientX; sy = e.clientY }
function onUp(e) {
  if (!down) return
  down = false
  if (ctx.paused || status.value !== 'playing') return
  const mx = e.clientX - sx, my = e.clientY - sy
  if (Math.max(Math.abs(mx), Math.abs(my)) >= SWIPE) {
    turn(Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'R' : 'L') : my > 0 ? 'D' : 'U')
    return
  }
  const r = canvas.value.getBoundingClientRect()
  turnToward(((e.clientX - r.left) / r.width) * COLS * CELL, ((e.clientY - r.top) / r.height) * ROWS * CELL)
}

onMounted(() => {
  c2d = setupCanvas(canvas.value, COLS * CELL, ROWS * CELL)
  draw()
})
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" :stats="stats" title="스네이크 러시"
    :summary="`길이 ${length}`" @start="start" @quit="finish">
    <canvas ref="canvas" class="board" @pointerdown="onDown" @pointerup="onUp" @pointercancel="down = false" />
  </GameScreen>
</template>

<style scoped>
.board {
  display: block; width: min(100%, 400px); aspect-ratio: 1; height: auto; margin: 0 auto; touch-action: none;
  border-radius: var(--r-md); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
}
</style>
