<script setup>
import { ref, computed } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import { useTimer, useLater, useKeys, shuffle, pick, hearts } from '../shared/kit'
import { sfx } from '../shared/sfx'

const props = defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const COLORS = [
  { n: '빨강', v: '#FF4D6D', id: 'red' },
  { n: '파랑', v: '#00A3FF', id: 'blue' },
  { n: '초록', v: '#22C55E', id: 'green' },
  { n: '노랑', v: '#FFC531', id: 'yellow' },
]
const STAGES = [
  { count: 2, limit: 3.0, need: 5, label: '1단계: 2색' },
  { count: 3, limit: 2.5, need: 5, label: '2단계: 3색' },
  { count: 4, limit: 2.0, need: 7, label: '3단계: 4색' },
  { count: 4, limit: 1.5, need: 10, label: '4단계: 고속' },
  { count: 4, limit: 1.2, need: 15, label: '5단계: 한계' },
]

const status = ref('idle')
const startStage = ref(0)
const stageIdx = ref(0)
const got = ref(0)
const score = ref(0)
const correct = ref(0)
const wrong = ref(0)
const lives = ref(3)
const word = ref('')
const wordColor = ref('inherit')
const options = ref([])
const answerId = ref('')
const locked = ref(true)
const flash = ref('')

const timer = useTimer()
const { later, clearAll } = useLater()

const stats = computed(() => [
  { label: '단계', value: stageIdx.value + 1 },
  { label: '점수', value: score.value },
  { label: '라이프', value: hearts(lives.value) },
])
const timerView = computed(() => ({ pct: timer.pct.value, text: timer.text.value, label: '시간' }))

function start() {
  stageIdx.value = props.mode === 'casual' ? startStage.value : 0
  got.value = 0; score.value = 0; correct.value = 0; wrong.value = 0; lives.value = 3
  status.value = 'playing'
  next()
}

function next() {
  const cfg = STAGES[stageIdx.value]
  const pool = COLORS.slice(0, cfg.count)
  const w = pick(pool)
  const c = pick(pool)
  word.value = w.n
  wordColor.value = c.v
  answerId.value = c.id // 정답은 글자의 '의미'가 아니라 '색상'
  options.value = shuffle(pool)
  flash.value = ''
  locked.value = false
  timer.start(cfg.limit, () => answer('timeout'))
}

function answer(id) {
  if (locked.value) return
  locked.value = true
  timer.stop()
  const ok = id === answerId.value
  if (ok) {
    score.value += 20; got.value++; correct.value++
    sfx.correct()
    if (got.value >= STAGES[stageIdx.value].need && stageIdx.value < STAGES.length - 1) {
      stageIdx.value++; got.value = 0
      sfx.levelUp()
    }
  } else {
    wrong.value++
    lives.value--
    score.value = Math.max(0, score.value - 10)
    sfx.wrong()
  }
  flash.value = ok ? 'ok' : 'bad'
  later(() => (lives.value <= 0 ? finish() : next()), 500)
}

function finish() {
  clearAll()
  timer.stop()
  locked.value = true
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { stage: stageIdx.value + 1, correct: correct.value, wrong: wrong.value } })
}

// 숫자키 1~4 = 화면의 버튼 순서
useKeys((e) => {
  if (status.value !== 'playing') return
  const m = /^(Digit|Numpad)([1-4])$/.exec(e.code)
  const opt = m && options.value[Number(m[2]) - 1]
  if (opt) answer(opt.id)
})
</script>

<template>
  <GameScreen v-model:stage="startStage" :status="status" :mode="mode" :score="score" :stats="stats" :timer="timerView"
    :stages="STAGES.map((s) => s.label)" title="색깔능력자"
    :summary="`${stageIdx + 1}단계 · 정답 ${correct} · 오답 ${wrong}`" @start="start" @quit="finish">
    <div class="display" :class="flash"><span :style="{ color: wordColor }">{{ word }}</span></div>
    <template #controls>
      <div class="btns">
        <button v-for="c in options" :key="c.id" class="choice" :style="{ '--c': c.v }" :disabled="locked" @click="answer(c.id)">
          <i class="sw" aria-hidden="true"></i>{{ c.n }}
        </button>
      </div>
    </template>
  </GameScreen>
</template>

<style scoped>
.display {
  display: grid; place-items: center; height: 180px;
  border-radius: var(--r-md); background: var(--board-bg); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
  font-family: var(--font-display); font-weight: 900; font-size: 68px; transition: box-shadow 0.15s;
}
.display.ok { box-shadow: inset 0 0 0 4px var(--accent); }
.display.bad { box-shadow: inset 0 0 0 4px var(--danger); }
.btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.choice {
  height: 56px; display: flex; align-items: center; justify-content: center; gap: 8px;
  font-size: 18px; font-weight: 700; border-radius: var(--r-btn2);
  border: var(--bw) solid var(--bc); background: var(--surface); color: var(--text); box-shadow: var(--sh-sm);
}
.sw { width: 16px; height: 16px; border-radius: 4px; background: var(--c); border: 1px solid rgba(0, 0, 0, 0.2); }
.choice:disabled { opacity: 0.6; }
</style>
