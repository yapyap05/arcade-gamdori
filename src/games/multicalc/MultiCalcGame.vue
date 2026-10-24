<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import GameHeader from '../shared/GameHeader.vue'
import TimerBar from '../shared/TimerBar.vue'
import { useTimer, useLater, randInt, shuffle } from '../shared/kit'
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
const problem = ref(null)
const reelA = ref('-')
const reelB = ref('-')
const phase = ref('idle') // spinning | waiting | answering | feedback
const choices = ref([])
const picked = ref(null)
const msg = ref('')

const timer = useTimer()
const { later, clearAll } = useLater()
let spinId = 0

const info = computed(() => STAGES[stageIdx.value])
const stats = computed(() => [
  { label: 'Stage', value: `${stageIdx.value + 1} ${info.value.name}` },
  { label: '점수', value: score.value },
  { label: '연속', value: streak.value },
  { label: '남은 정답', value: Math.max(0, info.value.need - got.value) },
])

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
  got.value = 0; streak.value = 0; score.value = 0; correct.value = 0; wrong.value = 0; timeouts.value = 0
  status.value = 'playing'
  nextQuestion()
}

// 슬롯 릴 연출 → 문제 공개 → 대기(암기) → 입력 시작
function nextQuestion() {
  clearAll(); timer.stop(); clearInterval(spinId)
  problem.value = makeProblem(info.value.op)
  choices.value = []
  picked.value = null
  msg.value = ''
  phase.value = 'spinning'
  spinId = setInterval(() => {
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
    msg.value = `정답! +${gain}`
    sfx.correct()
    later(afterCorrect, 400)
  } else {
    wrong.value++; streak.value = 0
    score.value = Math.max(0, score.value - 2)
    msg.value = `오답! 정답: ${problem.value.answer}`
    sfx.wrong()
    later(nextQuestion, 900)
  }
}

function onTimeout() {
  phase.value = 'feedback'
  timeouts.value++; streak.value = 0
  score.value = Math.max(0, score.value - 1)
  msg.value = `타임아웃! 정답: ${problem.value.answer}`
  sfx.wrong()
  later(nextQuestion, 900)
}

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

function onKey(e) {
  if (status.value !== 'playing' || phase.value !== 'answering') return
  const i = Number(e.key)
  if (i >= 1 && i <= choices.value.length) choose(choices.value[i - 1])
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function finish(jackpot = false) {
  clearAll(); timer.stop(); clearInterval(spinId)
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { stage: stageIdx.value + 1, correct: correct.value, wrong: wrong.value, timeouts: timeouts.value, jackpot } })
}
</script>

<template>
  <GameScreen v-model:stage="startStage" :status="status" :mode="mode" :score="score" :stages="STAGES.map((s, i) => `${i + 1}단계: ${s.name}`)"
    title="계산x계산해" desc="릴이 멈추면 문제를 확인하고, 대기가 끝나면 보기 8개 중 정답을 고르세요. (숫자키 1~8도 가능) 4단계를 모두 클리어하면 잭팟!"
    :summary="`정답 ${correct} / 오답 ${wrong} / 타임아웃 ${timeouts}`" @start="start">
    <div class="wrap">
      <GameHeader :stats="stats" @quit="finish()" />
      <TimerBar :pct="timer.pct.value" :text="timer.text.value" :label="phase === 'waiting' ? '대기' : phase === 'answering' ? '입력' : '준비'" />
      <div class="slot" :class="phase">
        <div class="reel">{{ reelA }}</div>
        <div class="op">{{ problem ? info.op : '?' }}</div>
        <div class="reel">{{ reelB }}</div>
      </div>
      <p class="line">{{ phase === 'spinning' ? 'SPIN...' : problem && phase !== 'idle' ? `${problem.a} ${problem.op} ${problem.b} = ?` : '' }}</p>
      <div class="choices" role="group" aria-label="보기">
        <button v-for="(c, i) in choices" :key="c" class="choice"
          :class="{ right: phase === 'feedback' && c === problem.answer, wrong: phase === 'feedback' && c === picked && c !== problem.answer }"
          :disabled="phase !== 'answering'" @click="choose(c)">
          <small>{{ i + 1 }}</small>{{ c }}
        </button>
        <p v-if="!choices.length" class="ph">문제를 준비하고 있어요…</p>
      </div>
      <p class="msg" role="status">{{ msg }}</p>
    </div>
  </GameScreen>
</template>

<style scoped>
.wrap { display: grid; gap: 14px; }
.slot { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 22px; border-radius: 18px; background: var(--board-bg); }
.reel { min-width: 120px; padding: 14px 18px; text-align: center; font-size: 52px; font-weight: 900; font-variant-numeric: tabular-nums; border-radius: 14px; background: var(--surface); box-shadow: var(--shadow); }
.slot.spinning .reel { filter: blur(1.5px); color: var(--muted); }
.op { font-size: 40px; font-weight: 900; color: var(--accent); }
.line { margin: 0; text-align: center; font-size: 22px; font-weight: 800; min-height: 32px; }
.choices { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; min-height: 130px; }
.choice { position: relative; padding: 22px 0 18px; font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; border-radius: 14px; border: 2px solid var(--line); background: var(--surface); }
.choice small { position: absolute; top: 5px; left: 9px; font-size: 11px; color: var(--muted); }
.choice:hover:not(:disabled) { border-color: var(--accent); }
.choice:disabled { opacity: 0.55; }
.choice.right { opacity: 1; background: #2fd46b; border-color: #2fd46b; color: #06240f; }
.choice.wrong { opacity: 1; background: var(--danger); border-color: var(--danger); color: #fff; }
.ph { grid-column: 1 / -1; margin: 0; align-self: center; text-align: center; color: var(--muted); }
.msg { margin: 0; text-align: center; font-weight: 800; min-height: 24px; }
@media (max-width: 520px) { .reel { min-width: 84px; font-size: 38px; } .choice { font-size: 20px; } }
</style>
