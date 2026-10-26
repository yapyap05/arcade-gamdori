<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import GameHeader from '../shared/GameHeader.vue'
import { useLater, pick } from '../shared/kit'
import { sfx } from '../shared/sfx'
import { N, move, canMoveAny, entryCells, boardScore, makeDeck } from './threesLogic'

defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])

const BEST_KEY = 'gamdori-threes-best'
const status = ref('idle')
const tiles = ref([]) // 화면에 그려지는 타일들 (애니메이션 중인 사라질 타일 포함)
const score = ref(0)
const best = ref(Number(localStorage.getItem(BEST_KEY)) || 0)
const moves = ref(0)
const next = ref({ val: 1, bonus: false })
const { later, clearAll } = useLater()

let grid = Array(N * N).fill(null) // 논리 격자 (tiles 안의 reactive 타일을 가리킴)
let draw = makeDeck()
let idSeq = 1

const maxTile = computed(() => Math.max(0, ...tiles.value.filter((t) => !t.dead).map((t) => t.val)))
const stats = computed(() => [
  { label: '점수', value: score.value.toLocaleString() },
  { label: '최고', value: best.value.toLocaleString() },
  { label: '최대 타일', value: maxTile.value },
])

function place(val, r, c, enter = '') {
  const t = reactive({ id: idSeq++, val, r, c, dead: false, merged: false, enter })
  tiles.value.push(t)
  grid[r * N + c] = t
}

function start() {
  clearAll()
  grid = Array(N * N).fill(null)
  tiles.value = []
  draw = makeDeck()
  score.value = 0; moves.value = 0
  const cells = [...Array(N * N).keys()].sort(() => Math.random() - 0.5).slice(0, 9)
  cells.forEach((i) => place(draw(grid).val, Math.floor(i / N), i % N, 'pop'))
  next.value = draw(grid)
  status.value = 'playing'
}

function swipe(dir) {
  if (status.value !== 'playing') return
  tiles.value.forEach((t) => { t.merged = false; t.enter = '' })
  const res = move(grid, dir)
  if (!res.moved) return
  grid.forEach((t, i) => { if (t) { t.r = Math.floor(i / N); t.c = i % N } })
  res.absorbed.forEach(({ tile, r, c }) => { tile.r = r; tile.c = c; tile.dead = true })
  grid.forEach((t) => { if (t && res.absorbed.some((a) => a.r === t.r && a.c === t.c)) t.merged = true })
  later(() => { tiles.value = tiles.value.filter((t) => !t.dead) }, 140)

  // 새 타일: 밀어낸 반대편, 움직인 줄 중 한 곳에서 들어옴
  const entries = entryCells(dir, res.lanes).filter(([r, c]) => !grid[r * N + c])
  if (entries.length) {
    const [r, c] = pick(entries)
    const val = next.value.bonus ? pick(bonusValues()) : next.value.val
    place(val, r, c, dir)
  }
  next.value = draw(grid)
  moves.value++
  score.value = boardScore(grid)
  sfx[res.absorbed.length ? 'tick' : 'key']()
  if (score.value > best.value) {
    best.value = score.value
    try { localStorage.setItem(BEST_KEY, best.value) } catch {}
  }
  if (!canMoveAny(grid)) later(finish, 450)
}

// 보너스 타일은 실제 값을 놓는 순간에 정해진다 (6 ~ 최대타일/8)
function bonusValues() {
  const maxV = Math.max(...grid.filter(Boolean).map((t) => t.val))
  const list = []
  for (let v = 6; v <= maxV / 8; v *= 2) list.push(v)
  return list.length ? list : [6]
}

function finish() {
  clearAll()
  status.value = 'over'
  sfx.over()
  emit('gameover', { score: score.value, meta: { maxTile: maxTile.value, moves: moves.value } })
}

