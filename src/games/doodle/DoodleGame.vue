<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import Matter from 'matter-js'
import GameScreen from '../shared/GameScreen.vue'
import GameHeader from '../shared/GameHeader.vue'
import { useLater, hearts } from '../shared/kit'
import { sfx } from '../shared/sfx'
import { W, H, BALL_R, LEVELS } from './levels'

defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])
const { Engine, Bodies, Body, Composite } = Matter

const STEP = 1000 / 60
const TIME_LIMIT = 20 // 그린 뒤 20초 안에 못 풀면 실패
const THICK = 10
const FIXED_COST = 1.5

const status = ref('idle')
const levelIdx = ref(0)
const score = ref(0)
const lives = ref(3)
const cleared = ref(0)
const attempts = ref(0)
const tool = ref('fixed') // fixed(고정 선) | heavy(떨어지는 도형)
const inkUsed = ref(0)
const elapsed = ref(0)
const toast = ref('')
const canvas = ref(null)
const { later, clearAll } = useLater()

let engine, ctx, raf = 0, last = 0, acc = 0
let balls = {}, statics = [], strokes = [], star = null
let phase = 'ready' // ready(첫 선을 그리기 전) | run | won | lost
let drawing = false, pts = [], curCost = 0, dpr = 1

const level = computed(() => LEVELS[levelIdx.value])
const inkLeft = computed(() => Math.max(0, Math.round(((level.value.ink - inkUsed.value) / level.value.ink) * 100)))
const stats = computed(() => [
  { label: `STAGE ${levelIdx.value + 1}/${LEVELS.length}`, value: level.value.name },
  { label: '점수', value: score.value },
  { label: '라이프', value: hearts(lives.value) },
  { label: '잉크', value: inkLeft.value + '%' },
])

function loadLevel(i) {
  levelIdx.value = i
  const lv = LEVELS[i]
  engine = Engine.create()
  engine.gravity.y = 1
  statics = lv.statics.map((s) => Bodies.rectangle(s.x, s.y, s.w, s.h, { isStatic: true, angle: s.a, friction: 0.8, label: 'wall' }))
  balls = {}
  lv.balls.forEach((b) => {
    balls[b.id] = Bodies.circle(b.x, b.y, BALL_R, { label: b.id, restitution: 0.25, friction: 0.05, frictionAir: 0.002, density: 0.002 })
  })
  star = lv.star || null
  Composite.add(engine.world, [...statics, ...Object.values(balls)])
  strokes = []
  inkUsed.value = 0
  elapsed.value = 0
  acc = 0
  phase = 'ready'
  toast.value = ''
}

function start() {
  clearAll()
  score.value = 0; lives.value = 3; cleared.value = 0; attempts.value = 0
  status.value = 'playing'
  loadLevel(0)
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

// ───── 그린 선 → 물리 바디 ─────
function makeStroke(points, fixed) {
  const opts = { friction: 0.7, restitution: 0.1, density: 0.002 }
  const parts = []
  if (points.length < 2) {
    parts.push(Bodies.circle(points[0].x, points[0].y, THICK * 0.9, { isStatic: fixed }))
  } else {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1]
      parts.push(Bodies.rectangle((a.x + b.x) / 2, (a.y + b.y) / 2, dist(a, b) + 2, THICK, { angle: Math.atan2(b.y - a.y, b.x - a.x), isStatic: fixed }))
      parts.push(Bodies.circle(a.x, a.y, THICK / 2, { isStatic: fixed }))
    }
    const e = points[points.length - 1]
    parts.push(Bodies.circle(e.x, e.y, THICK / 2, { isStatic: fixed }))
  }
  if (fixed) { // 고정 선은 조각마다 독립된 정적 바디
    parts.forEach((p) => { p.friction = 0.8; p.label = 'ink' })
    Composite.add(engine.world, parts)
    return { fixed: true, bodies: parts }
  }
  const body = Body.create({ parts, ...opts, label: 'heavy' })
  Composite.add(engine.world, body)
  return { fixed: false, bodies: [body] }
}

