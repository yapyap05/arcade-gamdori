<script setup>
import { ref, computed } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import GameHeader from '../shared/GameHeader.vue'
import TimerBar from '../shared/TimerBar.vue'
import { useTimer, useLater, hearts } from '../shared/kit'
import { sfx } from '../shared/sfx'
import { generateLevel, createState, startPath, stepInto, isComplete, isSolved, ownerMap, rowCol } from './flowLogic'

const props = defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const PALETTE = ['#ff4d6d', '#3b82f6', '#22c55e', '#facc15', '#fb923c', '#22d3ee', '#a855f7', '#f472b6']
const SIZES = [4, 5, 6, 7]
const LIMIT = { 4: 45, 5: 75, 6: 110, 7: 150 }

const status = ref('idle')
const startStage = ref(0)
const size = ref(4)
const score = ref(0)
const lives = ref(3)
const cleared = ref(0)
const toast = ref('')
const locked = ref(true)
const st = ref(null)
const svg = ref(null)
let level = null
let active = -1
let startIdx = 0

const timer = useTimer()
const { later, clearAll } = useLater()

const owner = computed(() => (st.value ? ownerMap(st.value) : []))
const filled = computed(() => owner.value.filter((o) => o >= 0).length)
const linked = computed(() => (st.value ? level.pairs.filter((p) => isComplete(st.value, p.k)).length : 0))
const stats = computed(() => [
  { label: '크기', value: `${size.value}x${size.value}` },
  { label: '점수', value: score.value },
  { label: '라이프', value: hearts(lives.value) },
  { label: '연결', value: `${linked.value}/${size.value}` },
  { label: '채움', value: `${filled.value}/${size.value * size.value}` },
])

const pts = (p) => p.map((i) => { const [r, c] = rowCol(size.value, i); return `${(c + 0.5) * 100},${(r + 0.5) * 100}` }).join(' ')
const center = (i) => { const [r, c] = rowCol(size.value, i); return { x: (c + 0.5) * 100, y: (r + 0.5) * 100 } }
const dots = computed(() => (level ? level.pairs.flatMap((p) => [p.a, p.b].map((i) => ({ i, k: p.k, ...center(i) }))) : []))

function start() {
  startIdx = props.mode === 'casual' ? startStage.value : 0
  score.value = 0; lives.value = 3; cleared.value = 0
  status.value = 'playing'
  newLevel()
}

function newLevel() {
  size.value = SIZES[Math.min(SIZES.length - 1, startIdx + Math.floor(cleared.value / 3))]
  level = generateLevel(size.value, size.value)
  st.value = createState(level)
  toast.value = ''
  active = -1
  locked.value = false
  timer.start(LIMIT[size.value], onTimeout)
}

const resetBoard = () => { if (!locked.value) st.value = createState(level) }

function cellAt(e) {
  const r = svg.value.getBoundingClientRect()
  const n = size.value
  const c = Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * n)))
  const row = Math.min(n - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * n)))
  return row * n + c
}

function down(e) {
  if (locked.value) return
  const k = startPath(st.value, cellAt(e))
  if (k < 0) return
  active = k
  svg.value.setPointerCapture?.(e.pointerId)
  sfx.tick()
}

function move(e) {
  if (active < 0 || locked.value) return
  const n = size.value
  const target = cellAt(e)
  const s = st.value
  for (let guard = 0; guard < 30; guard++) { // 손가락이 빨리 움직여도 칸을 건너뛰지 않게 한 칸씩 따라감
    const p = s.paths[active]
    const cur = p[p.length - 1]
    if (cur === target) break
    const [cr, cc] = rowCol(n, cur)
    const [tr, tc] = rowCol(n, target)
    const dr = tr - cr, dc = tc - cc
    const next = Math.abs(dr) >= Math.abs(dc) ? cur + Math.sign(dr) * n : cur + Math.sign(dc)
    if (!stepInto(s, active, next)) break
  }
  if (isSolved(s)) solved()
}

