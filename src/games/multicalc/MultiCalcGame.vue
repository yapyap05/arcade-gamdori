<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import { useTimer, useLater, useKeys, randInt, shuffle, hearts } from '../shared/kit'
import { useGameCtx } from '../shared/context'
import { sfx } from '../shared/sfx'

const props = defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const STAGES = [
  { op: '+', name: '덧셈', waitSec: 3, need: 5, limit: 6 },
  { op: '-', name: '뺄셈', waitSec: 3, need: 5, limit: 7 },
  { op: '÷', name: '나눗셈(몫)', waitSec: 5, need: 3, limit: 8 },
  { op: '×', name: '곱셈', waitSec: 5, need: 3, limit: 8 },
]
const DIGIT_PAIRS = [
  { d: [1, 1], p: 0.3 },
  { d: [1, 2], p: 0.5 },
  { d: [2, 2], p: 0.2 },
]

const status = ref('idle')
const startStage = ref(0)
const stageIdx = ref(0)
const got = ref(0)
const streak = ref(0)
const score = ref(0)
const correct = ref(0)
const wrong = ref(0)
const timeouts = ref(0)
const lives = ref(3)
const problem = ref(null)
const reelA = ref('-')
const reelB = ref('-')
const phase = ref('idle') // spinning | waiting | answering | feedback
const choices = ref([])
const picked = ref(null)
const toast = ref('')

const ctx = useGameCtx()
const timer = useTimer()
const { later, clearAll } = useLater()
let spinId = 0
onBeforeUnmount(() => clearInterval(spinId))

const info = computed(() => STAGES[stageIdx.value])
const stats = computed(() => [
  { label: '단계', value: `${stageIdx.value + 1} ${info.value.name}` },
  { label: '점수', value: score.value },
  { label: '라이프', value: hearts(lives.value) },
  { label: '남은 문제', value: Math.max(0, info.value.need - got.value) },
])
const timerView = computed(() => ({
  pct: timer.pct.value,
  text: timer.text.value,
  label: phase.value === 'waiting' ? '대기' : phase.value === 'answering' ? '입력' : '준비',
}))

const pickDigits = () => {
  let r = Math.random(), acc = 0
  let [a, b] = DIGIT_PAIRS[DIGIT_PAIRS.length - 1].d
  for (const it of DIGIT_PAIRS) { acc += it.p; if (r <= acc) { [a, b] = it.d; break } }
  return a !== b && Math.random() < 0.5 ? [b, a] : [a, b]
}
const byDigits = (d) => (d === 1 ? randInt(1, 9) : randInt(10, 99))

// 보기 8개: 정답, ±10, ±2, ±1, 정답 부근 랜덤 1개 (음수·중복은 부근 숫자로 대체)
function makeChoices(answer) {
  const set = new Set([answer])
  const add = (n) => { if (n >= 0 && !set.has(n)) { set.add(n); return true } return false }
  ;[10, -10, 2, 1, -1, -2].forEach((d) => add(answer + d))
  // 랜덤 부근 숫자 1개 + (위에서 걸러진 자리 보충)
  let span = 5
  while (set.size < 8) {
    const n = answer + randInt(-span, span)
    if (!add(n)) span = Math.min(span + 1, 30)
  }
  return shuffle([...set])
}

function makeProblem(op) {
  const [dA, dB] = pickDigits()
  const a = byDigits(dA), b = byDigits(dB)
  if (op === '+') return { a, b, op, answer: a + b }
  if (op === '-') return { a: Math.max(a, b), b: Math.min(a, b), op, answer: Math.abs(a - b) }
  if (op === '×') return { a, b, op, answer: a * b }
  // 나눗셈: 나누어떨어지는 99 이하의 피제수
  for (let i = 0; i < 5000; i++) {
    const divisor = byDigits(dB)
    const q = randInt(1, 99)
    const dividend = divisor * q
    if (dividend < 1 || dividend > 99) continue
    if ((dividend <= 9 ? 1 : 2) !== dA) continue
    return { a: dividend, b: divisor, op, answer: q }
  }
  const divisor = randInt(1, 9), q = randInt(1, 9)
  return { a: divisor * q, b: divisor, op, answer: q }
}

function start() {
  stageIdx.value = props.mode === 'casual' ? startStage.value : 0
  got.value = 0; streak.value = 0; score.value = 0; correct.value = 0; wrong.value = 0; timeouts.value = 0; lives.value = 3
  status.value = 'playing'
  nextQuestion()
}

