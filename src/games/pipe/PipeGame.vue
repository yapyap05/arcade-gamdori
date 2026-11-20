<script setup>
import { ref, computed } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import { useTimer, useLater, randInt, shuffle, hearts } from '../shared/kit'
import { sfx } from '../shared/sfx'

const props = defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const STAGES = [
  { size: 3, limit: 20, label: '1단계: 3x3' },
  { size: 4, limit: 40, label: '2단계: 4x4' },
  { size: 5, limit: 60, label: '3단계: 5x5' },
  { size: 6, limit: 80, label: '4단계: 6x6' },
  { size: 7, limit: 100, label: '5단계: 7x7' },
]
const LAST_BONUS = 200 // 마지막 단계에서 판을 깰 때마다 추가 보너스
// 방향 인덱스: 0=위 1=오른쪽 2=아래 3=왼쪽 / 기본 모양 [위, 오른, 아래, 왼]
const BASE = { I: [1, 0, 1, 0], L: [1, 1, 0, 0] }
const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]]

const status = ref('idle')
const startStage = ref(0)
const stageIdx = ref(0)
const score = ref(0)
const lives = ref(3)
const cleared = ref(0)
const grid = ref([])
const locked = ref(true)
const toast = ref('')

const timer = useTimer()
const { later, clearAll } = useLater()

const size = computed(() => STAGES[stageIdx.value].size)
const stats = computed(() => [
  { label: '단계', value: stageIdx.value + 1 },
  { label: '점수', value: score.value },
  { label: '라이프', value: hearts(lives.value) },
])
const timerView = computed(() => ({ pct: timer.pct.value, text: timer.text.value, label: '시간' }))

const opens = (t) => {
  const o = [0, 0, 0, 0]
  BASE[t.type].forEach((v, i) => { o[(i + t.rot) % 4] = v })
  return o
}

function flow(g = grid.value) {
  const n = g.length
  const seen = new Set()
  const stack = [[0, 0]]
  while (stack.length) {
    const [y, x] = stack.pop()
    const key = y * n + x
    if (seen.has(key)) continue
    seen.add(key)
    const cur = opens(g[y][x])
    DIRS.forEach(([dy, dx], d) => {
      const ny = y + dy, nx = x + dx
      if (ny < 0 || ny >= n || nx < 0 || nx >= n) return
      if (cur[d] && opens(g[ny][nx])[(d + 2) % 4]) stack.push([ny, nx])
    })
  }
  return seen
}
const connected = computed(() => flow())

/**
 * S(0,0) → E(n-1,n-1) 경로: 상하좌우로 굽이치는 무작위 경로 (자기 자신과 겹치지 않음)
 * 무작위 깊이 우선 탐색 + 되돌아가기. 실패하면 오른쪽/아래로만 가는 경로로 대체
 */
function randomPath(n) {
  const target = n * n - 1
  const seen = new Set([0])
  const path = [0]
  let budget = 4000
  function dfs(cur) {
    if (cur === target) return true
    if (--budget <= 0) return false
    const y = Math.floor(cur / n), x = cur % n
    for (const [dy, dx] of shuffle(DIRS)) {
      const ny = y + dy, nx = x + dx
      const next = ny * n + nx
      if (ny < 0 || ny >= n || nx < 0 || nx >= n || seen.has(next)) continue
      // E 칸은 위/왼쪽에서만 들어갈 수 있음 (E 타일 모양 고정)
      if (next === target && !(dy === 1 || dx === 1)) continue
      seen.add(next); path.push(next)
      if (dfs(next)) return true
      seen.delete(next); path.pop()
    }
    return false
  }
  if (dfs(0)) return path
  const out = [0]
  let y = 0, x = 0
  while (y < n - 1 || x < n - 1) {
    if (x === n - 1 || (y < n - 1 && Math.random() < 0.5)) y++
    else x++
    out.push(y * n + x)
  }
  return out
}

