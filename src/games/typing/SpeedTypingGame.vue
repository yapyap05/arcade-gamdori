<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import GameHeader from '../shared/GameHeader.vue'
import TimerBar from '../shared/TimerBar.vue'
import { useTimer, useLater, pick, hearts } from '../shared/kit'
import { sfx } from '../shared/sfx'

defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const TIMES = [12, 10, 8, 7, 5]
const WORDS = {
  KR: ['사과', '바나나', '컴퓨터', '제네시스', '홈텍스', '대한민국', '개발자', '코딩', '마우스', '키보드', '모니터', '갤럭시', '아이폰', '인공지능', '알고리즘', '데이터', '서버', '클라우드', '네트워크', '보안', '카페인', '야근', '프로젝트', '성공', '열정', '미래', '우주', '지구', '사랑', '행복', '자동차', '비행기', '여행', '휴가', '여권', '공항', '사진', '카메라', '영화', '음악'],
  EN: ['apple', 'banana', 'computer', 'genesis', 'hometax', 'korea', 'developer', 'coding', 'mouse', 'keyboard', 'monitor', 'galaxy', 'iphone', 'ai', 'algorithm', 'data', 'server', 'cloud', 'network', 'security', 'caffeine', 'overtime', 'project', 'success', 'passion', 'future', 'space', 'earth', 'love', 'happy', 'car', 'airplane', 'travel', 'vacation', 'passport', 'airport', 'photo', 'camera', 'movie', 'music'],
}

const status = ref('idle')
const lang = ref('KR')
const stageIdx = ref(0)
const target = ref('')
const typed = ref('')
const score = ref(0)
const correct = ref(0)
const wrong = ref(0)
const streak = ref(0)
const lives = ref(3)
const active = ref(false)
const feedback = ref('')
const inputEl = ref(null)

const timer = useTimer()
const { later, clearAll } = useLater()
let stageStart = 0

const stats = computed(() => [
  { label: 'Lv', value: stageIdx.value + 1 },
  { label: '점수', value: score.value },
  { label: '라이프', value: hearts(lives.value) },
  { label: '콤보', value: streak.value },
])
const chars = computed(() => target.value.split('').map((ch, i) => ({
  ch,
  cls: i < typed.value.length ? (typed.value[i] === ch ? 'ok' : 'bad') : i === typed.value.length ? 'cur' : '',
})))

function start() {
  stageIdx.value = 0; score.value = 0; correct.value = 0; wrong.value = 0; streak.value = 0; lives.value = 3
  status.value = 'playing'
  startStage()
}

function startStage() {
  const pool = WORDS[lang.value]
  target.value = [pick(pool), pick(pool), pick(pool)].join(' ')
  typed.value = ''
  feedback.value = ''
  active.value = true
  stageStart = performance.now()
  timer.start(TIMES[stageIdx.value], () => fail('시간 초과'))
  nextTick(() => inputEl.value?.focus())
}

// 정확히 입력하면 Enter 없이 바로 성공 처리
watch(typed, (v, old) => {
  if (!active.value) return
  if (v.length > (old?.length ?? 0)) sfx.key()
  if (v === target.value) success()
})

function success() {
  active.value = false
  const remain = timer.remain.value
  const elapsed = (performance.now() - stageStart) / 1000
  timer.stop()
  const gain = 100 + Math.floor(remain * 10) + streak.value * 5
  score.value += gain; correct.value++; streak.value++
  feedback.value = `성공! +${gain} (${Math.round(target.value.length / 5 / (elapsed / 60))} WPM)`
  sfx.correct()
  later(() => {
    if (stageIdx.value >= TIMES.length - 1) return finish(true)
    stageIdx.value++
    sfx.levelUp()
    startStage()
  }, 1000)
}

function fail(reason) {
  if (!active.value) return
  active.value = false
  timer.stop()
  wrong.value++; streak.value = 0; lives.value--
  feedback.value = `${reason}!`
  sfx.wrong()
  later(() => (lives.value <= 0 ? finish() : startStage()), 1200)
}

const submit = () => active.value && fail('오타 발생') // Enter 시 일치하지 않으면 실패

function finish(cleared = false) {
  clearAll(); timer.stop()
  active.value = false
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { lang: lang.value, stage: stageIdx.value + 1, correct: correct.value, wrong: wrong.value, cleared } })
}
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" title="키보드워리어"
    desc="제한 시간 안에 단어 3개를 정확히 입력하세요. 5단계까지 가면 클리어! 실패 3번이면 끝!"
    :summary="`${stageIdx + 1}단계 · 성공 ${correct} / 실패 ${wrong}`" @start="start">
    <template #options>
      <label class="opt">언어
        <select v-model="lang"><option value="KR">🇰🇷 한글 단어</option><option value="EN">🇺🇸 영어 단어</option></select>
      </label>
    </template>
    <div class="wrap">
      <GameHeader :stats="stats" @quit="finish()" />
      <TimerBar :pct="timer.pct.value" :text="timer.text.value" label="제한 시간" />
      <div class="target" aria-label="입력할 문장">
        <span v-for="(c, i) in chars" :key="i" class="ch" :class="c.cls">{{ c.ch === ' ' ? '\u00A0' : c.ch }}</span>
      </div>
      <form @submit.prevent="submit">
        <input ref="inputEl" v-model="typed" class="in" :disabled="!active" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="여기에 입력하세요" aria-label="입력" />
      </form>
      <p class="msg" role="status">{{ feedback }}</p>
    </div>
  </GameScreen>
</template>

<style scoped>
.wrap { display: grid; gap: 14px; }
.target { display: flex; flex-wrap: wrap; justify-content: center; align-content: center; min-height: 140px; padding: 20px; border-radius: 18px; background: var(--board-bg); font-size: 34px; font-weight: 800; letter-spacing: 1px; }
.ch { color: var(--muted); border-bottom: 3px solid transparent; }
.ch.ok { color: #2fd46b; }
.ch.bad { color: var(--danger); text-decoration: underline; }
.ch.cur { border-bottom-color: var(--accent); color: var(--text); }
.in { width: 100%; padding: 16px; font-size: 22px; border-radius: 14px; border: 2px solid var(--line); background: var(--surface); }
.in:focus { border-color: var(--accent); outline: none; }
.msg { margin: 0; text-align: center; font-weight: 800; min-height: 24px; }
.opt { display: grid; gap: 6px; font-size: 13px; font-weight: 700; }
select { padding: 8px 12px; border-radius: 10px; border: 0; background: #fff; color: #1a1d3a; font-weight: 600; }
@media (max-width: 520px) { .target { font-size: 24px; } }
</style>
