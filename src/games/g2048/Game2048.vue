<script setup>
import { ref, computed } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import { useLater, useKeys, useSwipe, arrowDir, pick } from '../shared/kit'
import { sfx } from '../shared/sfx'
import { useRecordsStore } from '../../stores/records'

const props = defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const N = 4
const WIN = 2048

const records = useRecordsStore()
const status = ref('idle')
const tiles = ref([]) // { id, val, r, c, isNew, merged, dead }
const score = ref(0)
const moves = ref(0)
const won = ref(false)
const keepPlaying = ref(false)
let nextId = 1
const { later } = useLater()

const best = computed(() => Math.max(score.value, records.best['2048']?.[props.mode]?.score ?? 0))
const live = computed(() => tiles.value.filter((t) => !t.dead))
const maxTile = computed(() => Math.max(0, ...live.value.map((t) => t.val)))
const stats = computed(() => [
  { label: '점수', value: score.value.toLocaleString() },
  { label: '최고', value: best.value.toLocaleString() },
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
  if (gained) sfx.tick()
  addRandom()
  // 판이 막혔으면 2048 달성 여부와 상관없이 종료 (달성 직후 막혀 멈추던 문제 수정)
  if (!canMove()) return finish()
  if (!won.value && live.value.some((t) => t.val >= WIN)) { won.value = true; sfx.levelUp() }
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

useKeys((e) => {
  const dir = arrowDir(e.code)
  if (!dir || status.value !== 'playing') return
  e.preventDefault()
  move(dir)
})
const swipe = useSwipe(move)

const tileClass = (t) => [`v${t.val <= WIN ? t.val : 'max'}`, { pop: t.isNew, merge: t.merged, sm: t.val >= 128, xs: t.val >= 1024 }]
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" :stats="stats" title="2048"
    :summary="`최대 타일 ${maxTile} · ${moves}회 이동`" @start="start" @quit="finish">
    <div class="board" v-on="swipe">
      <div class="bg"><i v-for="n in N * N" :key="n" /></div>
      <div class="layer">
        <div v-for="t in tiles" :key="t.id" class="slot" :style="{ left: t.c * 25 + '%', top: t.r * 25 + '%' }">
          <div class="tile num" :class="tileClass(t)">{{ t.val }}</div>
        </div>
      </div>
      <div v-if="won && !keepPlaying && status === 'playing'" class="win">
        <b>2048 달성!</b>
        <div>
          <button class="btn btn-primary btn-sm" @click="keepPlaying = true">계속하기</button>
          <button class="btn btn-sm" @click="finish">여기서 종료</button>
        </div>
      </div>
    </div>
  </GameScreen>
</template>

<style scoped>
.board {
  position: relative; width: min(100%, 420px); aspect-ratio: 1; margin: 0 auto; padding: 6px;
  border-radius: var(--r-md); background: var(--board-grid); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
  touch-action: none; user-select: none;
}
.bg, .layer, .slot { position: absolute; }
.layer, .bg { inset: 6px; }
.bg { display: grid; grid-template-columns: repeat(4, 1fr); }
.bg i { margin: 4px; border-radius: 10px; background: var(--board-bg); }
.slot { width: 25%; height: 25%; transition: left 0.12s ease, top 0.12s ease; }
.tile {
  position: absolute; inset: 4px; display: grid; place-items: center; border-radius: 10px;
  font-size: 30px; border: var(--bw) solid var(--bc);
}
.tile.sm { font-size: 24px; }
.tile.xs { font-size: 19px; }
.v2 { background: var(--t2); color: var(--t2i); } .v4 { background: var(--t4); color: var(--t4i); }
.v8 { background: var(--t8); color: var(--t8i); } .v16 { background: var(--t16); color: var(--t16i); }
.v32 { background: var(--t32); color: var(--t32i); } .v64 { background: var(--t64); color: var(--t64i); }
.v128 { background: var(--t128); color: var(--t128i); } .v256 { background: var(--t256); color: var(--t256i); }
.v512 { background: var(--t512); color: var(--t512i); } .v1024 { background: var(--t1024); color: var(--t1024i); }
.v2048, .vmax { background: var(--t2048); color: var(--t2048i); }
.tile.pop { animation: pop 0.18s ease; }
.tile.merge { animation: merge 0.18s ease; }
@keyframes pop { from { transform: scale(0.3); } to { transform: scale(1); } }
@keyframes merge { 50% { transform: scale(1.15); } }
.win {
  position: absolute; inset: 0; z-index: 2; border-radius: inherit; background: var(--scrim); color: #fff;
  display: grid; place-content: center; justify-items: center; gap: 12px;
  font-family: var(--font-display); font-weight: var(--display-weight); font-size: 26px;
}
.win div { display: flex; gap: 8px; }
</style>
