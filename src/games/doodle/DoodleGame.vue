<script setup>
import { ref, computed, onMounted } from 'vue'
import Matter from 'matter-js'
import GameScreen from '../shared/GameScreen.vue'
import Icon from '../../components/Icon.vue'
import { useLater, useTimer, useLoop, hearts } from '../shared/kit'
import { setupCanvas, useThemeColors, drawPixel } from '../shared/canvas'
import { sfx } from '../shared/sfx'
import { W, H, BALL_R, LEVELS } from './levels'

defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])
const { Engine, Bodies, Body, Composite } = Matter

const STEP = 1000 / 60
const LEVEL_TIME = 40 // 단계를 불러온 순간부터 (그리는 시간 + 물리 시간)
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
const toast = ref('')
const canvas = ref(null)
const { later, clearAll } = useLater()
const timer = useTimer()

let engine = null, c2d = null, acc = 0
let balls = {}, statics = [], strokes = [], star = null
let phase = 'ready' // ready(첫 선을 그리기 전) | run | won | lost
let drawing = false, pts = []
const colors = useThemeColors(['board-bg', 'muted', 'text', 'accent'], () => render())

const level = computed(() => LEVELS[levelIdx.value])
const inkLeft = computed(() => Math.max(0, Math.round(((level.value.ink - inkUsed.value) / level.value.ink) * 100)))
const stats = computed(() => [
  { label: '단계', value: `${levelIdx.value + 1}/${LEVELS.length}` },
  { label: '점수', value: score.value },
  { label: '라이프', value: hearts(lives.value) },
  { label: '잉크', value: inkLeft.value + '%' },
])
const timerView = computed(() => ({ pct: timer.pct.value, text: timer.text.value, label: '시간' }))

function loadLevel(i) {
  if (engine) { Composite.clear(engine.world, false); Engine.clear(engine) } // 이전 물리 세계 정리
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
  acc = 0
  phase = 'ready'
  toast.value = ''
  if (status.value === 'playing') timer.start(LEVEL_TIME, () => finishLevel(false, '시간 초과'))
  render()
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
  render()
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
  render()
}

// ───── 규칙 판정 ─────
function checkRules() {
  for (const b of Object.values(balls)) {
    const p = b.position
    if (p.y > H + 80 || p.x < -80 || p.x > W + 80) return finishLevel(false, '공이 떨어졌어요')
  }
  const lv = level.value
  if (lv.goal === 'touch' && dist(balls.red.position, balls.blue.position) <= BALL_R * 2 + 2) return finishLevel(true)
  if (lv.goal === 'star' && dist(balls.red.position, star) <= BALL_R + 16) return finishLevel(true)
}

