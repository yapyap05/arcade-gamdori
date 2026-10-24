<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import GameHeader from '../shared/GameHeader.vue'
import data from '../../assets/data/text-data-novel.json'
import { sfx } from '../shared/sfx'

defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const novels = data.novels ?? []
const KEYS_PER_CHAR = 2.8 // 기존과 동일: 한글 1자 ≈ 2.8타 (타수 환산)

const status = ref('idle')
const novelIdx = ref(0)
const sentenceIdx = ref(0)
const typed = ref('')
const score = ref(0)
const elapsed = ref(0)
const doneChars = ref(0)
const logs = ref([])
const inputEl = ref(null)

let startedAt = 0
let sentenceStart = 0
let deletions = 0
let clock = 0
let skipNext = false // 프로그램이 입력창을 비울 때는 '지움'으로 세지 않음

const novel = computed(() => novels[novelIdx.value])
const sentence = computed(() => novel.value?.sentences[sentenceIdx.value] ?? '')
const chars = computed(() => sentence.value.split('').map((ch, i) => ({
  ch,
  cls: i < typed.value.length ? (typed.value[i] === ch ? 'ok' : 'bad') : i === typed.value.length ? 'cur' : '',
})))
const speed = computed(() => (elapsed.value > 0 ? Math.floor(((doneChars.value + typed.value.length) * 60 * KEYS_PER_CHAR) / elapsed.value) : 0))
const liveAcc = computed(() => {
  const n = typed.value.length
  return n ? Math.floor((chars.value.filter((c, i) => i < n && c.cls === 'ok').length / n) * 100) : 100
})
const stats = computed(() => [
  { label: '진행', value: `${sentenceIdx.value + 1} / ${novel.value?.sentences.length ?? 0}` },
  { label: '점수', value: score.value },
  { label: '타수', value: speed.value },
  { label: '정확도', value: liveAcc.value + '%' },
])

function start() {
  sentenceIdx.value = 0; score.value = 0; doneChars.value = 0; logs.value = []; elapsed.value = 0
  if (typed.value) skipNext = true
  typed.value = ''
  deletions = 0
  status.value = 'playing'
  startedAt = sentenceStart = Date.now()
  clearInterval(clock)
  clock = setInterval(() => (elapsed.value = (Date.now() - startedAt) / 1000), 200)
  nextTick(() => inputEl.value?.focus())
}

// 정확도는 지운 글자 수(오타 정정) 기준: 길이 / (길이 + 지운 글자)
watch(typed, (v, old) => {
  if (skipNext) { skipNext = false; return }
  if (status.value !== 'playing') return
  if (v.length < (old?.length ?? 0)) deletions += old.length - v.length
  else sfx.key()
  if (v === sentence.value) completeSentence()
})

function completeSentence() {
  const len = sentence.value.length
  const sec = Math.max(0.5, (Date.now() - sentenceStart) / 1000)
  const acc = Math.round((len / (len + deletions)) * 100)
  const sentenceSpeed = Math.floor((len * 60 * KEYS_PER_CHAR) / sec)
  const gain = Math.round(len * 10 * (acc / 100)) + Math.floor(sentenceSpeed / 10)
  score.value += gain
  logs.value.unshift({ text: sentence.value, speed: sentenceSpeed, acc, gain })
  doneChars.value += len
  deletions = 0
  skipNext = true
  typed.value = ''
  sentenceStart = Date.now()
  sfx.correct()
  if (sentenceIdx.value >= novel.value.sentences.length - 1) return finish(true)
  sentenceIdx.value++
}

function finish(completed = false) {
  clearInterval(clock)
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { novel: novel.value?.title, sentences: logs.value.length, completed } })
}
onBeforeUnmount(() => clearInterval(clock))
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" title="나는야 타자왕"
    desc="문장을 정확하고 빠르게 따라 치세요. 오타를 고칠수록 정확도 점수가 깎여요. 끝까지 치면 완독!"
    :summary="`${novel?.title} · ${logs.length}문장 완료`" @start="start">
    <template #options>
      <label class="opt">작품
        <select v-model.number="novelIdx"><option v-for="(n, i) in novels" :key="i" :value="i">{{ n.title }}</option></select>
      </label>
    </template>
    <div class="wrap">
      <GameHeader :stats="stats" @quit="finish()" />
      <p class="title">📜 {{ novel?.title }}</p>
      <div class="target" aria-label="입력할 문장">
        <span v-for="(c, i) in chars" :key="i" class="ch" :class="c.cls">{{ c.ch === ' ' ? '\u00A0' : c.ch }}</span>
      </div>
      <input ref="inputEl" v-model="typed" class="in" :disabled="status !== 'playing'" autocomplete="off" autocorrect="off" autocapitalize="off" enterkeyhint="done" @paste.prevent @drop.prevent spellcheck="false" placeholder="문장을 입력하세요" aria-label="입력" />
      <ul class="logs">
        <li v-for="(l, i) in logs.slice(0, 4)" :key="i"><span class="txt">{{ l.text }}</span><b>{{ l.speed }}타 · {{ l.acc }}%</b></li>
      </ul>
    </div>
  </GameScreen>
</template>

<style scoped>
.wrap { display: grid; gap: 12px; }
.title { margin: 0; font-weight: 700; color: var(--muted); }
.target { min-height: 120px; padding: 20px; border-radius: 18px; background: var(--board-bg); font-size: 26px; line-height: 1.7; font-weight: 700; word-break: keep-all; }
.ch { color: var(--muted); border-bottom: 3px solid transparent; }
.ch.ok { color: #2fd46b; }
.ch.bad { color: var(--danger); text-decoration: underline; }
.ch.cur { border-bottom-color: var(--accent); color: var(--text); }
.in { width: 100%; padding: 16px; font-size: 20px; border-radius: 14px; border: 2px solid var(--line); background: var(--surface); }
.in:focus { border-color: var(--accent); outline: none; }
.logs { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: 13px; }
.logs li { display: flex; justify-content: space-between; gap: 12px; padding: 8px 12px; border-radius: 10px; background: var(--surface-2); }
.txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.opt { display: grid; gap: 6px; font-size: 13px; font-weight: 700; }
select { padding: 8px 12px; border-radius: 10px; border: 0; background: #fff; color: #1a1d3a; font-weight: 600; }
@media (max-width: 520px) { .target { font-size: 20px; } }
</style>
