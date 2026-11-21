<script setup>
import { ref, computed } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import TypingInput from '../shared/TypingInput.vue'
import { useTimer, useLater, pick, hearts } from '../shared/kit'
import { sfx } from '../shared/sfx'

const props = defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const TIMES = [12, 10, 8, 7, 5]
const WORDS = {
  KR: ['사과', '바나나', '컴퓨터', '제네시스', '홈텍스', '대한민국', '개발자', '코딩', '마우스', '키보드', '모니터', '갤럭시', '아이폰', '인공지능', '알고리즘', '데이터', '서버', '클라우드', '네트워크', '보안', '카페인', '야근', '프로젝트', '성공', '열정', '미래', '우주', '지구', '사랑', '행복', '자동차', '비행기', '여행', '휴가', '여권', '공항', '사진', '카메라', '영화', '음악'],
  EN: ['apple', 'banana', 'computer', 'genesis', 'hometax', 'korea', 'developer', 'coding', 'mouse', 'keyboard', 'monitor', 'galaxy', 'iphone', 'ai', 'algorithm', 'data', 'server', 'cloud', 'network', 'security', 'caffeine', 'overtime', 'project', 'success', 'passion', 'future', 'space', 'earth', 'love', 'happy', 'car', 'airplane', 'travel', 'vacation', 'passport', 'airport', 'photo', 'camera', 'movie', 'music'],
}

const status = ref('idle')
const lang = ref('KR')
const startIdx = ref(0)
const stageIdx = ref(0)
const target = ref('')
const typed = ref('')
const composing = ref(false)
const score = ref(0)
const correct = ref(0)
const wrong = ref(0)
const streak = ref(0)
const lives = ref(3)
const active = ref(false)
const toast = ref('')
const input = ref(null)

const timer = useTimer()
const { later, clearAll } = useLater()

const stats = computed(() => [
  { label: '단계', value: stageIdx.value + 1 },
  { label: '점수', value: score.value },
  { label: '라이프', value: hearts(lives.value) },
  { label: '연속', value: streak.value },
])
const timerView = computed(() => ({ pct: timer.pct.value, text: timer.text.value, label: '시간' }))
// 조합 중인 마지막 글자는 맞고 틀림을 판정하지 않음
const chars = computed(() => {
  const n = typed.value.length
  return target.value.split('').map((ch, i) => ({
    ch,
    cls: i < n
      ? (composing.value && i === n - 1 ? 'comp' : typed.value[i] === ch ? 'ok' : 'bad')
      : i === n ? 'cur' : '',
  }))
})

function start() {
  stageIdx.value = props.mode === 'casual' ? startIdx.value : 0 // 시작 단계 선택은 캐주얼만
  score.value = 0; correct.value = 0; wrong.value = 0; streak.value = 0; lives.value = 3
  status.value = 'playing'
  input.value?.focus() // 시작 버튼을 누른 그 순간에 포커스해야 모바일 키보드가 열림
  startStage()
}

function startStage() {
  const pool = WORDS[lang.value]
  target.value = [pick(pool), pick(pool), pick(pool)].join(' ')
  input.value?.clear()
  typed.value = ''
  composing.value = false
  toast.value = ''
  active.value = true
  timer.start(TIMES[stageIdx.value], () => fail('시간 초과'))
}

function onChange({ value, composing: c }) {
  if (!active.value) return
  if (value.length > typed.value.length) sfx.key()
  typed.value = value
  composing.value = c
  if (value === target.value) success() // 정확히 입력하면 Enter 없이 바로 성공
}

function onSubmit(value) {
  if (!active.value) return
  if (value === target.value) success()
  else fail('오타')
}

function success() {
  active.value = false
  const remain = timer.remain.value
  timer.stop()
  const gain = 100 + Math.floor(remain * 10) + streak.value * 5
  score.value += gain; correct.value++; streak.value++
  toast.value = `성공 +${gain}`
  sfx.correct()
  input.value?.clear()
  later(() => {
    if (stageIdx.value >= TIMES.length - 1) return finish(true)
    stageIdx.value++
    sfx.levelUp()
    startStage()
  }, 900)
}

function fail(reason) {
  if (!active.value) return
  active.value = false
  timer.stop()
  wrong.value++; streak.value = 0; lives.value--
  toast.value = reason
  sfx.wrong()
  later(() => (lives.value <= 0 ? finish() : startStage()), 1200)
}

function finish(cleared = false) {
  if (status.value !== 'playing') return
  clearAll(); timer.stop()
  active.value = false
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { lang: lang.value, stage: stageIdx.value + 1, correct: correct.value, wrong: wrong.value, cleared } })
}
</script>

<template>
  <GameScreen v-model:stage="startIdx" :status="status" :mode="mode" :score="score" :stats="stats" :timer="timerView" :toast="toast"
    :stages="TIMES.map((t, i) => `${i + 1}단계 (${t}초)`)" title="키보드워리어"
    :summary="`${stageIdx + 1}단계 · 성공 ${correct} · 실패 ${wrong}`" @start="start" @quit="finish()">
    <template #options>
      <label class="opt">
        <span>단어</span>
        <select v-model="lang"><option value="KR">한글</option><option value="EN">영어</option></select>
      </label>
    </template>
    <div class="target" aria-label="입력할 단어">
      <p class="line"><span v-for="(c, i) in chars" :key="i" class="ch" :class="c.cls">{{ c.ch }}</span></p>
    </div>
    <template #controls>
      <TypingInput ref="input" :locked="!active" placeholder="여기에 입력" @change="onChange" @submit="onSubmit" />
    </template>
  </GameScreen>
</template>

<style scoped>
.target {
  display: flex; align-items: center; justify-content: center; min-height: 140px; padding: 18px; text-align: center;
  border-radius: var(--r-md); background: var(--board-bg); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
  font-size: 28px; font-weight: 700; letter-spacing: 1px;
}
.line { margin: 0; white-space: pre-wrap; word-break: keep-all; overflow-wrap: anywhere; }
.ch { color: var(--muted); border-bottom: 3px solid transparent; }
.ch.ok { color: var(--accent); }
.ch.bad { color: var(--danger); text-decoration: underline; }
.ch.comp { color: var(--text); border-bottom-color: var(--muted); }
.ch.cur { border-bottom-color: var(--accent); color: var(--text); }
</style>
