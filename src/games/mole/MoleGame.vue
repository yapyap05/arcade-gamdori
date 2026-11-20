<script setup>
import { ref, computed } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import PixelIcon from '../../components/PixelIcon.vue'
import { useLater, pick, hearts } from '../shared/kit'
import { sfx } from '../shared/sfx'

defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const HOLES = 9
const status = ref('idle')
const holes = ref(Array(HOLES).fill(null)) // null | { uid, type: 'mole'|'bomb', state: 'up'|'hit'|'boom' }
const score = ref(0)
const lives = ref(3)
const combo = ref(0)
const hits = ref(0)
const { later, clearAll } = useLater()
let spawned = 0, uidSeq = 0
let dead = false // 라이프가 0이 된 뒤 종료까지의 짧은 연출 동안 입력·등장 막기

const stats = computed(() => [
  { label: '점수', value: score.value },
  { label: '라이프', value: hearts(lives.value) },
  { label: '콤보', value: combo.value },
])

// 난이도: 스폰이 늘수록 간격·체류 시간이 줄어듦
const hard = () => Math.min(1, spawned / 90)
const gap = () => 950 - 600 * hard()
const lifespan = () => 1200 - 650 * hard()

function start() {
  clearAll()
  holes.value = Array(HOLES).fill(null)
  score.value = 0; lives.value = 3; combo.value = 0; hits.value = 0
  spawned = 0
  dead = false
  status.value = 'playing'
  later(spawn, 500)
}

function spawn() {
  if (status.value !== 'playing' || dead) return
  const free = holes.value.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0)
  if (free.length) {
    const i = pick(free)
    const uid = ++uidSeq
    holes.value[i] = { uid, type: spawned > 8 && Math.random() < 0.18 ? 'bomb' : 'mole', state: 'up' }
    spawned++
    later(() => expire(i, uid), lifespan())
  }
  later(spawn, gap())
}

function clear(i, uid) {
  if (holes.value[i]?.uid === uid) holes.value[i] = null
}

function loseLife() {
  lives.value--
  combo.value = 0
  sfx.wrong()
  if (lives.value <= 0) { dead = true; later(finish, 350) }
}

// 두더지를 놓치면 라이프 -1, 폭탄은 그냥 사라짐
function expire(i, uid) {
  const h = holes.value[i]
  if (!h || h.uid !== uid || h.state !== 'up') return
  holes.value[i] = null
  if (h.type === 'mole' && status.value === 'playing' && !dead) loseLife()
}

function whack(i) {
  const h = holes.value[i]
  if (status.value !== 'playing' || dead || !h || h.state !== 'up') return
  if (h.type === 'mole') {
    combo.value++
    hits.value++
    score.value += 10 + Math.min(combo.value, 10) * 2
    h.state = 'hit'
    sfx.correct()
  } else {
    h.state = 'boom'
    loseLife()
  }
  later(() => clear(i, h.uid), 350)
}

const icon = (h) => (h.state === 'hit' ? 'star' : h.state === 'boom' ? 'boom' : h.type === 'bomb' ? 'bomb' : 'mole')

function finish() {
  if (status.value !== 'playing') return
  clearAll()
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { hits: hits.value } })
}
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" :stats="stats" title="두더지 소탕작전"
    :summary="`두더지 ${hits}마리 소탕`" @start="start" @quit="finish">
    <div class="field">
      <button v-for="(h, i) in holes" :key="i" class="hole" :aria-label="`구멍 ${i + 1}`" @pointerdown.prevent="whack(i)">
        <span class="dirt" />
        <span v-if="h" :key="h.uid + h.state" class="critter" :class="h.state"><PixelIcon :name="icon(h)" size="100%" /></span>
      </button>
    </div>
  </GameScreen>
</template>

<style scoped>
.field {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; width: min(100%, 420px); margin: 0 auto; padding: 14px;
  border-radius: var(--r-md); background: var(--board-bg); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
}
.hole { position: relative; aspect-ratio: 1; padding: 0; border: 0; background: none; overflow: hidden; border-radius: 14px; touch-action: manipulation; }
.dirt { position: absolute; left: 8%; right: 8%; bottom: 6%; height: 30%; border-radius: 50%; background: #5B3A1E; box-shadow: inset 0 6px 0 #2E1D0E; }
.critter { position: absolute; left: 20%; right: 20%; bottom: 16%; aspect-ratio: 1; animation: pop 0.14s ease-out; }
.critter.hit, .critter.boom { animation: bump 0.3s ease-out; }
@keyframes pop { from { transform: translateY(70%); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes bump { 50% { transform: scale(1.3); } }
</style>