// 반드시 풀 수 있는 판: 경로 위 칸은 직선/곡선 모양을 맞추고, 모든 칸의 회전을 섞는다
function makeBoard(n) {
  for (;;) {
    const g = Array.from({ length: n }, () => Array.from({ length: n }, () => ({ type: Math.random() < 0.5 ? 'I' : 'L', rot: randInt(0, 3), fixed: false })))
    const path = randomPath(n)
    path.forEach((cell, i) => {
      if (i === 0 || i === path.length - 1) return
      const p = path[i - 1], q = path[i + 1]
      const straight = Math.floor(p / n) === Math.floor(q / n) || p % n === q % n
      g[Math.floor(cell / n)][cell % n].type = straight ? 'I' : 'L'
    })
    g[0][0] = { type: 'L', rot: 1, fixed: true, start: true } // 오른쪽·아래로 열림
    g[n - 1][n - 1] = { type: 'L', rot: 3, fixed: true, end: true } // 왼쪽·위로 열림
    if (!flow(g).has(n * n - 1)) return g // 처음부터 연결된 판은 제외
  }
}

function start() {
  stageIdx.value = props.mode === 'casual' ? startStage.value : 0
  score.value = 0; lives.value = 3; cleared.value = 0
  status.value = 'playing'
  newBoard()
}

function newBoard() {
  grid.value = makeBoard(size.value)
  locked.value = false
  toast.value = ''
  timer.start(STAGES[stageIdx.value].limit, onTimeout)
}

function rotate(t) {
  if (locked.value || t.fixed) return
  t.rot = (t.rot + 1) % 4
  sfx.tick()
  if (connected.value.has(size.value * size.value - 1)) onSuccess()
}

function onSuccess() {
  locked.value = true
  const remain = timer.remain.value
  timer.stop()
  sfx.correct()
  const last = stageIdx.value === STAGES.length - 1
  const gain = (stageIdx.value + 1) * 100 + Math.floor(remain * 2) + (last ? LAST_BONUS : 0)
  score.value += gain
  cleared.value++
  toast.value = `연결 성공 +${gain}`
  later(() => {
    stageIdx.value = Math.min(stageIdx.value + 1, STAGES.length - 1)
    newBoard()
  }, 1200)
}

function onTimeout() {
  locked.value = true
  lives.value--
  sfx.wrong()
  toast.value = '시간 초과'
  later(() => (lives.value <= 0 ? finish() : newBoard()), 1200)
}

function finish() {
  clearAll()
  timer.stop()
  locked.value = true
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { stage: stageIdx.value + 1, cleared: cleared.value } })
}
</script>

<template>
  <GameScreen v-model:stage="startStage" :status="status" :mode="mode" :score="score" :stats="stats" :timer="timerView" :toast="toast"
    :stages="STAGES.map((s) => s.label)" title="파이프정비기사"
    :summary="`${stageIdx + 1}단계 · ${cleared}판 연결`" @start="start" @quit="finish">
    <div class="board">
      <div class="grid" :style="{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }">
        <template v-for="(row, y) in grid" :key="y">
          <button v-for="(t, x) in row" :key="x" class="tile" :class="{ fixed: t.fixed, on: connected.has(y * size + x) }"
            :aria-label="`${y + 1}행 ${x + 1}열 회전`" @click="rotate(t)">
            <svg viewBox="0 0 100 100" :style="{ transform: `rotate(${t.rot * 90}deg)` }" aria-hidden="true">
              <line v-if="t.type === 'I'" x1="50" y1="0" x2="50" y2="100" />
              <path v-else d="M50,0 Q50,50 100,50" />
            </svg>
            <b v-if="t.start" class="tag">S</b>
            <b v-else-if="t.end" class="tag">E</b>
          </button>
        </template>
      </div>
    </div>
  </GameScreen>
</template>

<style scoped>
.board {
  width: min(100%, 420px); aspect-ratio: 1; margin: 0 auto; padding: 10px;
  border-radius: var(--r-md); background: var(--board-bg); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
}
.grid { display: grid; gap: 4px; height: 100%; }
.tile {
  position: relative; padding: 0; aspect-ratio: 1;
  border-radius: 10px; border: var(--bw) solid var(--bc); background: var(--surface);
}
.tile.fixed { background: var(--surface-2); }
.tile svg { width: 100%; height: 100%; transition: transform 0.15s; }
.tile svg * { stroke: var(--muted); stroke-width: 14; fill: none; stroke-linecap: round; }
.tile.on svg * { stroke: var(--accent); }
.tile.on { box-shadow: 0 0 0 2px var(--accent) inset; }
.tag {
  position: absolute; top: 2px; left: 4px; padding: 0 5px; border-radius: 6px;
  font-family: var(--font-num); font-size: 11px; background: var(--accent); color: var(--accent-text);
}
</style>
