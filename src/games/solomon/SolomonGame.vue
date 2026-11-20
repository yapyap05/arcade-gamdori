<script setup>
import { ref, computed } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import PixelIcon from '../../components/PixelIcon.vue'
import { useTimer, useLater, useKeys, pick, hearts } from '../shared/kit'
import { sfx } from '../shared/sfx'

const props = defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

// 무게 순서대로. 이웃한 물건도 무게 차이가 20% 이상 나도록 구성
const ITEMS = [
  { icon: 'balloon', name: '풍선', w: 10 },
  { icon: 'leaf', name: '나뭇잎', w: 15 },
  { icon: 'apple', name: '사과', w: 40 },
  { icon: 'bowling', name: '볼링공', w: 150 },
  { icon: 'brick', name: '벽돌', w: 200 },
  { icon: 'moneybag', name: '돈주머니', w: 500 },
  { icon: 'goldbar', name: '금괴', w: 800 },
  { icon: 'diamond', name: '다이아몬드', w: 1000 },
  { icon: 'castle', name: '성', w: 9999 },
]
const MIN_RATIO = 1.2
const STAGES = [
  { need: 5, limit: 5.0, range: [0, 4], label: '1단계 (5초)' },
  { need: 5, limit: 4.0, range: [1, 5], label: '2단계 (4초)' },
  { need: 7, limit: 3.0, range: [2, 7], label: '3단계 (3초)' },
  { need: 7, limit: 2.5, range: [3, 8], label: '4단계 (2.5초)' },
  { need: 10, limit: 2.0, range: [0, 9], label: '5단계 (2초)' },
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
const left = ref(null)
const right = ref(null)
const answer = ref('')
const revealed = ref(false)
const locked = ref(true)
const toast = ref('')

const timer = useTimer()
const { later, clearAll } = useLater()

const stats = computed(() => [
  { label: '단계', value: stageIdx.value + 1 },
  { label: '점수', value: score.value },
  { label: '라이프', value: hearts(lives.value) },
  { label: '연속', value: streak.value },
])
const timerView = computed(() => ({ pct: timer.pct.value, text: timer.text.value, label: '시간' }))
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
  do { b = pick(pool) } while (a === b || Math.max(a.w, b.w) / Math.min(a.w, b.w) < MIN_RATIO)
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
    toast.value = `정답 +${gain}`
    sfx.correct()
  } else {
    wrong.value++; streak.value = 0; lives.value--
    toast.value = side === 'timeout' ? '시간 초과' : '오답'
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

useKeys((e) => {
  if (status.value !== 'playing') return
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') choose('left')
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') choose('right')
})
</script>

<template>
  <GameScreen v-model:stage="startStage" :status="status" :mode="mode" :score="score" :stats="stats" :timer="timerView" :toast="toast"
    :stages="STAGES.map((s) => s.label)" title="I'm솔로몬"
    :summary="`${stageIdx + 1}단계 · 정답 ${correct} · 오답 ${wrong}`" @start="start" @quit="finish()">
    <div class="scale">
      <div class="pivot" />
      <div class="beam" :style="{ transform: `rotate(${tilt}deg)` }">
        <div class="plate"><PixelIcon v-if="left" :name="left.icon" :size="56" :label="left.name" /></div>
        <div class="plate"><PixelIcon v-if="right" :name="right.icon" :size="56" :label="right.name" /></div>
      </div>
    </div>
    <template #controls>
      <div class="btns">
        <button class="pick" :disabled="locked" @click="choose('left')">{{ left?.name ?? '왼쪽' }}</button>
        <button class="pick" :disabled="locked" @click="choose('right')">{{ right?.name ?? '오른쪽' }}</button>
      </div>
    </template>
  </GameScreen>
</template>

<style scoped>
.scale {
  position: relative; height: 230px; display: grid; place-items: center; overflow: hidden;
  border-radius: var(--r-md); background: var(--board-bg); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
}
.pivot { position: absolute; bottom: 0; width: 18px; height: 90px; background: var(--muted); border-radius: 10px 10px 0 0; }
.beam {
  position: relative; width: 84%; margin-top: -40px; display: flex; justify-content: space-between;
  border-top: 8px solid var(--muted); border-radius: 8px; transition: transform 0.45s cubic-bezier(0.3, 1.6, 0.5, 1);
}
.plate {
  margin-top: 10px; width: 104px; height: 88px; display: grid; place-items: center;
  border-radius: 0 0 60px 60px; background: var(--surface); border: var(--bw) solid var(--bc); box-shadow: var(--sh-sm);
}
.btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pick {
  height: 60px; font-size: 18px; font-weight: 700; border-radius: var(--r-btn2);
  border: var(--bw) solid var(--bc); background: var(--surface); color: var(--text); box-shadow: var(--sh-sm);
}
.pick:disabled { opacity: 0.55; }
</style>
