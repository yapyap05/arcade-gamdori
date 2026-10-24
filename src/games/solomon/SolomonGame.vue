<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import GameHeader from '../shared/GameHeader.vue'
import TimerBar from '../shared/TimerBar.vue'
import { useTimer, useLater, pick, hearts } from '../shared/kit'
import { sfx } from '../shared/sfx'

const props = defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const ITEMS = [
  { n: '🎈', w: 10 }, { n: '🍃', w: 15 }, { n: '🍎', w: 40 }, { n: '🎳', w: 150 },
  { n: '🧱', w: 200 }, { n: '💰', w: 500 }, { n: '🥇', w: 505 }, { n: '💎', w: 1000 }, { n: '🏰', w: 9999 },
]
const STAGES = [
  { need: 5, limit: 5.0, range: [0, 4], label: '1단계: 풍선 vs 사과 (5초)' },
  { need: 5, limit: 4.0, range: [1, 5], label: '2단계: 사과 vs 볼링공 (4초)' },
  { need: 7, limit: 3.0, range: [2, 7], label: '3단계: 볼링공 vs 금괴 (3초)' },
  { need: 7, limit: 2.5, range: [3, 8], label: '4단계: 정밀 측정 (2.5초)' },
  { need: 10, limit: 2.0, range: [0, 9], label: '5단계: 극한의 무게 (2초)' },
]

const status = ref('idle')
const startStage = ref(0)
const stageIdx = ref(0)
const got = ref(0)
const score = ref(0)
const correct = ref(0)
const wrong = ref(0)
const streak = ref(0)
const lives = ref(3)
const left = ref({ n: '🤔', w: 0 })
const right = ref({ n: '🧐', w: 0 })
const answer = ref('')
const revealed = ref(false)
const locked = ref(true)
const toast = ref('')

const timer = useTimer()
const { later, clearAll } = useLater()

const stats = computed(() => [
  { label: 'Stage', value: stageIdx.value + 1 },
  { label: '점수', value: score.value },
  { label: '라이프', value: hearts(lives.value) },
  { label: '연속', value: streak.value },
])
const tilt = computed(() => (!revealed.value ? 0 : answer.value === 'left' ? -9 : 9))

function start() {
  stageIdx.value = props.mode === 'casual' ? startStage.value : 0
  got.value = 0; score.value = 0; correct.value = 0; wrong.value = 0; streak.value = 0; lives.value = 3
  status.value = 'playing'
  question()
}

function question() {
  const cfg = STAGES[stageIdx.value]
  const pool = ITEMS.slice(cfg.range[0], cfg.range[1])
  const a = pick(pool)
  let b
  do { b = pick(pool) } while (a === b)
  left.value = a
  right.value = b
  answer.value = a.w > b.w ? 'left' : 'right'
  revealed.value = false
  toast.value = ''
  locked.value = false
  timer.start(cfg.limit, () => choose('timeout'))
}

function choose(side) {
  if (locked.value) return
  locked.value = true
  const remain = timer.remain.value
  timer.stop()
  revealed.value = true
  const ok = side === answer.value
  if (ok) {
    const gain = 10 + Math.floor(remain) // 빠를수록 보너스
    score.value += gain; got.value++; correct.value++; streak.value++
    toast.value = `정답! +${gain}`
    sfx.correct()
  } else {
    wrong.value++; streak.value = 0; lives.value--
    toast.value = side === 'timeout' ? '시간 초과!' : '오답!'
    sfx.wrong()
  }
  const cleared = got.value >= STAGES[stageIdx.value].need
  later(() => {
    if (lives.value <= 0) return finish()
    if (cleared) {
      if (stageIdx.value < STAGES.length - 1) {
        stageIdx.value++; got.value = 0
        sfx.levelUp()
      } else {
        score.value += 100 // 전 단계 클리어 보너스
        return finish(true)
      }
    }
    question()
  }, 800)
}

function finish(cleared = false) {
  clearAll()
  timer.stop()
  locked.value = true
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { stage: stageIdx.value + 1, correct: correct.value, wrong: wrong.value, cleared } })
}

function onKey(e) {
  if (status.value !== 'playing') return
  if (e.code === 'ArrowLeft') choose('left')
  else if (e.code === 'ArrowRight') choose('right')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <GameScreen v-model:stage="startStage" :status="status" :mode="mode" :score="score" :stages="STAGES.map((s) => s.label)"
    title="I'm솔로몬" desc="더 무거운 물체를 고르세요. 3번 틀리면 끝! (← → 키도 가능)"
    :summary="`${stageIdx + 1}단계 · 정답 ${correct} / 오답 ${wrong}`" @start="start">
    <div class="wrap">
      <GameHeader :stats="stats" @quit="finish()" />
      <TimerBar :pct="timer.pct.value" :text="timer.text.value" label="남은 시간" />
      <div class="stage">
        <div class="pivot" />
        <div class="beam" :style="{ transform: `rotate(${tilt}deg)` }">
          <div class="plate"><span>{{ left.n }}</span></div>
          <div class="plate"><span>{{ right.n }}</span></div>
        </div>
        <p class="toast" :class="{ on: toast }">{{ toast || '-' }}</p>
      </div>
      <div class="btns">
        <button class="pick l" :disabled="locked" @click="choose('left')">여긴가?</button>
        <button class="pick r" :disabled="locked" @click="choose('right')">이건가?</button>
      </div>
    </div>
  </GameScreen>
</template>

<style scoped>
.wrap { display: grid; gap: 14px; }
.stage { position: relative; height: 230px; background: var(--board-bg); border-radius: 18px; display: grid; place-items: center; overflow: hidden; }
.pivot { position: absolute; bottom: 0; width: 18px; height: 90px; background: var(--muted); border-radius: 10px 10px 0 0; }
.beam { position: relative; width: 82%; display: flex; justify-content: space-between; border-top: 8px solid var(--muted); border-radius: 8px; transition: transform 0.45s cubic-bezier(.3,1.6,.5,1); margin-top: -40px; }
.plate { margin-top: 10px; width: 110px; height: 90px; display: grid; place-items: center; background: var(--surface); border-radius: 0 0 60px 60px; box-shadow: var(--shadow); }
.plate span { font-size: 54px; }
.toast { position: absolute; top: 10px; margin: 0; font-weight: 800; opacity: 0.4; }
.toast.on { opacity: 1; }
.btns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pick { padding: 22px 0; font-size: 20px; font-weight: 800; border-radius: 16px; border: 0; }
.l { background: #38bdf8; color: #06293a; }
.r { background: #ffc531; color: #2a2000; }
.pick:disabled { opacity: 0.5; }
</style>