// 슬롯 릴 연출 → 문제 공개 → 대기(암기) → 입력 시작
function nextQuestion() {
  clearAll(); timer.stop(); clearInterval(spinId)
  problem.value = makeProblem(info.value.op)
  choices.value = []
  picked.value = null
  toast.value = ''
  phase.value = 'spinning'
  spinId = setInterval(() => {
    if (ctx.paused) return
    reelA.value = String(randInt(0, 99))
    reelB.value = String(randInt(0, 99))
    sfx.tick()
  }, 70)
  later(() => {
    clearInterval(spinId)
    reelA.value = String(problem.value.a)
    reelB.value = String(problem.value.b)
    phase.value = 'waiting'
    choices.value = makeChoices(problem.value.answer)
    timer.start(info.value.waitSec, () => {
      phase.value = 'answering'
      timer.start(info.value.limit, onTimeout)
    })
  }, 1300)
}

function choose(n) {
  if (phase.value !== 'answering') return
  const remain = timer.remain.value
  timer.stop()
  phase.value = 'feedback'
  picked.value = n
  if (n === problem.value.answer) {
    correct.value++; streak.value++; got.value++
    const gain = 10 + Math.floor(Math.min(10, remain)) + Math.min(10, streak.value)
    score.value += gain
    toast.value = `정답 +${gain}`
    sfx.correct()
    later(afterCorrect, 400)
  } else {
    wrong.value++; streak.value = 0; lives.value--
    score.value = Math.max(0, score.value - 2)
    toast.value = `정답은 ${problem.value.answer}`
    sfx.wrong()
    later(afterMiss, 900)
  }
}

function onTimeout() {
  phase.value = 'feedback'
  timeouts.value++; streak.value = 0; lives.value--
  score.value = Math.max(0, score.value - 1)
  toast.value = `시간 초과 · 정답은 ${problem.value.answer}`
  sfx.wrong()
  later(afterMiss, 900)
}

// 오답·시간 초과: 라이프가 남아 있으면 다음 문제, 없으면 종료
const afterMiss = () => (lives.value <= 0 ? finish() : nextQuestion())

function afterCorrect() {
  if (got.value >= info.value.need) {
    if (stageIdx.value < STAGES.length - 1) {
      stageIdx.value++; got.value = 0
      sfx.levelUp()
    } else {
      return finish(true)
    }
  }
  nextQuestion()
}

useKeys((e) => {
  if (status.value !== 'playing' || phase.value !== 'answering') return
  const m = /^(Digit|Numpad)([1-8])$/.exec(e.code)
  if (m && Number(m[2]) <= choices.value.length) choose(choices.value[Number(m[2]) - 1])
})

function finish(jackpot = false) {
  clearAll(); timer.stop(); clearInterval(spinId)
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { stage: stageIdx.value + 1, correct: correct.value, wrong: wrong.value, timeouts: timeouts.value, jackpot } })
}
</script>

<template>
  <GameScreen v-model:stage="startStage" :status="status" :mode="mode" :score="score" :stats="stats" :timer="timerView" :toast="toast"
    :stages="STAGES.map((s, i) => `${i + 1}단계: ${s.name}`)" title="계산x계산해"
    :summary="`정답 ${correct} · 오답 ${wrong} · 시간 초과 ${timeouts}`" @start="start" @quit="finish()">
    <div class="slot" :class="phase">
      <div class="reel num">{{ reelA }}</div>
      <div class="op">{{ problem ? info.op : '?' }}</div>
      <div class="reel num">{{ reelB }}</div>
    </div>
    <template #controls>
      <div class="choices" role="group" aria-label="보기">
        <button v-for="c in choices" :key="c" class="choice num"
          :class="{ right: phase === 'feedback' && c === problem.answer, wrong: phase === 'feedback' && c === picked && c !== problem.answer }"
          :disabled="phase !== 'answering'" @click="choose(c)">{{ c }}</button>
        <span v-for="n in 8 - choices.length" :key="'e' + n" class="choice empty" aria-hidden="true"></span>
      </div>
    </template>
  </GameScreen>
</template>

<style scoped>
.slot {
  display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px 12px;
  border-radius: var(--r-md); background: var(--board-bg); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
}
.reel {
  min-width: 96px; padding: 12px 14px; text-align: center; font-size: 44px; line-height: 1.1;
  border-radius: var(--r-btn2); background: var(--surface); border: var(--bw) solid var(--bc); box-shadow: var(--sh-sm);
}
.slot.spinning .reel { filter: blur(1.5px); color: var(--muted); }
.op { font-family: var(--font-num); font-size: 36px; font-weight: 700; color: var(--accent); }
.choices { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.choice {
  height: 56px; font-size: 22px; border-radius: var(--r-btn2);
  border: var(--bw) solid var(--bc); background: var(--surface); color: var(--text); box-shadow: var(--sh-sm);
}
.choice:disabled { opacity: 0.55; }
.choice.empty { background: var(--surface-2); box-shadow: none; opacity: 0.5; }
.choice.right { opacity: 1; background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
.choice.wrong { opacity: 1; background: var(--danger); border-color: var(--danger); color: #fff; }
</style>
