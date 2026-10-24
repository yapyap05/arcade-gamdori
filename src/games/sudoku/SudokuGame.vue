<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import GameHeader from '../shared/GameHeader.vue'
import { shuffle } from '../shared/kit'
import { sfx } from '../shared/sfx'

defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const DIFFS = [
  { id: 'easy', label: '쉬움 (30칸 제거)', remove: 30, base: 1000 },
  { id: 'medium', label: '보통 (45칸 제거)', remove: 45, base: 2000 },
  { id: 'hard', label: '어려움 (60칸 제거)', remove: 60, base: 3000 },
]

const status = ref('idle')
const diffIdx = ref(0)
const given = ref(Array(81).fill(0))
const values = ref(Array(81).fill(0))
const sel = ref(-1)
const elapsed = ref(0)
const score = ref(0)
const msg = ref('')
let clock = 0
let startedAt = 0

const diff = computed(() => DIFFS[diffIdx.value])

// 규칙을 지키는 완성판을 만든 뒤 숫자/행/열/밴드를 섞는다
function makeSolution() {
  const g = [0, 1, 2]
  const rows = shuffle(g).flatMap((b) => shuffle(g).map((r) => b * 3 + r))
  const cols = shuffle(g).flatMap((b) => shuffle(g).map((c) => b * 3 + c))
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
  const pattern = (r, c) => (3 * (r % 3) + Math.floor(r / 3) + c) % 9
  const out = []
  rows.forEach((r) => cols.forEach((c) => out.push(nums[pattern(r, c)])))
  return out
}

function start() {
  const full = makeSolution()
  const holes = new Set(shuffle([...Array(81).keys()]).slice(0, diff.value.remove))
  given.value = full.map((v, i) => (holes.has(i) ? 0 : v))
  values.value = [...given.value]
  sel.value = given.value.findIndex((v) => v === 0)
  elapsed.value = 0
  score.value = 0
  msg.value = ''
  status.value = 'playing'
  startedAt = Date.now()
  clearInterval(clock)
  clock = setInterval(() => (elapsed.value = Math.floor((Date.now() - startedAt) / 1000)), 500)
}

// 같은 행/열/박스에 같은 숫자가 있는 칸
const conflicts = computed(() => {
  const bad = new Set()
  const groups = []
  for (let i = 0; i < 9; i++) {
    groups.push([...Array(9)].map((_, j) => i * 9 + j))
    groups.push([...Array(9)].map((_, j) => j * 9 + i))
    const br = Math.floor(i / 3) * 3, bc = (i % 3) * 3
    groups.push([...Array(9)].map((_, j) => (br + Math.floor(j / 3)) * 9 + bc + (j % 3)))
  }
  groups.forEach((idxs) => {
    const seen = new Map()
    idxs.forEach((i) => {
      const v = values.value[i]
      if (!v) return
      if (seen.has(v)) { bad.add(i); bad.add(seen.get(v)) } else seen.set(v, i)
    })
  })
  return bad
})

function input(n) {
  if (status.value !== 'playing' || sel.value < 0 || given.value[sel.value]) return
  values.value[sel.value] = n
  msg.value = ''
}

function check() {
  if (status.value !== 'playing') return
  if (values.value.some((v) => !v)) { msg.value = '아직 빈칸이 있어요!'; return }
  if (conflicts.value.size) { msg.value = '틀린 부분이 있어요. 빨간 칸을 확인하세요.'; return }
  clearInterval(clock)
  elapsed.value = Math.floor((Date.now() - startedAt) / 1000)
  score.value = Math.max(100, diff.value.base - elapsed.value * 2)
  status.value = 'over'
  sfx.correct()
  emit('gameover', { score: score.value, meta: { difficulty: diff.value.id, seconds: elapsed.value } })
}

function quit() {
  clearInterval(clock)
  status.value = 'over'
  score.value = 0
  emit('gameover', { score: 0, meta: { difficulty: diff.value.id, quit: true } })
}