function up() {
  if (active >= 0 && isComplete(st.value, active)) sfx.correct()
  active = -1
}

function solved() {
  if (locked.value) return
  locked.value = true
  active = -1
  const remain = timer.remain.value
  timer.stop()
  const gain = size.value * size.value * 10 + Math.floor(remain) * 2
  score.value += gain
  cleared.value++
  toast.value = `완성! +${gain}`
  sfx.levelUp()
  later(newLevel, 1000)
}

function onTimeout() {
  locked.value = true
  active = -1
  lives.value--
  toast.value = '시간 초과!'
  sfx.wrong()
  later(() => (lives.value <= 0 ? finish() : newLevel()), 1100)
}

function finish() {
  clearAll(); timer.stop()
  locked.value = true
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { size: size.value, cleared: cleared.value } })
}
</script>

<template>
  <GameScreen v-model:stage="startStage" :status="status" :mode="mode" :score="score"
    :stages="SIZES.map((s) => `${s}x${s}부터`)" title="이어줘! 색줄이"
    desc="같은 색 점끼리 선으로 이어 보세요. 선은 서로 겹칠 수 없고, 모든 칸을 채워야 완성! 시간 안에 못 풀면 라이프가 줄어요."
    :summary="`${size}x${size} · ${cleared}판 완성`" @start="start">
    <div class="wrap">
      <GameHeader :stats="stats" @quit="finish" />
      <TimerBar :pct="timer.pct.value" :text="timer.text.value" label="남은 시간" />
      <div class="boardwrap">
        <svg v-if="st" ref="svg" class="board" :viewBox="`0 0 ${size * 100} ${size * 100}`"
          @pointerdown.prevent="down" @pointermove.prevent="move" @pointerup="up" @pointercancel="up">
          <rect :width="size * 100" :height="size * 100" rx="18" class="bg" />
          <rect v-for="(o, i) in owner" v-show="o >= 0" :key="'f' + i" :x="(i % size) * 100" :y="Math.floor(i / size) * 100" width="100" height="100" :fill="PALETTE[o]" fill-opacity="0.22" />
          <g class="grid">
            <line v-for="i in size - 1" :key="'v' + i" :x1="i * 100" y1="0" :x2="i * 100" :y2="size * 100" />
            <line v-for="i in size - 1" :key="'h' + i" x1="0" :y1="i * 100" :x2="size * 100" :y2="i * 100" />
          </g>
          <polyline v-for="(p, k) in st.paths" :key="'p' + k" :points="pts(p)" :stroke="PALETTE[k]" class="line" />
          <circle v-for="d in dots" :key="'d' + d.i" :cx="d.x" :cy="d.y" r="30" :fill="PALETTE[d.k]" class="dot" />
        </svg>
        <p class="toast" role="status">{{ toast }}</p>
      </div>
      <button class="btn btn-sm reset" :disabled="locked" @click="resetBoard">선 지우기</button>
    </div>
  </GameScreen>
</template>

<style scoped>
.wrap { display: grid; gap: 10px; justify-items: center; }
.wrap > :nth-child(-n + 2) { width: 100%; }
.boardwrap { position: relative; width: min(100%, 460px); }
.board { display: block; width: 100%; height: auto; touch-action: none; border-radius: 18px; }
.bg { fill: var(--board-bg); }
.grid line { stroke: var(--board-grid); stroke-width: 3; }
.line { fill: none; stroke-width: 36; stroke-linecap: round; stroke-linejoin: round; opacity: 0.95; pointer-events: none; }
.dot { pointer-events: none; }
.toast { position: absolute; inset: auto 0 8px; margin: 0; text-align: center; font-weight: 900; color: var(--text); text-shadow: 0 0 8px var(--bg); pointer-events: none; }
.reset { justify-self: end; }
</style>