function finishLevel(ok, msg = '') {
  if (phase === 'won' || phase === 'lost') return
  drawing = false
  timer.stop()
  if (ok) {
    phase = 'won'
    const gain = Math.max(100, 300 + Math.round((1 - inkUsed.value / level.value.ink) * 100) - attempts.value * 30)
    score.value += gain
    cleared.value++
    toast.value = `클리어 +${gain}`
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

// 라이프를 잃지 않고 다시 그리기 (그린 선이 있을 때만 클리어 점수가 조금 깎임)
function redraw() {
  if (status.value !== 'playing' || phase === 'won' || phase === 'lost') return
  if (strokes.length) attempts.value++
  loadLevel(levelIdx.value)
}

function finish() {
  if (status.value !== 'playing') return
  clearAll()
  timer.stop()
  status.value = 'over'
  phase = 'lost'
  sfx.over()
  emit('gameover', { score: score.value, meta: { stage: levelIdx.value + 1, cleared: cleared.value } })
}

useLoop((dt) => {
  if (status.value !== 'playing' || phase !== 'run') return
  acc += Math.min(dt, 50)
  for (let n = 0; acc >= STEP && n < 3 && phase === 'run'; n++) {
    Engine.update(engine, STEP)
    acc -= STEP
    checkRules()
  }
}, render)

// ───── 렌더링 ─────
function fillBody(body) {
  const list = body.parts.length > 1 ? body.parts.slice(1) : body.parts
  for (const part of list) {
    const v = part.vertices
    c2d.beginPath()
    c2d.moveTo(v[0].x, v[0].y)
    for (let i = 1; i < v.length; i++) c2d.lineTo(v[i].x, v[i].y)
    c2d.closePath()
    c2d.fill()
  }
}

function render() {
  if (!c2d) return
  c2d.fillStyle = colors['board-bg']
  c2d.fillRect(0, 0, W, H)
  if (!engine) return
  c2d.fillStyle = colors.muted
  statics.forEach(fillBody)
  strokes.forEach((s) => {
    c2d.fillStyle = s.fixed ? colors.text : colors.accent
    c2d.globalAlpha = s.fixed ? 0.75 : 1
    s.bodies.forEach(fillBody)
  })
  c2d.globalAlpha = 1
  if (drawing && pts.length) { // 그리는 중인 선 미리보기
    c2d.strokeStyle = tool.value === 'fixed' ? colors.text : colors.accent
    c2d.globalAlpha = 0.6
    c2d.lineWidth = THICK
    c2d.lineCap = c2d.lineJoin = 'round'
    c2d.beginPath()
    pts.forEach((p, i) => (i ? c2d.lineTo(p.x, p.y) : c2d.moveTo(p.x, p.y)))
    if (pts.length === 1) c2d.lineTo(pts[0].x + 0.1, pts[0].y)
    c2d.stroke()
    c2d.globalAlpha = 1
  }
  if (star) drawPixel(c2d, 'star', star.x, star.y, 30)
  const ballColors = { red: '#FF4D6D', blue: '#3B82F6' }
  Object.entries(balls).forEach(([id, b]) => {
    c2d.fillStyle = ballColors[id]
    c2d.beginPath()
    c2d.arc(b.position.x, b.position.y, BALL_R, 0, Math.PI * 2)
    c2d.fill()
    c2d.strokeStyle = 'rgba(255,255,255,.85)' // 굴러가는 게 보이도록 한 줄 표시
    c2d.lineWidth = 2.5
    c2d.beginPath()
    c2d.moveTo(b.position.x, b.position.y)
    c2d.lineTo(b.position.x + Math.cos(b.angle) * BALL_R * 0.75, b.position.y + Math.sin(b.angle) * BALL_R * 0.75)
    c2d.stroke()
  })
}

onMounted(() => {
  c2d = setupCanvas(canvas.value, W, H)
  loadLevel(0)
})
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" :stats="stats" :timer="timerView" :toast="toast" title="낙서 물리학자"
    :summary="`${cleared}/${LEVELS.length} 단계 클리어`" @start="start" @quit="finish">
    <p class="goal">{{ level.hint }}</p>
    <canvas ref="canvas" class="board" @pointerdown.prevent="down" @pointermove.prevent="move" @pointerup="up" @pointercancel="up" />
    <template #controls>
      <div class="tools">
        <button class="tool" :class="{ on: tool === 'fixed' }" :aria-pressed="tool === 'fixed'" @click="tool = 'fixed'"><Icon name="pin" />고정 선</button>
        <button class="tool" :class="{ on: tool === 'heavy' }" :aria-pressed="tool === 'heavy'" @click="tool = 'heavy'"><Icon name="weight" />무거운 낙서</button>
        <button class="tool" @click="redraw"><Icon name="rotate" />다시 그리기</button>
      </div>
    </template>
  </GameScreen>
</template>

<style scoped>
.goal { margin: 0 0 8px; text-align: center; font-size: 14px; font-weight: 600; }
.board {
  display: block; width: min(100%, 38vh, 360px); aspect-ratio: 360 / 540; height: auto; margin: 0 auto; touch-action: none;
  border-radius: var(--r-md); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
}
.tools { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.tool {
  height: 48px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0 6px;
  border-radius: var(--r-btn2); border: var(--bw) solid var(--bc); background: var(--surface); color: var(--text);
  box-shadow: var(--sh-sm); font-size: 13px; font-weight: 700; white-space: nowrap;
}
.tool :deep(svg) { width: 18px; height: 18px; }
.tool.on { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
</style>
