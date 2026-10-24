<script setup>
import { ref, computed } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import GameHeader from '../shared/GameHeader.vue'
import TimerBar from '../shared/TimerBar.vue'
import { useTimer, useLater, shuffle, pick, hearts } from '../shared/kit'
import { sfx } from '../shared/sfx'

const props = defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const COLORS = [
  { n: '빨강', v: '#ff4d6d', id: 'red' },
  { n: '파랑', v: '#00b8ff', id: 'blue' },
  { n: '초록', v: '#2fd46b', id: 'green' },
  { n: '노랑', v: '#ffc531', id: 'yellow' },
]
const STAGES = [
  { count: 2, limit: 3.0, need: 5, label: '1단계: 2색 (3.0초)' },
  { count: 3, limit: 2.5, need: 5, label: '2단계: 3색 (2.5초)' },
  { count: 4, limit: 2.0, need: 7, label: '3단계: 4색 (2.0초)' },
  { count: 4, limit: 1.5, need: 10, label: '4단계: 고속 (1.5초)' },
  { count: 4, limit: 1.2, need: 15, label: '5단계: 한계 (1.2초)' },
]

const status = ref('idle')
const startStage = ref(0)
const stageIdx = ref(0)
const got = ref(0)
const score = ref(0)
const correct = ref(0)
const wrong = ref(0)
const lives = ref(3)
const word = ref('READY')
const wordColor = ref('inherit')
const options = ref([])
const answerId = ref('')
const locked = ref(true)
const flash = ref('')

const timer = useTimer()
const { later, clearAll } = useLater()

const stats = computed(() => [
  { label: 'LV', value: stageIdx.value + 1 },
  { label: '점수', value: score.value },
  { label: '라이프', value: hearts(lives.value) },
  { label: '정답/오답', value: `${correct.value}/${wrong.value}` },
])

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
</script>

<template>
  <GameScreen v-model:stage="startStage" :status="status" :mode="mode" :score="score" :stages="STAGES.map((s) => s.label)"
    title="색깔능력자" desc="글자의 뜻이 아니라 '보이는 색'과 같은 버튼을 누르세요. 3번 틀리면 끝!"
    :summary="`${stageIdx + 1}단계 · 정답 ${correct} / 오답 ${wrong}`" @start="start">
    <div class="wrap">
      <GameHeader :stats="stats" @quit="finish" />
      <TimerBar :pct="timer.pct.value" :text="timer.text.value" label="남은 시간" />
      <div class="display" :class="flash"><span :style="{ color: wordColor }">{{ word }}</span></div>
      <div class="btns">
        <button v-for="c in options" :key="c.id" class="choice" :style="{ '--c': c.v }" :disabled="locked" @click="answer(c.id)">{{ c.n }}</button>
      </div>
    </div>
  </GameScreen>
</template>

<style scoped>
.wrap { display: grid; gap: 14px; }
.display { display: grid; place-items: center; height: 180px; border-radius: 18px; background: var(--board-bg); font-size: 72px; font-weight: 900; transition: box-shadow 0.15s; }
.display.ok { box-shadow: inset 0 0 0 4px #2fd46b; }
.display.bad { box-shadow: inset 0 0 0 4px var(--danger); }
.btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.choice { padding: 18px 0; font-size: 20px; font-weight: 800; border-radius: 14px; border: 3px solid var(--c); background: var(--surface); color: var(--text); }
.choice:hover:not(:disabled) { background: var(--c); color: #1a1d3a; }
.choice:disabled { opacity: 0.6; }
</style>