function pos(e) {
  const r = canvas.value.getBoundingClientRect()
  return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height }
}
const unit = () => (tool.value === 'fixed' ? FIXED_COST : 1)

function down(e) {
  if (status.value !== 'playing' || (phase !== 'ready' && phase !== 'run')) return
  if (inkUsed.value >= level.value.ink) return
  drawing = true
  pts = [pos(e)]
  curCost = 0
  canvas.value.setPointerCapture?.(e.pointerId)
}
function move(e) {
  if (!drawing) return
  const p = pos(e)
  const d = dist(p, pts[pts.length - 1])
  if (d < 7) return
  if (inkUsed.value + d * unit() > level.value.ink) return up() // 잉크 소진 → 자동으로 선 끝
  pts.push(p)
  inkUsed.value += d * unit()
}
function up() {
  if (!drawing) return
  drawing = false
  const points = pts
  pts = []
  if (points.length === 1) {
    if (inkUsed.value + 12 > level.value.ink) return
    inkUsed.value += 12 // 점 하나 = 작은 공
  }
  strokes.push(makeStroke(points, tool.value === 'fixed'))
  sfx.tick()
  if (phase === 'ready') phase = 'run' // 첫 선을 그리면 물리 시작
}

// ───── 규칙 판정 ─────
function checkRules() {
  elapsed.value += STEP / 1000
  for (const b of Object.values(balls)) {
    const p = b.position
    if (p.y > H + 80 || p.x < -80 || p.x > W + 80) return finishLevel(false, '공이 떨어졌어요!')
  }
  const lv = level.value
  if (lv.goal === 'touch' && dist(balls.red.position, balls.blue.position) <= BALL_R * 2 + 2) return finishLevel(true)
  if (lv.goal === 'star' && dist(balls.red.position, star) <= BALL_R + 16) return finishLevel(true)
  if (elapsed.value > TIME_LIMIT) finishLevel(false, '시간 초과!')
}

function finishLevel(ok, msg = '') {
  if (phase === 'won' || phase === 'lost') return
  drawing = false
  if (ok) {
    phase = 'won'
    const gain = Math.max(100, 300 + Math.round((1 - inkUsed.value / level.value.ink) * 100) - attempts.value * 30)
    score.value += gain
    cleared.value++
    toast.value = `클리어! +${gain}`
    sfx.levelUp()
    later(() => {
      attempts.value = 0
      if (levelIdx.value >= LEVELS.length - 1) { score.value += 300; return finish() } // 전부 클리어 보너스
      loadLevel(levelIdx.value + 1)
    }, 1300)
  } else {
    phase = 'lost'
    lives.value--
    attempts.value++
    toast.value = msg
    sfx.wrong()
    later(() => (lives.value <= 0 ? finish() : loadLevel(levelIdx.value)), 1200)
  }
}

// 라이프를 잃지 않고 다시 그리기 (대신 클리어 점수가 조금 깎임)
function redraw() {
  if (status.value !== 'playing' || phase === 'won' || phase === 'lost') return
  attempts.value++
  loadLevel(levelIdx.value)
}

function finish() {
  clearAll()
  status.value = 'over'
  phase = 'lost'
  sfx.over()
  emit('gameover', { score: score.value, meta: { stage: levelIdx.value + 1, cleared: cleared.value } })
}

// ───── 렌더링 ─────
function fillBody(body) {
  const list = body.parts.length > 1 ? body.parts.slice(1) : body.parts
  for (const part of list) {
    const v = part.vertices
    ctx.beginPath()
    ctx.moveTo(v[0].x, v[0].y)
    for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y)
    ctx.closePath()
    ctx.fill()
  }
}

