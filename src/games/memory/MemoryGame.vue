<script setup>
import { ref, computed } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import { useTimer, useLater, shuffle, hearts } from '../shared/kit'
import { sfx } from '../shared/sfx'

const props = defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const STAGE_WORDS = [2, 4, 6, 8, 10]
const PREVIEW_SEC = 5
const PLAY_SEC = 5
const WORD_POOL = [
  '마카오', '슬롯', '야시장', '카지노', '에그타르트', '야경', '대성당', '곤돌라', '전차', '홍콩',
  '호텔', '쿠폰', '여권', '환전', '분수', '사진', '공연', '쇼핑', '버스', '산책',
  '맛집', '디저트', '기념품', '거리', '광장',
]

const status = ref('idle')
const startIdx = ref(0)
const phase = ref('preview') // preview | play | result
const stageIdx = ref(0)
const answer = ref([])
const gridWords = ref([])
const picked = ref([])
const score = ref(0)
const lives = ref(3)
const cleared = ref(0)
const toast = ref('')

const timer = useTimer()
const { later, clearAll } = useLater()

const stats = computed(() => [
  { label: '단계', value: stageIdx.value + 1 },
  { label: '점수', value: score.value },
  { label: '라이프', value: hearts(lives.value) },
  { label: '선택', value: `${picked.value.length}/${STAGE_WORDS[stageIdx.value]}` },
])
const showOrder = computed(() => phase.value !== 'play')
const timerView = computed(() => ({
  pct: timer.pct.value,
  text: timer.text.value,
  label: phase.value === 'preview' ? '외우기' : phase.value === 'play' ? '선택' : '결과',
}))

function start() {
  stageIdx.value = props.mode === 'casual' ? startIdx.value : 0 // 시작 단계 선택은 캐주얼만
  score.value = 0; lives.value = 3; cleared.value = 0
  status.value = 'playing'
  startStage()
}

function startStage() {
  picked.value = []
  answer.value = shuffle(WORD_POOL).slice(0, STAGE_WORDS[stageIdx.value])
  gridWords.value = shuffle(answer.value)
  phase.value = 'preview'
  toast.value = ''
  timer.start(PREVIEW_SEC, startPlay)
}

function startPlay() {
  picked.value = []
  phase.value = 'play'
  timer.start(PLAY_SEC, () => result(false, '시간 초과'))
}

function pickWord(w) {
  if (phase.value !== 'play' || picked.value.includes(w)) return
  picked.value.push(w)
  sfx.tick()
  if (picked.value.length === answer.value.length) {
    const remain = timer.remain.value
    result(picked.value.every((x, i) => x === answer.value[i]), '순서가 달라요', remain)
  }
}

function result(ok, failMsg, remain = 0) {
  timer.stop()
  phase.value = 'result'
  const last = stageIdx.value === STAGE_WORDS.length - 1
  if (ok) {
    const gain = STAGE_WORDS[stageIdx.value] * 10 + Math.floor(remain * 10) + (last ? 200 : 0)
    score.value += gain
    cleared.value++
    toast.value = last ? `마지막 단계 성공 +${gain}` : `성공 +${gain}`
    sfx.correct()
  } else {
    lives.value--
    toast.value = failMsg
    sfx.wrong()
  }
  later(() => {
    if (ok && last) return finish()
    if (!ok && lives.value <= 0) return finish()
    if (ok) stageIdx.value++
    startStage()
  }, 1600)
}

function clearPick() {
  if (phase.value === 'play') picked.value = []
}

function finish() {
  clearAll()
  timer.stop()
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { stage: stageIdx.value + 1, cleared: cleared.value } })
}
</script>

<template>
  <GameScreen v-model:stage="startIdx" :status="status" :mode="mode" :score="score" :stats="stats" :timer="timerView" :toast="toast"
    :stages="STAGE_WORDS.map((n, i) => `${i + 1}단계: 단어 ${n}개`)" title="기억x기억해"
    :summary="`${stageIdx + 1}단계 · ${cleared}단계 성공`" @start="start" @quit="finish">
    <div class="order" :class="{ hidden: !showOrder }">
      <span v-for="(w, i) in answer" :key="w" class="chip"><small class="num">{{ i + 1 }}</small>{{ showOrder ? w : '' }}</span>
    </div>
    <template #controls>
      <div class="grid">
        <button v-for="w in gridWords" :key="w" class="word" :disabled="phase !== 'play' || picked.includes(w)" @click="pickWord(w)">
          {{ w }}<small v-if="picked.includes(w)" class="num">{{ picked.indexOf(w) + 1 }}</small>
        </button>
      </div>
      <button class="btn" :disabled="phase !== 'play' || !picked.length" @click="clearPick">다시 고르기</button>
    </template>
  </GameScreen>
</template>

<style scoped>
.order {
  display: flex; gap: 8px; flex-wrap: wrap; align-content: center; justify-content: center; min-height: 120px; padding: 14px;
  border-radius: var(--r-md); background: var(--board-bg); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
}
.chip {
  display: inline-flex; gap: 6px; align-items: center; height: 36px; padding: 0 12px;
  border-radius: 999px; background: var(--surface); border: var(--bw) solid var(--bc); font-weight: 700;
}
.order.hidden .chip { min-width: 48px; justify-content: center; }
.chip small { background: var(--accent); color: var(--accent-text); border-radius: 999px; padding: 0 7px; font-size: 12px; }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.word {
  position: relative; height: 52px; padding: 0 4px; font-weight: 700; font-size: 15px;
  border-radius: var(--r-btn2); border: var(--bw) solid var(--bc); background: var(--surface); color: var(--text); box-shadow: var(--sh-sm);
}
.word:disabled { opacity: 0.55; }
.word small { position: absolute; top: 3px; right: 8px; font-size: 12px; color: var(--accent); }
.btn { height: 48px; }
</style>