const KEYMAP = { ArrowUp: 'U', w: 'U', ArrowDown: 'D', s: 'D', ArrowLeft: 'L', a: 'L', ArrowRight: 'R', d: 'R' }
function onKey(e) {
  const dir = KEYMAP[e.key]
  if (!dir || status.value !== 'playing') return
  e.preventDefault()
  swipe(dir)
}
let sx = 0, sy = 0
const onDown = (e) => { sx = e.clientX; sy = e.clientY }
function onUp(e) {
  const dx = e.clientX - sx, dy = e.clientY - sy
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return
  Math.abs(dx) > Math.abs(dy) ? swipe(dx > 0 ? 'R' : 'L') : swipe(dy > 0 ? 'D' : 'U')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function style(t) {
  let bg, fg
  if (t.val === 1) { bg = '#5ec4ff'; fg = '#06293a' }
  else if (t.val === 2) { bg = '#ff7a8c'; fg = '#3a0710' }
  else { bg = `hsl(${(Math.log2(t.val / 3) * 42 + 48) % 360} 82% 62%)`; fg = '#1a1d3a' }
  return { '--bg': bg, '--fg': fg, '--fs': t.val >= 1000 ? '24px' : t.val >= 100 ? '30px' : '36px' }
}
const previewStyle = computed(() => (next.value.bonus ? { '--bg': '#a78bfa', '--fg': '#1b0f4a' } : style(next.value)))
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" title="쓰리쓰리 합체"
    desc="1+2=3, 3부터는 같은 숫자끼리 합쳐요. 밀면 모든 타일이 '한 칸씩만' 움직이고, 반대편에서 새 타일이 들어와요. 더 못 움직이면 끝!"
    :summary="`최대 타일 ${maxTile} · ${moves}번 이동`" @start="start">
    <div class="wrap">
      <GameHeader :stats="stats" @quit="finish" />
      <div class="next">
        <span class="label">다음 타일</span>
        <div class="chip" :style="previewStyle">{{ next.bonus ? '+' : next.val }}</div>
      </div>
      <div class="board" @pointerdown="onDown" @pointerup="onUp">
        <div class="bg"><i v-for="n in N * N" :key="n" /></div>
        <div class="layer">
          <div v-for="t in tiles" :key="t.id" class="slot" :style="{ left: t.c * 25 + '%', top: t.r * 25 + '%' }">
            <div :key="t.id + '-' + t.val" class="tile" :class="[t.merged && 'merge', t.enter && 'in-' + t.enter]" :style="style(t)">{{ t.val }}</div>
          </div>
        </div>
      </div>
    </div>
  </GameScreen>
</template>

<style scoped>
.wrap { display: grid; gap: 6px; justify-items: center; }
.wrap > :first-child { width: 100%; }
.next { display: flex; align-items: center; gap: 10px; }
.label { font-size: 13px; font-weight: 700; color: var(--muted); }
.chip { width: 38px; height: 50px; display: grid; place-items: center; border-radius: 10px; background: var(--bg); color: var(--fg); font-weight: 900; font-size: 22px; }
.board { position: relative; width: min(100%, 440px); aspect-ratio: 1; background: var(--board-grid); border-radius: 16px; padding: 10px; touch-action: none; user-select: none; }
.bg, .layer, .slot { position: absolute; }
.bg { inset: 10px; display: grid; grid-template-columns: repeat(4, 1fr); }
.bg i { margin: 5px; border-radius: 10px; background: var(--board-bg); }
.layer { inset: 10px; }
.slot { width: 25%; height: 25%; transition: left 0.12s ease, top 0.12s ease; }
.tile { position: absolute; inset: 5px; display: grid; place-items: center; border-radius: 10px; background: var(--bg); color: var(--fg); font-size: var(--fs); font-weight: 900; box-shadow: 0 3px 0 rgba(0, 0, 0, 0.18); }
.tile.merge { animation: merge 0.18s ease; }
.tile.in-pop { animation: pop 0.2s ease; }
.tile.in-L { animation: inR 0.14s ease-out; }
.tile.in-R { animation: inL 0.14s ease-out; }
.tile.in-U { animation: inB 0.14s ease-out; }
.tile.in-D { animation: inT 0.14s ease-out; }
@keyframes merge { 50% { transform: scale(1.16); } }
@keyframes pop { from { transform: scale(0.3); } to { transform: scale(1); } }
@keyframes inR { from { transform: translateX(110%); } }
@keyframes inL { from { transform: translateX(-110%); } }
@keyframes inB { from { transform: translateY(110%); } }
@keyframes inT { from { transform: translateY(-110%); } }
</style>
