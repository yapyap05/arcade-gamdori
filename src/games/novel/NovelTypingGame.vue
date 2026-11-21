<script setup>
import { ref, computed } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import TypingInput from '../shared/TypingInput.vue'
import { useStopwatch } from '../shared/kit'
import { sfx } from '../shared/sfx'
import { dateKey } from '../../utils/daily'
import data from '../../assets/data/text-data-novel.json'

const props = defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const novels = data.novels ?? []
// 타수 환산: 한글 음절 1자 ≈ 2.8타, 영문·숫자·공백·문장부호는 1타
const HANGUL_KEYS = 2.8
const keysOf = (str) => [...str].reduce((n, ch) => n + (/[가-힣]/.test(ch) ? HANGUL_KEYS : 1), 0)
// 경쟁 모드: 그날 모두 같은 '오늘의 작품'
const dailyIdx = () => [...dateKey()].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % Math.max(1, novels.length)

const status = ref('idle')
const pickIdx = ref(0) // 캐주얼에서 고른 작품
const novelIdx = ref(0)
const sentenceIdx = ref(0)
const typed = ref('')
const composing = ref(false)
const score = ref(0)
const doneKeys = ref(0)
const deletions = ref(0) // 이번 문장에서 Backspace 누른 횟수
const logs = ref([])
const input = ref(null)
const clock = useStopwatch()
let sentenceStart = 0

const novel = computed(() => novels[novelIdx.value])
const sentence = computed(() => novel.value?.sentences[sentenceIdx.value] ?? '')
// 조합 중인 마지막 글자는 맞고 틀림을 판정하지 않음
const chars = computed(() => {
  const n = typed.value.length
  return sentence.value.split('').map((ch, i) => ({
    ch,
    cls: i < n
      ? (composing.value && i === n - 1 ? 'comp' : typed.value[i] === ch ? 'ok' : 'bad')
      : i === n ? 'cur' : '',
  }))
})
const speed = computed(() => {
  const sec = clock.seconds.value
  return sec > 0 ? Math.floor(((doneKeys.value + keysOf(typed.value)) * 60) / sec) : 0
})
// 정확도 (실시간·문장 완료 모두 같은 공식): 입력 길이 / (입력 길이 + 지운 횟수)
const accuracy = (len, del) => (len ? Math.round((len / (len + del)) * 100) : 100)
const liveAcc = computed(() => accuracy(typed.value.length, deletions.value))
const stats = computed(() => [
  { label: '진행', value: `${sentenceIdx.value + 1}/${novel.value?.sentences.length ?? 0}` },
  { label: '점수', value: score.value },
  { label: '타수', value: speed.value },
  { label: '정확도', value: liveAcc.value + '%' },
])

function start() {
  novelIdx.value = props.mode === 'competitive' ? dailyIdx() : pickIdx.value
  sentenceIdx.value = 0; score.value = 0; doneKeys.value = 0; logs.value = []
  status.value = 'playing'
  input.value?.focus() // 시작 버튼을 누른 그 순간에 포커스해야 모바일 키보드가 열림
  resetSentence()
  clock.start()
}

function resetSentence() {
  input.value?.clear()
  typed.value = ''
  composing.value = false
  deletions.value = 0
  sentenceStart = clock.seconds.value
}

function onChange({ value, composing: c }) {
  if (status.value !== 'playing') return
  if (value.length > typed.value.length) sfx.key()
  typed.value = value
  composing.value = c
  if (value === sentence.value) completeSentence()
}
const onErase = () => { if (status.value === 'playing') deletions.value++ }
const onSubmit = (value) => { if (value === sentence.value) completeSentence() }

function completeSentence() {
  const text = sentence.value
  const sec = Math.max(1, clock.seconds.value - sentenceStart)
  const acc = accuracy(text.length, deletions.value)
  const sentenceSpeed = Math.floor((keysOf(text) * 60) / sec)
  const gain = Math.round(text.length * 10 * (acc / 100)) + Math.floor(sentenceSpeed / 10)
  score.value += gain
  logs.value.unshift({ text, speed: sentenceSpeed, acc })
  doneKeys.value += keysOf(text)
  sfx.correct()
  if (sentenceIdx.value >= novel.value.sentences.length - 1) return finish(true)
  sentenceIdx.value++
  resetSentence()
}

function finish(completed = false) {
  if (status.value !== 'playing') return
  clock.stop()
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { novel: novel.value?.title, sentences: logs.value.length, completed } })
}
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" :stats="stats" title="프로타자머신"
    :summary="`${novel?.title} · ${logs.length}문장 완료`" @start="start" @quit="finish()">
    <template #options>
      <label v-if="mode === 'casual'" class="opt">
        <span>작품</span>
        <select v-model.number="pickIdx"><option v-for="(n, i) in novels" :key="i" :value="i">{{ n.title }}</option></select>
      </label>
      <p v-else class="daily">오늘의 작품 · {{ novels[dailyIdx()]?.title }}</p>
    </template>
    <p class="title">{{ novel?.title }}</p>
    <div class="target" aria-label="입력할 문장">
      <span v-for="(c, i) in chars" :key="i" class="ch" :class="c.cls">{{ c.ch }}</span>
    </div>
    <template #controls>
      <TypingInput ref="input" :locked="status !== 'playing'" placeholder="문장을 입력" @change="onChange" @submit="onSubmit" @erase="onErase" />
      <ul v-if="logs.length" class="logs">
        <li v-for="(l, i) in logs.slice(0, 2)" :key="i"><span class="txt">{{ l.text }}</span><b class="num">{{ l.speed }}타 · {{ l.acc }}%</b></li>
      </ul>
    </template>
  </GameScreen>
</template>

<style scoped>
.title { margin: 0 0 8px; font-size: 13px; font-weight: 700; color: var(--muted); }
.target {
  min-height: 120px; padding: 18px; line-height: 1.7; font-size: 22px; font-weight: 700;
  white-space: pre-wrap; word-break: keep-all; overflow-wrap: anywhere; /* 띄어쓰기에서 줄바꿈, 너무 긴 단어는 강제로 */
  border-radius: var(--r-md); background: var(--board-bg); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
}
.ch { color: var(--muted); border-bottom: 3px solid transparent; }
.ch.ok { color: var(--accent); }
.ch.bad { color: var(--danger); text-decoration: underline; }
.ch.comp { color: var(--text); border-bottom-color: var(--muted); }
.ch.cur { border-bottom-color: var(--accent); color: var(--text); }
.logs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.logs li {
  display: flex; justify-content: space-between; gap: 12px; padding: 8px 12px;
  border-radius: 10px; background: var(--surface-2); border: var(--bw) solid var(--bc);
}
.txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.daily { margin: 0; font-size: 13px; font-weight: 700; color: var(--muted); }
</style>
