<script setup>
import { ref, computed } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import { shuffle, useKeys, useStopwatch } from '../shared/kit'
import { sfx } from '../shared/sfx'

const props = defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const DIFFS = [
  { id: 'easy', name: '쉬움', label: '쉬움 (30칸)', remove: 30, base: 1000 },
  { id: 'medium', name: '보통', label: '보통 (45칸)', remove: 45, base: 2000 },
  { id: 'hard', name: '어려움', label: '어려움 (60칸)', remove: 60, base: 3000 },
]
const COMPETITIVE_DIFF = 1 // 경쟁 모드는 '보통' 고정

const status = ref('idle')
const diffIdx = ref(0)
const given = ref(Array(81).fill(0))
const values = ref(Array(81).fill(0))
const sel = ref(-1)
const score = ref(0)
const toast = ref('')
const clock = useStopwatch()

const playDiff = computed(() => (props.mode === 'competitive' ? COMPETITIVE_DIFF : diffIdx.value))
const diff = computed(() => DIFFS[playDiff.value])

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
  score.value = 0
  toast.value = ''
  status.value = 'playing'
  clock.start()
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
  toast.value = ''
}

function check() {
  if (status.value !== 'playing') return
  if (values.value.some((v) => !v)) { toast.value = '아직 빈칸이 있어요'; return }
  if (conflicts.value.size) { toast.value = '겹치는 숫자가 있어요'; sfx.wrong(); return }
  clock.stop()
  score.value = Math.max(100, diff.value.base - clock.seconds.value * 2)
  status.value = 'over'
  sfx.correct()
  emit('gameover', { score: score.value, meta: { difficulty: diff.value.id, seconds: clock.seconds.value } })
}

function quit() {
  clock.stop()
  status.value = 'over'
  score.value = 0
  emit('gameover', { score: 0, meta: { difficulty: diff.value.id, quit: true } })
}

function move(d) {
  if (sel.value < 0) sel.value = 0
  const r = Math.floor(sel.value / 9) + d[0], c = (sel.value % 9) + d[1]
  if (r >= 0 && r < 9 && c >= 0 && c < 9) sel.value = r * 9 + c
}
const ARROWS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
useKeys((e) => {
  if (status.value !== 'playing') return
  const digit = /^(Digit|Numpad)([0-9])$/.exec(e.code)
  if (digit) input(Number(digit[2]))
  else if (e.code === 'Backspace' || e.code === 'Delete') input(0)
  else if (ARROWS[e.code]) { e.preventDefault(); move(ARROWS[e.code]) }
  else if (e.code === 'Enter') check()
})

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const stats = computed(() => [
  { label: '난이도', value: diff.value.name },
  { label: '시간', value: mmss(clock.seconds.value) },
])
const related = (i) => {
  if (sel.value < 0) return false
  const r = Math.floor(i / 9), c = i % 9, sr = Math.floor(sel.value / 9), sc = sel.value % 9
  return r === sr || c === sc || (Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3))
}
</script>

<template>
  <GameScreen v-model:stage="diffIdx" stage-label="난이도" :status="status" :mode="mode" :score="score" :stats="stats" :toast="toast"
    :stages="DIFFS.map((d) => d.label)" title="스도쿠"
    :summary="`${diff.name} · ${mmss(clock.seconds.value)}`" @start="start" @quit="quit">
    <div class="board" role="grid" aria-label="스도쿠 판">
      <button v-for="(v, i) in values" :key="i" class="cell num"
        :class="{ given: given[i], sel: sel === i, rel: related(i) && sel !== i, bad: conflicts.has(i) && !given[i], bx: i % 9 === 2 || i % 9 === 5, by: Math.floor(i / 9) === 2 || Math.floor(i / 9) === 5 }"
        :aria-label="`${Math.floor(i / 9) + 1}행 ${(i % 9) + 1}열 ${v || '빈칸'}`" @click="sel = i">{{ v || '' }}</button>
    </div>
    <template #controls>
      <div class="pad">
        <button v-for="n in 9" :key="n" class="key num" @click="input(n)">{{ n }}</button>
        <button class="key erase" @click="input(0)">지움</button>
      </div>
      <button class="btn btn-primary check" @click="check">정답 확인</button>
    </template>
  </GameScreen>
</template>

<style scoped>
.board {
  --s: min(38px, calc((100vw - 82px) / 9));
  display: grid; grid-template-columns: repeat(9, var(--s)); justify-content: center; margin: 0 auto;
  border: 3px solid var(--text); border-radius: 8px; overflow: hidden; background: var(--surface);
}
.cell {
  width: var(--s); height: var(--s); padding: 0; border: 0;
  border-right: 1px solid var(--line); border-bottom: 1px solid var(--line);
  background: var(--surface); font-size: calc(var(--s) * 0.52); color: var(--accent);
}
.cell.bx { border-right: 3px solid var(--text); }
.cell.by { border-bottom: 3px solid var(--text); }
.cell.given { color: var(--text); background: var(--surface-2); }
.cell.rel { background: color-mix(in srgb, var(--accent) 12%, var(--surface)); }
.cell.sel { background: color-mix(in srgb, var(--accent) 35%, var(--surface)); }
.cell.bad { color: var(--danger); background: color-mix(in srgb, var(--danger) 18%, var(--surface)); }
.pad { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
.key {
  height: 44px; border-radius: var(--r-btn2); border: var(--bw) solid var(--bc);
  background: var(--surface); color: var(--text); box-shadow: var(--sh-sm); font-size: 18px;
}
.key.erase { font-size: 14px; font-weight: 700; }
.check { height: 48px; }
</style>
