<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import { useLater, useLoop, hearts } from '../shared/kit'
import { useGameCtx } from '../shared/context'
import { setupCanvas, useThemeColors, drawPixel } from '../shared/canvas'
import { sfx } from '../shared/sfx'

defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

// 세로형 판 (논리 크기)
const W = 360, H = 540
const COLS = 6, GAP = 8, LEFT = 12, TOP = 56, BH = 18
const BW = (W - LEFT * 2 - GAP * (COLS - 1)) / COLS
const PADDLE_Y = H - 34
const ROW_COLORS = ['#FF5A3C', '#FB923C', '#FFC62B', '#27B36A', '#22D3EE', '#2F6BFF', '#A855F7', '#F87171']
const BALL_R = 7

/* ───── 특수 캐릭터 (2단계부터) ─────
 * 벽돌이 깨질 때 확률로 떨어짐. 패들로 받아야 효과
 *  kim    김부장     : 생명 +1 (생명이 최대면 나오지 않음)
 *  rookie 무개념 신입 : 공이 2개로
 */
const MAX_LIVES = 5
const DROP_SIZE = 30
const DROP_SPEED = 2.2
const dropChance = (lv) => (lv < 2 ? 0 : Math.min(0.15, 0.04 + (lv - 2) * 0.02))

const status = ref('idle')
const level = ref(1)
const lives = ref(3)
const score = ref(0)
const toast = ref('')
const canvas = ref(null)
const ctx = useGameCtx()
const { later, clearAll } = useLater()

let c2d = null, blocks = [], running = false
let speedMul = 1, destroyed = 0
let balls = [] // { x, y, dx, dy }
let drops = [] // { type, x, y }
const paddle = { w: 80, h: 12, x: W / 2 - 40, speed: 7, left: false, right: false }
const colors = useThemeColors(['board-bg', 'accent', 'text'], () => draw())

const stats = computed(() => [
  { label: '단계', value: level.value },
  { label: '점수', value: score.value },
  { label: '라이프', value: hearts(lives.value) },
])

function initBlocks() {
  const rows = Math.min(4 + Math.floor(level.value / 2), 8)
  blocks = Array.from({ length: rows }, (_, r) => Array.from({ length: COLS }, () => ({ alive: true, color: ROW_COLORS[r % ROW_COLORS.length] })))
}
function newBall(x = W / 2, y = PADDLE_Y - 40, dir = Math.random() > 0.5 ? 1 : -1) {
  return { x, y, dx: 3.5 * dir * speedMul, dy: -3.5 * speedMul }
}
function resetBalls() {
  balls = [newBall()]
  drops = []
}

function start() {
  level.value = 1; lives.value = 3; score.value = 0; speedMul = 1; destroyed = 0
  paddle.x = W / 2 - paddle.w / 2
  status.value = 'playing'
  startLevel()
}
function startLevel() {
  initBlocks(); resetBalls()
  toast.value = ''
  running = true
}

function loseLife() {
  running = false
  lives.value--
  sfx.wrong()
  if (lives.value <= 0) return finish()
  toast.value = '공을 놓쳤어요'
  later(() => { toast.value = ''; resetBalls(); running = true }, 1200)
}

function clearLevel() {
  running = false
  const gain = level.value * 100
  score.value += gain
  sfx.levelUp()
  toast.value = `${level.value}단계 클리어 +${gain}`
  later(() => { level.value++; speedMul += 0.12; startLevel() }, 1600)
}

function finish() {
  if (status.value !== 'playing') return
  clearAll()
  running = false
  toast.value = ''
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { level: level.value, blocks: destroyed } })
}

function flash(msg) {
  toast.value = msg
  later(() => { if (toast.value === msg) toast.value = '' }, 1400)
}

// 벽돌이 깨진 자리에서 특수 캐릭터가 떨어질지 결정
function maybeDrop(x, y) {
  if (Math.random() >= dropChance(level.value)) return
  const canKim = lives.value < MAX_LIVES
  const type = canKim && Math.random() < 0.5 ? 'kim' : 'rookie'
  drops.push({ type, x, y })
}

function catchDrop(d) {
  if (d.type === 'kim') {
    if (lives.value < MAX_LIVES) lives.value++
    flash('김부장 등장! 생명 +1')
  } else {
    const b = balls[0] ?? newBall()
    balls.push({ x: b.x, y: b.y, dx: -b.dx || 3.5 * speedMul, dy: -Math.abs(b.dy) })
    flash('무개념 신입 등장! 공이 2개')
  }
  sfx.levelUp()
}

// 한 번에 공의 반지름 절반 이하로만 움직이도록 잘게 나눠 계산 (빠른 공이 벽돌을 뚫지 않게)
function step(k) {
  for (const b of [...balls]) {
    const dist = Math.max(Math.abs(b.dx), Math.abs(b.dy)) * k
    const n = Math.max(1, Math.ceil(dist / (BALL_R / 2)))
    for (let i = 0; i < n && running && balls.includes(b); i++) substep(b, k / n)
    if (!running) return
  }
  // 떨어지는 캐릭터
  drops = drops.filter((d) => {
    d.y += DROP_SPEED * k
    const caught = d.y + DROP_SIZE / 2 >= PADDLE_Y && d.y - DROP_SIZE / 2 <= PADDLE_Y + paddle.h &&
      d.x > paddle.x - DROP_SIZE / 2 && d.x < paddle.x + paddle.w + DROP_SIZE / 2
    if (caught) { catchDrop(d); return false }
    return d.y < H + DROP_SIZE
  })
  if (paddle.left) paddle.x -= paddle.speed * k
  if (paddle.right) paddle.x += paddle.speed * k
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x))
}

