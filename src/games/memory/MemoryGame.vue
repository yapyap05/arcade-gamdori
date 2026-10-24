<script setup>
import { ref, computed } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import GameHeader from '../shared/GameHeader.vue'
import TimerBar from '../shared/TimerBar.vue'
import { useTimer, useLater, shuffle, hearts } from '../shared/kit'
import { sfx } from '../shared/sfx'

defineProps({ mode: { type: String, default: 'casual' } })
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
const phase = ref('preview') // preview | play | result
const stageIdx = ref(0)
const answer = ref([])
const gridWords = ref([])
const picked = ref([])
const score = ref(0)
const lives = ref(3)
const cleared = ref(0)
const hint = ref('')

const timer = useTimer()
const { later, clearAll } = useLater()

const stats = computed(() => [
  { label: 'Stage', value: stageIdx.value + 1 },
  { label: '점수', value: score.value },
  { label: '라이프', value: hearts(lives.value) },
  { label: '선택', value: `${picked.value.length}/${STAGE_WORDS[stageIdx.value]}` },
])
const showOrder = computed(() => phase.value !== 'play')

function start() {
  stageIdx.value = 0; score.value = 0; lives.value = 3; cleared.value = 0
  status.value = 'playing'
  startStage()
}

function startStage() {
  picked.value = []
  answer.value = shuffle(WORD_POOL).slice(0, STAGE_WORDS[stageIdx.value])
  gridWords.value = shuffle(answer.value)
  phase.value = 'preview'
  hint.value = `순서를 외우세요 (${PREVIEW_SEC}초)`
  timer.start(PREVIEW_SEC, startPlay)
}

function startPlay() {
  picked.value = []
  phase.value = 'play'
  hint.value = `외운 순서대로 클릭하세요 (${PLAY_SEC}초)`
  timer.start(PLAY_SEC, () => result(false, '시간 초과!'))
}

function pickWord(w) {
  if (phase.value !== 'play' || picked.value.includes(w)) return
  picked.value.push(w)
  sfx.tick()
  if (picked.value.length === answer.value.length) {
    const remain = timer.remain.value
    result(picked.value.every((x, i) => x === answer.value[i]), '틀렸어요!', remain)
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
    hint.value = last ? `🎉 마지막 단계 성공! +${gain}` : `성공! +${gain}`
    sfx.correct()
  } else {
    lives.value--
    hint.value = `${failMsg} 정답을 확인하세요.`
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
  <GameScreen :status="status" :mode="mode" :score="score" title="기억x기억해"
    desc="5초 동안 단어 순서를 외우고, 같은 순서로 클릭하세요. 실패해도 같은 단계를 다시 하지만 라이프가 줄어요."
    :summary="`${stageIdx + 1}단계 · ${cleared}단계 성공`" @start="start">
    <div class="wrap">
      <GameHeader :stats="stats" @quit="finish" />
      <TimerBar :pct="timer.pct.value" :text="timer.text.value" :label="phase === 'preview' ? '외우기' : phase === 'play' ? '선택' : '결과'" />
      <p class="hint" role="status">{{ hint }}</p>
      <div class="order">
        <template v-if="showOrder">
          <span v-for="(w, i) in answer" :key="w" class="chip"><small>{{ i + 1 }}</small>{{ w }}</span>
        </template>
        <span v-else class="muted">정답은 숨겨져 있어요</span>
      </div>
      <div class="grid">
        <button v-for="w in gridWords" :key="w" class="word" :disabled="phase !== 'play' || picked.includes(w)" @click="pickWord(w)">
          {{ w }}<small v-if="picked.includes(w)">{{ picked.indexOf(w) + 1 }}</small>
        </button>
      </div>
      <button class="btn btn-sm clear" :disabled="phase !== 'play' || !picked.length" @click="clearPick">선택 초기화</button>
    </div>
  </GameScreen>
</template>

<style scoped>
.wrap { display: grid; gap: 12px; }
.hint { margin: 0; font-weight: 700; min-height: 24px; }
.order { display: flex; gap: 8px; flex-wrap: wrap; min-height: 42px; align-items: center; }
.chip { display: inline-flex; gap: 6px; align-items: center; background: var(--surface-2); padding: 6px 12px; border-radius: 999px; font-weight: 700; }
.chip small { background: var(--accent); color: var(--accent-text); border-radius: 999px; padding: 0 7px; font-size: 12px; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.word { position: relative; padding: 16px 4px; border: 2px solid var(--line); border-radius: 14px; background: var(--surface); font-weight: 800; font-size: 16px; }
.word:hover:not(:disabled) { border-color: var(--accent); }
.word:disabled { opacity: 0.55; }
.word small { position: absolute; top: 4px; right: 8px; color: var(--accent); }
.clear { justify-self: start; }
@media (max-width: 520px) { .grid { grid-template-columns: repeat(3, 1fr); } }
</style>
