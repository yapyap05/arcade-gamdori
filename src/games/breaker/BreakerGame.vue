<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import GameHeader from '../shared/GameHeader.vue'
import { useLater, hearts } from '../shared/kit'
import { sfx } from '../shared/sfx'

defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const W = 700, H = 400
const COLS = 8, BW = 75, BH = 22, GAP = 10, TOP = 50, LEFT = 15
const PADDLE_Y = H - 20

const status = ref('idle')
const level = ref(1)
const lives = ref(3)
const score = ref(0)
const seconds = ref(0)
const banner = ref('')
const canvas = ref(null)
const { later, clearAll } = useLater()

let ctx, raf = 0, last = 0, blocks = [], running = false
let speedMul = 1, levelStart = 0, destroyed = 0
const paddle = { w: 100, h: 12, x: W / 2 - 50, speed: 8, left: false, right: false }
const ball = { r: 8, x: 0, y: 0, dx: 4, dy: -4 }

const stats = computed(() => [
  { label: 'STAGE', value: level.value },
  { label: '라이프', value: hearts(lives.value) },
  { label: '점수', value: score.value },
  { label: '시간', value: seconds.value + 's' },
])

function initBlocks() {
  const rows = Math.min(4 + Math.floor(level.value / 2), 8)
  blocks = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: COLS }, () => ({ alive: true, color: `hsl(${r * 40 + 200} 70% 60%)` })))
}
function initBall() {
  ball.x = W / 2
  ball.y = H - 60
  ball.dx = (Math.random() > 0.5 ? 4 : -4) * speedMul
  ball.dy = -4 * speedMul
}

function start() {
  level.value = 1; lives.value = 3; score.value = 0; speedMul = 1; destroyed = 0
  status.value = 'playing'
  startLevel()
}
function startLevel() {
  initBlocks(); initBall()
  banner.value = ''
  levelStart = Date.now()
  seconds.value = 0
  running = true
}

function loseLife() {
  running = false
  lives.value--
  sfx.wrong()
  if (lives.value <= 0) return finish()
  banner.value = 'LIFE LOST ⚠️'
  later(() => { banner.value = ''; initBall(); running = true }, 1200)
}

function clearLevel() {
  running = false
  score.value += level.value * 100
  sfx.levelUp()
  banner.value = `STAGE ${level.value} CLEAR! 🎉`
  later(() => { level.value++; speedMul += 0.15; startLevel() }, 1800)
}

function finish() {
  clearAll()
  running = false
  banner.value = ''
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { level: level.value, blocks: destroyed } })
}

function step(k) {
  // 벽
  if (ball.x + ball.dx * k > W - ball.r || ball.x + ball.dx * k < ball.r) ball.dx *= -1
  if (ball.y + ball.dy * k < ball.r) ball.dy *= -1
  // 패들
  if (ball.dy > 0 && ball.y + ball.r >= PADDLE_Y && ball.y - ball.r <= PADDLE_Y + paddle.h) {
    if (ball.x > paddle.x - 4 && ball.x < paddle.x + paddle.w + 4) {
      const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2)
      ball.dx = hit * 5 * speedMul
      ball.dy = -Math.abs(ball.dy)
      sfx.tick()
    }
  }
  if (ball.y > H + ball.r) return loseLife()
  // 벽돌 (공의 원이 사각형과 겹치는지 검사)
  for (let r = 0; r < blocks.length; r++) {
    for (let c = 0; c < COLS; c++) {
      const b = blocks[r][c]
      if (!b.alive) continue
      const bx = c * (BW + GAP) + LEFT, by = r * (BH + GAP) + TOP
      const nx = Math.max(bx, Math.min(ball.x, bx + BW))
      const ny = Math.max(by, Math.min(ball.y, by + BH))
      if ((ball.x - nx) ** 2 + (ball.y - ny) ** 2 > ball.r ** 2) continue
      b.alive = false
      destroyed++
      score.value += 10
      sfx.tick()
      // 좌우에서 부딪혔으면 dx, 아니면 dy 반전
      const fromSide = ball.y > by && ball.y < by + BH && (ball.x < bx || ball.x > bx + BW)
      if (fromSide) ball.dx *= -1
      else ball.dy *= -1
      if (blocks.every((row) => row.every((x) => !x.alive))) return clearLevel()
      c = COLS // 프레임당 한 개만
      r = blocks.length
      break
    }
  }
  ball.x += ball.dx * k
  ball.y += ball.dy * k
  if (paddle.left && paddle.x > 0) paddle.x -= paddle.speed * k
  if (paddle.right && paddle.x < W - paddle.w) paddle.x += paddle.speed * k
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x))
  seconds.value = Math.floor((Date.now() - levelStart) / 1000)
}