function render() {
  const cs = getComputedStyle(canvas.value)
  const css = (n, d) => cs.getPropertyValue(n).trim() || d
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = css('--board-bg', '#14162a')
  ctx.fillRect(0, 0, W, H)
  if (!engine) return
  ctx.fillStyle = css('--muted', '#888')
  statics.forEach(fillBody)
  const accent = css('--accent', '#7c83ff')
  strokes.forEach((s) => {
    ctx.fillStyle = s.fixed ? css('--text', '#fff') : accent
    ctx.globalAlpha = s.fixed ? 0.75 : 1
    s.bodies.forEach(fillBody)
  })
  ctx.globalAlpha = 1
  if (drawing && pts.length) { // 그리는 중인 선 미리보기
    ctx.strokeStyle = tool.value === 'fixed' ? css('--text', '#fff') : accent
    ctx.globalAlpha = 0.6
    ctx.lineWidth = THICK
    ctx.lineCap = ctx.lineJoin = 'round'
    ctx.beginPath()
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    if (pts.length === 1) ctx.lineTo(pts[0].x + 0.1, pts[0].y)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  if (star) {
    ctx.font = '30px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⭐', star.x, star.y)
  }
  const colors = { red: '#ff4d6d', blue: '#3b82f6' }
  Object.entries(balls).forEach(([id, b]) => {
    ctx.fillStyle = colors[id]
    ctx.beginPath()
    ctx.arc(b.position.x, b.position.y, BALL_R, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,.85)' // 굴러가는 게 보이도록 한 줄 표시
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(b.position.x, b.position.y)
    ctx.lineTo(b.position.x + Math.cos(b.angle) * BALL_R * 0.75, b.position.y + Math.sin(b.angle) * BALL_R * 0.75)
    ctx.stroke()
  })
}

function frame(t) {
  raf = requestAnimationFrame(frame)
  const dt = Math.min(t - last, 50)
  last = t
  if (status.value === 'playing' && phase === 'run') {
    acc += dt
    for (let n = 0; acc >= STEP && n < 3 && phase === 'run'; n++) {
      Engine.update(engine, STEP)
      acc -= STEP
      checkRules()
    }
  }
  render()
}

onMounted(() => {
  dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.value.width = W * dpr
  canvas.value.height = H * dpr
  ctx = canvas.value.getContext('2d')
  loadLevel(0)
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" title="낙서 물리학자"
    desc="손가락으로 선을 그려 빨간 공이 목표에 닿게 하세요. 🪨 무거운 낙서는 중력으로 떨어지고, 📌 고정 선은 그 자리에 박혀요. 잉크는 한정!"
    :summary="`${cleared}/${LEVELS.length} 스테이지 클리어`" @start="start">
    <div class="wrap">
      <GameHeader :stats="stats" @quit="finish" />
      <div class="tools">
        <button class="tool" :class="{ on: tool === 'fixed' }" @click="tool = 'fixed'">📌 고정 선 <small>잉크 ×1.5</small></button>
        <button class="tool" :class="{ on: tool === 'heavy' }" @click="tool = 'heavy'">🪨 무거운 낙서 <small>떨어져요</small></button>
        <button class="btn btn-sm" @click="redraw">↺ 다시 그리기</button>
      </div>
      <div class="stage">
        <canvas ref="canvas" @pointerdown.prevent="down" @pointermove.prevent="move" @pointerup="up" @pointercancel="up" />
        <p v-if="toast" class="toast" role="status">{{ toast }}</p>
      </div>
      <p class="hint">{{ level.hint }} · 첫 선을 그리면 시작돼요</p>
    </div>
  </GameScreen>
</template>

<style scoped>
.wrap { display: grid; gap: 8px; justify-items: center; }
.wrap > :first-child { width: 100%; }
.tools { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.tool { padding: 8px 14px; border-radius: 999px; border: 2px solid var(--line); background: var(--surface); font-weight: 700; font-size: 14px; }
.tool small { color: var(--muted); font-weight: 600; margin-left: 4px; }
.tool.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 18%, var(--surface)); }
.stage { position: relative; width: min(100%, 360px); }
canvas { display: block; width: 100%; aspect-ratio: 360 / 540; border-radius: 16px; touch-action: none; border: 3px solid var(--line); }
.toast { position: absolute; inset: 40% 0 auto; margin: 0; text-align: center; font-size: 26px; font-weight: 900; color: #fff; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6); pointer-events: none; }
.hint { margin: 0; font-size: 13px; color: var(--muted); text-align: center; }
</style>
