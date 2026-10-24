<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import GameHeader from '../shared/GameHeader.vue'
import { useLater, pick } from '../shared/kit'
import { sfx } from '../shared/sfx'

defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const N = 4
const WIN = 2048
const BEST_KEY = 'gamdori-2048-best' // 기존 저장 키 유지

const status = ref('idle')
const tiles = ref([]) // { id, val, r, c, isNew, merged, dead }
const score = ref(0)
const best = ref(Number(localStorage.getItem(BEST_KEY)) || 0)
const moves = ref(0)
const won = ref(false)
const keepPlaying = ref(false)
let nextId = 1
const { later } = useLater()

const live = computed(() => tiles.value.filter((t) => !t.dead))
const maxTile = computed(() => Math.max(0, ...live.value.map((t) => t.val)))
const stats = computed(() => [
  { label: '점수', value: score.value },
  { label: '최고', value: best.value },
])

function addRandom() {
  const taken = new Set(live.value.map((t) => t.r * N + t.c))
  const empty = [...Array(N * N).keys()].filter((i) => !taken.has(i))
  if (!empty.length) return
  const i = pick(empty)
  tiles.value.push({ id: nextId++, val: Math.random() < 0.9 ? 2 : 4, r: Math.floor(i / N), c: i % N, isNew: true })
}

function start() {
  tiles.value = []
  score.value = 0; moves.value = 0; won.value = false; keepPlaying.value = false
  status.value = 'playing'
  addRandom(); addRandom()
}

function move(dir) {
  if (status.value !== 'playing' || (won.value && !keepPlaying.value)) return
  let moved = false
  let gained = 0
  const horizontal = dir === 'L' || dir === 'R'
  const fresh = []
  for (let i = 0; i < N; i++) {
    const line = live.value
      .filter((t) => (horizontal ? t.r === i : t.c === i))
      .sort((a, b) => (dir === 'L' ? a.c - b.c : dir === 'R' ? b.c - a.c : dir === 'U' ? a.r - b.r : b.r - a.r))
    const place = (t, p) => {
      const to = dir === 'L' || dir === 'U' ? p : N - 1 - p
      if (horizontal) { if (t.c !== to) moved = true; t.c = to } else { if (t.r !== to) moved = true; t.r = to }
    }
    let p = 0
    for (let k = 0; k < line.length; k++, p++) {
      const a = line[k], b = line[k + 1]
      a.isNew = false
      if (b && a.val === b.val) {
        place(a, p); place(b, p)
        a.dead = b.dead = true
        const m = { id: nextId++, val: a.val * 2, r: a.r, c: a.c, merged: true }
        fresh.push(m)
        gained += m.val
        moved = true
        k++
      } else place(a, p)
    }
  }
  if (!moved) return
  tiles.value.push(...fresh)
  later(() => { tiles.value = tiles.value.filter((t) => !t.dead) }, 140)
  score.value += gained
  moves.value++
  if (score.value > best.value) {
    best.value = score.value
    try { localStorage.setItem(BEST_KEY, best.value) } catch {}
  }
  if (gained) sfx.tick()
  addRandom()
  if (!won.value && live.value.some((t) => t.val >= WIN)) { won.value = true; sfx.levelUp(); return }
  if (!canMove()) finish()
}

function canMove() {
  if (live.value.length < N * N) return true
  const grid = {}
  live.value.forEach((t) => (grid[t.r * N + t.c] = t.val))
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const v = grid[r * N + c]
      if (c < N - 1 && grid[r * N + c + 1] === v) return true
      if (r < N - 1 && grid[(r + 1) * N + c] === v) return true
    }
  return false
}

function finish() {
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { maxTile: maxTile.value, moves: moves.value } })
}

const KEYMAP = { ArrowUp: 'U', w: 'U', ArrowDown: 'D', s: 'D', ArrowLeft: 'L', a: 'L', ArrowRight: 'R', d: 'R' }
function onKey(e) {
  const dir = KEYMAP[e.key]
  if (!dir || status.value !== 'playing') return
  e.preventDefault()
  move(dir)
}

let sx = 0, sy = 0
const onDown = (e) => { sx = e.clientX; sy = e.clientY }
function onUp(e) {
  const dx = e.clientX - sx, dy = e.clientY - sy
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'R' : 'L')
  else move(dy > 0 ? 'D' : 'U')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function tileStyle(t) {
  const lg = Math.log2(t.val)
  const small = t.val <= 4
  return {
    '--bg': small ? 'var(--surface-2)' : `hsl(${(lg - 3) * 28 + 210} 72% ${lg > 10 ? 45 : 56}%)`,
    '--fg': small ? 'var(--text)' : '#fff',
    '--fs': t.val >= 1024 ? '26px' : t.val >= 128 ? '30px' : '36px',
  }
}
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" title="2048" desc="방향키(또는 스와이프)로 같은 숫자를 합쳐 2048을 만들어 보세요. 더 못 움직이면 끝!"
    :summary="`최대 타일 ${maxTile} · ${moves}회 이동`" @start="start">
    <div class="wrap">
      <GameHeader :stats="stats" @quit="finish" />
      <div class="board" @pointerdown="onDown" @pointerup="onUp">
        <div class="bg"><i v-for="n in N * N" :key="n" /></div>
        <div class="layer">
          <div v-for="t in tiles" :key="t.id" class="slot" :style="{ left: t.c * 25 + '%', top: t.r * 25 + '%' }">
            <div class="tile" :class="{ pop: t.isNew, merge: t.merged }" :style="tileStyle(t)">{{ t.val }}</div>
          </div>
        </div>
        <div v-if="won && !keepPlaying && status === 'playing'" class="win">
          <b>2048 달성! 🎉</b>
          <div>
            <button class="btn btn-cta btn-sm" @click="keepPlaying = true">계속하기</button>
            <button class="btn btn-sm" @click="finish">여기서 종료</button>
          </div>
        </div>
      </div>
    </div>
  </GameScreen>
</template>

<style scoped>
.wrap { display: grid; gap: 4px; }
.board { position: relative; width: min(100%, 460px); aspect-ratio: 1; margin: 0 auto; background: var(--board-grid); border-radius: 16px; padding: 10px; touch-action: none; user-select: none; }
.bg, .layer, .slot { position: absolute; }
.layer { inset: 10px; }
.bg { inset: 10px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; }
.bg i { margin: 5px; border-radius: 10px; background: var(--board-bg); }
.slot { width: 25%; height: 25%; transition: left 0.12s ease, top 0.12s ease; }
.tile { position: absolute; inset: 5px; display: grid; place-items: center; border-radius: 10px; background: var(--bg); color: var(--fg); font-size: var(--fs); font-weight: 800; }
.tile.pop { animation: pop 0.18s ease; }
.tile.merge { animation: merge 0.18s ease; }
@keyframes pop { from { transform: scale(0.3); } to { transform: scale(1); } }
@keyframes merge { 50% { transform: scale(1.18); } }
.win { position: absolute; inset: 0; border-radius: 16px; background: rgba(12, 14, 34, 0.8); color: #fff; display: grid; place-content: center; justify-items: center; gap: 12px; font-size: 24px; }
.win div { display: flex; gap: 8px; }
</style>