function draw() {
  const cs = getComputedStyle(canvas.value)
  ctx.fillStyle = cs.getPropertyValue('--board-bg').trim() || '#14162a'
  ctx.fillRect(0, 0, W, H)
  blocks.forEach((row, r) => row.forEach((b, c) => {
    if (!b.alive) return
    ctx.fillStyle = b.color
    ctx.beginPath()
    ctx.roundRect(c * (BW + GAP) + LEFT, r * (BH + GAP) + TOP, BW, BH, 5)
    ctx.fill()
  }))
  ctx.fillStyle = cs.getPropertyValue('--accent').trim() || '#7c83ff'
  ctx.beginPath()
  ctx.roundRect(paddle.x, PADDLE_Y, paddle.w, paddle.h, 6)
  ctx.fill()
  ctx.fillStyle = cs.getPropertyValue('--text').trim() || '#fff'
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
  ctx.fill()
}

function frame(t) {
  raf = requestAnimationFrame(frame)
  const k = Math.min((t - last) / 16.667, 2) || 1 // 주사율과 무관하게 같은 속도
  last = t
  if (running) step(k)
  if (ctx) draw()
}

function onKey(e, down) {
  if (e.code === 'ArrowLeft') { paddle.left = down; if (status.value === 'playing') e.preventDefault() }
  if (e.code === 'ArrowRight') { paddle.right = down; if (status.value === 'playing') e.preventDefault() }
}
const kd = (e) => onKey(e, true)
const ku = (e) => onKey(e, false)

function onPointer(e) {
  if (status.value !== 'playing') return
  const rect = canvas.value.getBoundingClientRect()
  paddle.x = Math.max(0, Math.min(W - paddle.w, ((e.clientX - rect.left) / rect.width) * W - paddle.w / 2))
}

onMounted(() => {
  ctx = canvas.value.getContext('2d')
  initBlocks()
  window.addEventListener('keydown', kd)
  window.addEventListener('keyup', ku)
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', kd)
  window.removeEventListener('keyup', ku)
})
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" title="벽돌 철거맨"
    desc="← → 키(또는 마우스·터치)로 패들을 움직여 모든 벽돌을 부수세요. 패들 가장자리에 맞추면 각도가 바뀌어요."
    :summary="`STAGE ${level} · 벽돌 ${destroyed}개 철거`" @start="start">
    <div class="wrap">
      <GameHeader :stats="stats" @quit="finish" />
      <div class="stage">
        <canvas ref="canvas" :width="W" :height="H" @pointermove="onPointer" @pointerdown="onPointer" />
        <div v-if="banner" class="banner">{{ banner }}</div>
      </div>
    </div>
  </GameScreen>
</template>

<style scoped>
.wrap { display: grid; gap: 4px; }
.stage { position: relative; }
canvas { display: block; width: 100%; height: auto; border-radius: 14px; touch-action: none; }
.banner { position: absolute; inset: 0; display: grid; place-items: center; font-size: 30px; font-weight: 900; color: #fff; background: rgba(12, 14, 34, 0.55); border-radius: 14px; }
</style>
