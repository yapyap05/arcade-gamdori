<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import GameHeader from '../shared/GameHeader.vue'
import { randInt } from '../shared/kit'
import { sfx } from '../shared/sfx'

defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const COLS = 20, ROWS = 20, CELL = 24
const status = ref('idle')
const score = ref(0)
const length = ref(3)
const canvas = ref(null)

let snake = [], dir = { x: 1, y: 0 }, queue = [], food = { x: 0, y: 0 }
let acc = 0, last = 0, raf = 0, eaten = 0, ctx

const stats = computed(() => [
  { label: '점수', value: score.value },
  { label: '길이', value: length.value },
])
// 먹을수록 빨라짐 (최소 간격 55ms)
const interval = () => Math.max(55, 140 - eaten * 3)

function placeFood() {
  for (;;) {
    const f = { x: randInt(0, COLS - 1), y: randInt(0, ROWS - 1) }
    if (!snake.some((s) => s.x === f.x && s.y === f.y)) { food = f; return }
  }
}

function start() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
  dir = { x: 1, y: 0 }
  queue = []
  eaten = 0; acc = 0
  score.value = 0; length.value = 3
  placeFood()
  status.value = 'playing'
}

function turn(x, y) {
  const last = queue.length ? queue[queue.length - 1] : dir
  if ((last.x === -x && last.y === -y) || (last.x === x && last.y === y)) return // 반대/같은 방향 무시
  if (queue.length < 2) queue.push({ x, y }) // 빠른 연속 회전 허용
}

function tick() {
  if (queue.length) dir = queue.shift()
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }
  const willEat = head.x === food.x && head.y === food.y
  const body = willEat ? snake : snake.slice(0, -1)
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || body.some((s) => s.x === head.x && s.y === head.y)) return finish()
  snake.unshift(head)
  if (willEat) {
    eaten++
    score.value += 10 + Math.floor(eaten / 5) * 5 // 5개 먹을 때마다 보너스 증가
    length.value = snake.length
    sfx.correct()
    placeFood()
  } else snake.pop()
}

function finish() {
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { length: length.value, eaten } })
}

function draw() {
  const cs = getComputedStyle(canvas.value)
  const bg = cs.getPropertyValue('--board-bg').trim() || '#14162a'
  const grid = cs.getPropertyValue('--board-grid').trim() || '#23264a'
  const accent = cs.getPropertyValue('--accent').trim() || '#7c83ff'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL)
  ctx.strokeStyle = grid
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 1; i < COLS; i++) { ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, ROWS * CELL) }
  for (let i = 1; i < ROWS; i++) { ctx.moveTo(0, i * CELL); ctx.lineTo(COLS * CELL, i * CELL) }
  ctx.stroke()
  if (!snake.length) return
  ctx.font = `${CELL - 4}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('🍎', food.x * CELL + CELL / 2, food.y * CELL + CELL / 2 + 1)
  snake.forEach((s, i) => {
    ctx.globalAlpha = i === 0 ? 1 : Math.max(0.45, 1 - i * 0.025)
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, i === 0 ? 9 : 6)
    ctx.fill()
  })
  ctx.globalAlpha = 1
  const h = snake[0]
  ctx.fillStyle = '#fff'
  ;[[-4, -3], [4, -3]].forEach(([ox, oy]) => {
    ctx.beginPath()
    ctx.arc(h.x * CELL + CELL / 2 + ox + dir.x * 2, h.y * CELL + CELL / 2 + oy + dir.y * 2, 2.4, 0, Math.PI * 2)
    ctx.fill()
  })
}

function frame(t) {
  raf = requestAnimationFrame(frame)
  const dt = Math.min(t - last, 100)
  last = t
  if (status.value === 'playing') {
    acc += dt
    while (acc >= interval() && status.value === 'playing') { acc -= interval(); tick() }
  }
  draw()
}

const KEYS = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }
function onKey(e) {
  const d = KEYS[e.key]
  if (!d || status.value !== 'playing') return
  e.preventDefault()
  turn(...d)
}

let sx = 0, sy = 0
const onDown = (e) => { sx = e.clientX; sy = e.clientY }
function onUp(e) {
  const dx = e.clientX - sx, dy = e.clientY - sy
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
  Math.abs(dx) > Math.abs(dy) ? turn(dx > 0 ? 1 : -1, 0) : turn(0, dy > 0 ? 1 : -1)
}

onMounted(() => {
  ctx = canvas.value.getContext('2d')
  window.addEventListener('keydown', onKey)
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" title="스네이크 러시"
    desc="방향키/WASD(모바일은 스와이프나 버튼)로 사과를 먹으세요. 벽이나 몸에 부딪히면 끝! 먹을수록 빨라져요."
    :summary="`길이 ${length}`" @start="start">
    <div class="wrap">
      <GameHeader :stats="stats" @quit="finish" />
      <canvas ref="canvas" :width="COLS * CELL" :height="ROWS * CELL" @pointerdown="onDown" @pointerup="onUp" />
      <div class="dpad" aria-label="방향 버튼">
        <button class="up" aria-label="위" @click="turn(0, -1)">▲</button>
        <button class="lf" aria-label="왼쪽" @click="turn(-1, 0)">◀</button>
        <button class="rt" aria-label="오른쪽" @click="turn(1, 0)">▶</button>
        <button class="dn" aria-label="아래" @click="turn(0, 1)">▼</button>
      </div>
    </div>
  </GameScreen>
</template>

<style scoped>
.wrap { display: grid; gap: 4px; justify-items: center; }
.wrap > :first-child { width: 100%; }
canvas { display: block; width: min(100%, 480px); height: auto; border-radius: 14px; touch-action: none; border: 3px solid var(--line); }
.dpad { display: none; grid-template-areas: '. up .' 'lf . rt' '. dn .'; grid-template-columns: repeat(3, 64px); gap: 6px; margin-top: 10px; }
.dpad button { height: 52px; border: 0; border-radius: 14px; background: var(--surface-2); font-size: 20px; }
.dpad button:active { background: var(--accent); color: var(--accent-text); }
.up { grid-area: up; } .lf { grid-area: lf; } .rt { grid-area: rt; } .dn { grid-area: dn; }
@media (hover: none), (max-width: 700px) { .dpad { display: grid; } }
</style>