function substep(b, k) {
  b.x += b.dx * k
  b.y += b.dy * k
  // 벽 (위치를 안쪽으로 되돌려 벽에 붙지 않게)
  if (b.x < BALL_R) { b.x = BALL_R; b.dx = Math.abs(b.dx) }
  if (b.x > W - BALL_R) { b.x = W - BALL_R; b.dx = -Math.abs(b.dx) }
  if (b.y < BALL_R) { b.y = BALL_R; b.dy = Math.abs(b.dy) }
  // 패들
  if (b.dy > 0 && b.y + BALL_R >= PADDLE_Y && b.y - BALL_R <= PADDLE_Y + paddle.h &&
      b.x > paddle.x - 4 && b.x < paddle.x + paddle.w + 4) {
    const hit = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2)
    b.dx = hit * 4.5 * speedMul
    b.dy = -Math.abs(b.dy)
    b.y = PADDLE_Y - BALL_R
    sfx.tick()
  }
  // 바닥으로 빠짐 → 공이 하나도 안 남으면 생명 -1
  if (b.y > H + BALL_R) {
    balls = balls.filter((x) => x !== b)
    if (!balls.length) loseLife()
    return
  }
  // 벽돌 (공의 원이 사각형과 겹치는지 검사, 한 번에 하나)
  for (let r = 0; r < blocks.length; r++) {
    for (let c = 0; c < COLS; c++) {
      const blk = blocks[r][c]
      if (!blk.alive) continue
      const bx = LEFT + c * (BW + GAP), by = TOP + r * (BH + GAP)
      const nx = Math.max(bx, Math.min(b.x, bx + BW))
      const ny = Math.max(by, Math.min(b.y, by + BH))
      if ((b.x - nx) ** 2 + (b.y - ny) ** 2 > BALL_R ** 2) continue
      blk.alive = false
      destroyed++
      score.value += 10
      sfx.tick()
      const fromSide = b.y > by && b.y < by + BH && (b.x < bx || b.x > bx + BW)
      if (fromSide) b.dx = b.x < bx ? -Math.abs(b.dx) : Math.abs(b.dx)
      else b.dy = b.y < by ? -Math.abs(b.dy) : Math.abs(b.dy)
      maybeDrop(bx + BW / 2, by + BH / 2)
      if (blocks.every((row) => row.every((x) => !x.alive))) clearLevel()
      return
    }
  }
}

useLoop((dt) => {
  if (running) step(Math.min(dt / 16.667, 2))
}, draw)

function draw() {
  if (!c2d) return
  c2d.fillStyle = colors['board-bg']
  c2d.fillRect(0, 0, W, H)
  blocks.forEach((row, r) => row.forEach((blk, c) => {
    if (!blk.alive) return
    c2d.fillStyle = blk.color
    c2d.beginPath()
    c2d.roundRect(LEFT + c * (BW + GAP), TOP + r * (BH + GAP), BW, BH, 4)
    c2d.fill()
  }))
  drops.forEach((d) => drawPixel(c2d, d.type, d.x, d.y, DROP_SIZE))
  c2d.fillStyle = colors.accent
  c2d.beginPath()
  c2d.roundRect(paddle.x, PADDLE_Y, paddle.w, paddle.h, 6)
  c2d.fill()
  if (status.value === 'playing') {
    c2d.fillStyle = colors.text
    balls.forEach((b) => {
      c2d.beginPath()
      c2d.arc(b.x, b.y, BALL_R, 0, Math.PI * 2)
      c2d.fill()
    })
  }
}

/* ───── 입력: 키보드(누르는 동안 이동) + 끌기 ───── */
function onKey(e, down) {
  if (ctx.paused || status.value !== 'playing') return
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') { paddle.left = down; e.preventDefault() }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') { paddle.right = down; e.preventDefault() }
}
const kd = (e) => onKey(e, true)
const ku = (e) => onKey(e, false)
function onPointer(e) {
  if (status.value !== 'playing' || ctx.paused) return
  const rect = canvas.value.getBoundingClientRect()
  paddle.x = Math.max(0, Math.min(W - paddle.w, ((e.clientX - rect.left) / rect.width) * W - paddle.w / 2))
}

onMounted(() => {
  c2d = setupCanvas(canvas.value, W, H)
  initBlocks()
  resetBalls()
  draw()
  window.addEventListener('keydown', kd)
  window.addEventListener('keyup', ku)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', kd)
  window.removeEventListener('keyup', ku)
})
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" :stats="stats" :toast="toast"
    :summary="`${level}단계 · 벽돌 ${destroyed}개`" @start="start" @quit="finish">
    <canvas ref="canvas" class="board" @pointermove="onPointer" @pointerdown="onPointer" />
  </GameScreen>
</template>

<style scoped>
.board {
  display: block; width: min(100%, 38vh, 360px); aspect-ratio: 360 / 540; height: auto; margin: 0 auto; touch-action: none;
  border-radius: var(--r-md); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
}
</style>