function move(d) {
  if (sel.value < 0) sel.value = 0
  const r = Math.floor(sel.value / 9) + d[0], c = (sel.value % 9) + d[1]
  if (r >= 0 && r < 9 && c >= 0 && c < 9) sel.value = r * 9 + c
}
function onKey(e) {
  if (status.value !== 'playing') return
  if (/^[1-9]$/.test(e.key)) input(Number(e.key))
  else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') input(0)
  else if (e.key === 'ArrowUp') (e.preventDefault(), move([-1, 0]))
  else if (e.key === 'ArrowDown') (e.preventDefault(), move([1, 0]))
  else if (e.key === 'ArrowLeft') (e.preventDefault(), move([0, -1]))
  else if (e.key === 'ArrowRight') (e.preventDefault(), move([0, 1]))
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); clearInterval(clock) })

const stats = computed(() => [
  { label: '난이도', value: diff.value.id.toUpperCase() },
  { label: '시간', value: elapsed.value + 's' },
])
const related = (i) => {
  if (sel.value < 0) return false
  const r = Math.floor(i / 9), c = i % 9, sr = Math.floor(sel.value / 9), sc = sel.value % 9
  return r === sr || c === sc || (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3))
}
</script>

<template>
  <GameScreen v-model:stage="diffIdx" free-stage stage-label="난이도" :status="status" :mode="mode" :score="score"
    :stages="DIFFS.map((d) => d.label)" title="스도쿠" desc="가로·세로·3x3 박스에 1~9가 겹치지 않게 채우세요. 빨리 풀수록 점수가 높아요."
    :summary="`${diff.id.toUpperCase()} · ${elapsed}초`" @start="start">
    <div class="wrap">
      <GameHeader :stats="stats" @quit="quit" />
      <div class="board" role="grid">
        <button v-for="(v, i) in values" :key="i" class="cell"
          :class="{ given: given[i], sel: sel === i, rel: related(i) && sel !== i, bad: conflicts.has(i) && !given[i], bx: i % 9 === 2 || i % 9 === 5, by: Math.floor(i / 9) === 2 || Math.floor(i / 9) === 5 }"
          @click="sel = i">{{ v || '' }}</button>
      </div>
      <div class="pad">
        <button v-for="n in 9" :key="n" class="btn btn-sm" @click="input(n)">{{ n }}</button>
        <button class="btn btn-sm" @click="input(0)">지움</button>
      </div>
      <div class="foot">
        <button class="btn btn-accent" @click="check">정답 확인</button>
        <span class="msg" role="status">{{ msg }}</span>
      </div>
    </div>
  </GameScreen>
</template>

<style scoped>
.wrap { display: grid; gap: 12px; justify-items: center; }
.wrap > :first-child { width: 100%; }
.board { --s: min(46px, 9.6vw); display: grid; grid-template-columns: repeat(9, var(--s)); border: 3px solid var(--text); border-radius: 8px; overflow: hidden; background: var(--surface); }
.cell { width: var(--s); height: var(--s); padding: 0; border: 0; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); background: var(--surface); font-size: calc(var(--s) * 0.5); font-weight: 600; color: var(--accent); }
.cell.bx { border-right: 3px solid var(--text); }
.cell.by { border-bottom: 3px solid var(--text); }
.cell.given { color: var(--text); background: var(--surface-2); font-weight: 800; }
.cell.rel { background: color-mix(in srgb, var(--accent) 12%, var(--surface)); }
.cell.sel { background: color-mix(in srgb, var(--accent) 35%, var(--surface)); }
.cell.bad { color: var(--danger); background: color-mix(in srgb, var(--danger) 18%, var(--surface)); }
.pad { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.foot { display: flex; gap: 12px; align-items: center; min-height: 40px; }
.msg { font-weight: 700; }
</style>
