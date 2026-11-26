<script setup>
import { ref, shallowRef, computed, triggerRef, watch } from 'vue'
import GameScreen from '../shared/GameScreen.vue'
import HwatuCard from '../hwatu/HwatuCard.vue'
import PixelIcon from '../../components/PixelIcon.vue'
import TimerBar from '../shared/TimerBar.vue'
import { useLater, useTimer } from '../shared/kit'
import { useGameCtx } from '../shared/context'
import { sfx } from '../shared/sfx'
import { useWallet, GOAL_GAM } from '../hwatu/wallet'
import { avatarOf, turnSec, TURN_OPTIONS } from '../hwatu/avatars'
import { isGwang, monthOf } from '../hwatu/cards'
import { createRound, act, actions, rematch, handOf } from './engine'
import { aiAction } from './ai'

const props = defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])
const ctx = useGameCtx()
const { later, clearAll } = useLater()
const { pct: tPct, text: tText, start: tStart, stop: tStop } = useTimer()

const NAMES = ['나', '얍얍돌이', '펭귄돌이', '겜돌이']
const ANTES = [10, 20, 50, 100, 500, 1000, 2000, 5000]
const fmt = (n) => Math.max(0, Math.floor(n)).toLocaleString()

const wallet = useWallet('seotda', props.mode)
const w = wallet.state
const status = ref('idle')
const ante = ref(20)
const st = shallowRef(null) // 엔진 상태 (엔진이 직접 고치므로 고친 뒤 triggerRef)
const dealer = ref(0)
const score = ref(0)
const summary = ref('')
const toast = ref('')
const showJokbo = ref(false)

const JOKBO = [
  ['38광땡', '3광 + 8광 · 최강'], ['13·18광땡', '1광 + 3광 / 8광'], ['장땡 · 9~1땡', '같은 월 2장'],
  ['알리 > 독사 > 구삥', '1·2 > 1·4 > 1·9'], ['장삥 > 장사 > 세륙', '1·10 > 4·10 > 4·6'], ['갑오 ~ 망통', '두 장 합의 끝자리 9 ~ 0'],
  ['암행어사', '4·7 열끗 · 13·18광땡을 잡음'], ['땡잡이', '3광 + 7 열끗 · 1~9땡을 잡음'],
  ['구사', '4·9 · 최고패가 알리 이하면 재경기'], ['멍텅구리구사', '4·9 열끗 · 9땡 이하면 재경기'],
]

// 나는 지갑, AI 는 돈이 무한
const io = {
  pay: (p, amt) => (p === 0 ? wallet.spend(amt) : amt),
  funds: (p) => (p === 0 ? w.bank : Infinity),
}

const maxAnte = computed(() => wallet.maxStake(50, 10))
const bestAnte = () => ANTES.filter((a) => a <= maxAnte.value).pop() ?? ANTES[0]
// 기본금 미리 선택: 처음엔 고를 수 있는 가장 큰 값, 이후 보유가 줄어 못 고르게 되면 다시 맞춤
ante.value = bestAnte()
watch([maxAnte, status], () => { if (status.value !== 'playing' && ante.value > maxAnte.value) ante.value = bestAnte() })
const stats = computed(() => [
  { label: 'Gam', value: fmt(w.bank) },
  { label: '배팅금', value: fmt(ante.value) },
  { label: '판', value: w.rounds },
])

/* ───── 도전 시작 / 판 진행 ───── */
function start() {
  if (status.value === 'over') { status.value = 'idle'; return } // 다시 하기 → 로비에서 기본금 고르기
  const o = wallet.outcome() // 지난번에 결과를 보지 않고 나간 경우 먼저 정산
  if (o) return finishRun(o)
  if (ante.value > maxAnte.value) ante.value = bestAnte()
  status.value = 'playing'
  newRound()
}

function newRound() {
  clearAll()
  toast.value = ''
  wallet.startRound()
  st.value = createRound({ ante: ante.value, dealer: dealer.value, io })
  sfx.tick()
  step()
}

function refresh() { triggerRef(st) }

function step() {
  refresh()
  const s = st.value
  if (s.result) { tStop(); return onResult(s.result) }
  if (s.turn === 0) tStart(turnSec.value, timeUp)
  else tStop()
  if (s.turn > 0) later(() => { act(s, s.turn, aiAction(s, s.turn, io), io); step() }, 650)
}

// 제한 시간 안에 고르지 않으면: 체크할 수 있으면 체크, 아니면 다이
function timeUp() {
  const s = st.value
  if (!s || s.result || s.turn !== 0) return
  const kind = actions(s, 0, io).some((a) => a.kind === 'check') ? 'check' : 'die'
  toast.value = `시간 초과 · ${kind === 'check' ? '체크' : '다이'}`
  later(() => { if (toast.value.startsWith('시간 초과')) toast.value = '' }, 1400)
  choose(kind)
}

function choose(kind) {
  const s = st.value
  if (!s || s.result || s.turn !== 0) return
  tStop()
  act(s, 0, kind, io)
  step()
}

function onResult(r) {
  if (r.type === 'rematch') { toast.value = `재경기 · ${r.reason}`; return }
  wallet.win(r.payouts[0])
  dealer.value = r.winner
  if (r.winner === 0) sfx.correct()
  else sfx.wrong()
}

function goRematch() {
  st.value = rematch(st.value, io)
  toast.value = ''
  step()
}

function next() {
  const o = wallet.outcome()
  if (o) return finishRun(o)
  newRound()
}

function finishRun(kind) {
  clearAll()
  tStop()
  const r = wallet.endRun(kind)
  score.value = r.score
  summary.value = kind === 'clear'
    ? `${r.rounds}판 만에 ${fmt(GOAL_GAM)} Gam 달성!`
    : kind === 'bust' ? `파산 · 최고 ${fmt(r.peak)} Gam · ${r.rounds}판` : `도전 정산 · 최고 ${fmt(r.peak)} Gam · ${r.rounds}판`
  status.value = 'over'
  st.value = null
  sfx.over()
  ctx.quitting = false // 정산은 기록으로 남김
  emit('gameover', { score: r.score, meta: { result: kind, rounds: r.rounds, peak: r.peak } })
}

// 그만하기: 자리에서 일어나기 (지갑은 그대로, 이번 판에 낸 돈은 돌아오지 않음)
function leave() {
  clearAll()
  tStop()
  st.value = null
  showJokbo.value = false
  status.value = 'idle'
}

/* ───── 화면용 값 ───── */
const round = st // computed 로 감싸면 같은 객체라 변경이 전달되지 않음 → ref 그대로 사용
const result = computed(() => round.value?.result ?? null)
const myTurn = computed(() => round.value && !result.value && round.value.turn === 0)
const myActions = computed(() => (myTurn.value ? actions(round.value, 0, io) : []))
const reveal = computed(() => !!result.value?.hands || result.value?.type === 'rematch')

const myHand = computed(() => {
  const c = round.value?.cards[0] ?? []
  if (!round.value?.in[0]) return '다이'
  if (c.length === 2) return handOf(c[0], c[1]).n
  if (c.length === 1) return `${monthOf(c[0])}월${isGwang(c[0]) ? ' 광' : ''}`
  return ''
})
function handName(p) {
  const s = round.value
  const found = result.value?.hands?.find((x) => x.p === p)
  if (found) return found.h.n
  return s.cards[p].length === 2 ? handOf(s.cards[p][0], s.cards[p][1]).n : ''
}
const waitText = computed(() => {
  const s = round.value
  if (!s) return ''
  if (!s.in[0]) return '이번 판은 다이했어요'
  if (s.allin[0]) return '올인했어요. 결과를 기다려요'
  return s.turn > 0 ? `${NAMES[s.turn]} 차례예요` : ''
})
const resultTitle = computed(() => {
  const r = result.value
  if (!r) return ''
  if (r.type === 'rematch') return `재경기 · ${r.reason}`
  return r.payouts[0] > 0 ? (r.winner === 0 ? '이겼어요' : '일부를 땄어요') : `${NAMES[r.winner]} 승리`
})
const myDelta = computed(() => {
  const r = result.value
  if (!r || r.type === 'rematch') return 0
  return r.payouts[0] - round.value.spent[0]
})
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" :summary="summary" :stats="stats" :toast="toast" @start="start" @quit="leave">
    <template #lobby="{ start: go }">
      <section class="hero">
        <div class="ht">
          <span class="k">섯다</span>
          <b class="v">겜돌이 AI와 섯다 한판 고고?!!</b>
        </div>
        <div class="fan" aria-hidden="true">
          <HwatuCard v-for="id in [0, 8, 28]" :key="id" :id="id" />
        </div>
      </section>
      <div class="wallet">
        <div class="row"><span>보유</span><b class="num">{{ fmt(w.bank) }} Gam</b></div>
        <div class="bar" aria-hidden="true"><i :style="{ width: Math.min(100, Math.max(2, (Math.log10(Math.max(w.bank, 1) / 1000) / 2) * 100)) + '%' }" /></div>
        <div class="row sm muted"><span>0 파산</span><span>목표 {{ fmt(GOAL_GAM) }}</span></div>
        <div class="row sm muted"><span>판 {{ w.rounds }} · 최고 {{ fmt(w.peak) }}</span><span>클리어 {{ w.clears }} · 파산 {{ w.busts }}</span></div>
      </div>
      <div class="antes" role="group" aria-label="배팅금">
        <h4>배팅금</h4>
        <div class="chips">
          <button v-for="a in ANTES" :key="a" type="button" class="chip num" :class="{ on: ante === a }" :disabled="a > maxAnte" :aria-pressed="ante === a" @click="ante = a">{{ fmt(a) }}</button>
        </div>
        <p class="sm muted">Gam의 1/50까지 배팅이 가능하고, 모자라면 남은 금액 전체가 올인돼요.</p>
      </div>
      <div class="sec" role="group" aria-label="내 차례 시간">
        <h4>내 차례 시간</h4>
        <div class="chips t2">
          <button v-for="t in TURN_OPTIONS" :key="t" type="button" class="chip num" :class="{ on: turnSec === t }" :aria-pressed="turnSec === t" @click="turnSec = t">{{ t }}초</button>
        </div>
      </div>
      <button type="button" class="btn btn-primary go" @click="go">{{ wallet.outcome() ? '결과 보기' : wallet.inRun ? '이어서 하기' : '게임 시작' }}</button>
      <button v-if="wallet.inRun" type="button" class="btn btn-sm cash" @click="finishRun('cashout')">도전 끝내고 기록 남기기</button>
      <dl class="jokbo">
        <template v-for="[a, b] in JOKBO" :key="a"><dt>{{ a }}</dt><dd>{{ b }}</dd></template>
      </dl>
    </template>

    <div v-if="round" class="table">
      <div class="seats">
        <div v-for="p in [1, 2, 3]" :key="p" class="seat" :class="{ on: round.turn === p, out: !round.in[p] }">
          <span class="nm"><span class="ava" :style="{ background: avatarOf(NAMES[p]).bg }"><PixelIcon :name="avatarOf(NAMES[p]).icon" :size="18" /></span>{{ NAMES[p] }}</span>
          <div class="cards">
            <HwatuCard v-for="(id, i) in round.cards[p]" :key="i" :id="id" :back="!(reveal && round.in[p])" />
          </div>
          <span class="log">{{ round.in[p] ? (reveal ? handName(p) : round.log[p]) : '다이' }}</span>
          <span class="spent num">{{ fmt(round.spent[p]) }}</span>
        </div>
      </div>

      <div class="felt">
        <span class="lb">판돈</span>
        <b class="pot num">{{ fmt(round.pot) }}</b>
        <span class="lb">{{ round.street === 1 ? '첫 장 베팅' : '두 번째 장 베팅' }}<template v-if="round.rematches"> · 재경기 {{ round.rematches }}</template></span>
      </div>

      <div class="mine" :class="{ on: myTurn }">
        <div class="mycards">
          <HwatuCard v-for="(id, i) in round.cards[0]" :key="i" :id="id" />
        </div>
        <div class="info">
          <span class="lb">내 패</span>
          <b>{{ myHand }}</b>
          <span class="lb num">낸 돈 {{ fmt(round.spent[0]) }}</span>
        </div>
      </div>
    </div>

    <template #controls>
      <TimerBar v-if="round && !result" :pct="myTurn ? tPct : 0" :text="myTurn ? tText : '-'" label="내 차례" />
      <div v-if="result" class="res" role="status">
        <h3>{{ resultTitle }}</h3>
        <p v-if="result.type !== 'rematch'" class="delta num" :class="myDelta >= 0 ? 'up' : 'down'">{{ myDelta >= 0 ? '+' : '-' }}{{ fmt(Math.abs(myDelta)) }} Gam</p>
        <p v-if="result.type === 'fold'" class="muted">나머지가 모두 다이했어요.</p>
        <ul v-if="result.hands" class="hands">
          <li v-for="x in result.hands" :key="x.p" :class="{ win: result.type === 'win' && result.payouts[x.p] > 0 }">
            <span>{{ NAMES[x.p] }}</span><b>{{ x.h.n }}</b>
          </li>
        </ul>
        <p v-if="result.type === 'rematch'" class="muted">판돈 {{ fmt(round.pot) }} Gam은 그대로 두고 남은 사람끼리 다시 쳐요.</p>
        <button v-if="result.type === 'rematch'" type="button" class="btn btn-primary go" @click="goRematch">다시 치기</button>
        <button v-else type="button" class="btn btn-primary go" @click="next">{{ wallet.outcome() ? '결과 보기' : '다음 판' }}</button>
      </div>
      <div v-else-if="myTurn" class="acts">
        <button v-for="a in myActions" :key="a.kind" type="button" class="act" :class="a.kind" @click="choose(a.kind)">{{ a.label }}</button>
      </div>
      <p v-else-if="round" class="wait muted">{{ waitText }}</p>
      <button v-if="round" type="button" class="btn btn-sm jb" @click="showJokbo = true">족보 보기</button>
    </template>
  </GameScreen>

  <Teleport to="body">
    <div v-if="showJokbo" class="scrim" @click.self="showJokbo = false">
      <div class="sheet" role="dialog" aria-modal="true" aria-label="섯다 족보">
        <h3>섯다 족보</h3>
        <dl class="jokbo">
          <template v-for="[a, b] in JOKBO" :key="a"><dt>{{ a }}</dt><dd>{{ b }}</dd></template>
        </dl>
        <button type="button" class="btn btn-primary go" @click="showJokbo = false">닫기</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.table { --felt: #3F7A4E; container-type: inline-size; display: flex; flex-direction: column; gap: 10px; }
.seats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.seat {
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 4px 6px; min-width: 0;
  border-radius: var(--r-md); background: var(--surface); border: var(--bw) solid var(--bc); box-shadow: var(--sh-sm);
}
.seat.on { background: var(--hero-bg); color: var(--hero-ink); }
.seat.out { opacity: 0.5; }
.nm { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; min-width: 0; }
.ava { width: 24px; height: 24px; flex: none; display: grid; place-items: center; border-radius: 8px; border: 2px solid var(--bc); }
.cards { --cw: clamp(24px, 10cqi, 44px); display: flex; gap: 3px; min-height: calc(var(--cw) * 1.5); }
.log { font-size: 12px; font-weight: 700; color: var(--accent); min-height: 17px; text-align: center; overflow-wrap: anywhere; }
.seat.on .log { color: inherit; }
.spent { font-size: 11px; color: var(--muted); }
.seat.on .spent { color: inherit; }
.felt {
  display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 14px 10px;
  border-radius: var(--r-md); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
  background: radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.07) 1px, transparent 1.5px) 0 0 / 6px 6px, var(--felt);
  color: #F4F7EE;
}
.felt .lb { font-size: 12px; opacity: 0.85; }
.pot { font-size: 32px; line-height: 1.1; color: #FFD54A; }
.mine {
  display: flex; align-items: center; gap: 14px; padding: 10px 12px; min-width: 0;
  border-radius: var(--r-md); background: var(--surface); border: var(--bw) solid var(--bc); box-shadow: var(--sh-sm);
}
.mine.on { outline: 3px solid var(--accent); outline-offset: 2px; }
.mycards { --cw: clamp(52px, 19cqi, 84px); display: flex; gap: 6px; flex: none; }
.info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.info b { font-size: 22px; font-family: var(--font-display); font-weight: var(--display-weight); overflow-wrap: anywhere; }
.info .lb { font-size: 12px; color: var(--muted); }

.acts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.act {
  height: 50px; border-radius: var(--r-btn2); border: var(--bw) solid var(--bc); box-shadow: var(--sh-sm);
  background: var(--surface); color: var(--text); font-weight: 700; font-size: 14px; padding: 0 4px;
}
.act.call, .act.check { background: var(--primary); color: var(--primary-ink, var(--text)); }
.act.ddadang, .act.half { background: var(--accent); color: var(--text); }
.act.bbing { background: var(--hero-bg); color: var(--hero-ink); }
.wait { margin: 0; text-align: center; font-size: 14px; min-height: 50px; display: grid; place-items: center; }
.res { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: var(--r-md); background: var(--surface); border: var(--bw) solid var(--bc); }
.res h3 { margin: 0; text-align: center; font-size: 18px; }
.delta { margin: 0; text-align: center; font-size: 26px; font-weight: 800; }
.delta.up { color: var(--primary); }
.delta.down { color: var(--danger); }
.res .muted { margin: 0; text-align: center; font-size: 13px; }
.hands { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.hands li { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; padding: 4px 8px; border-radius: 10px; }
.hands li.win { background: var(--hero-bg); color: var(--hero-ink); }
.go { height: 50px; font-size: 16px; }

.wallet { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: var(--r-md); background: var(--surface-2); border: var(--bw) solid var(--bc); text-align: left; }
.row { display: flex; justify-content: space-between; gap: 8px; }
.row b { font-size: 16px; }
.sm { font-size: 11px; }
.bar { height: 10px; border-radius: 999px; border: 2px solid var(--bc); overflow: hidden; background: var(--bg); }
.bar i { display: block; height: 100%; background: var(--accent); }
.antes { display: flex; flex-direction: column; gap: 6px; text-align: left; }
.chips { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.chip { height: 36px; border-radius: 12px; border: 2px solid var(--bc); background: var(--surface); color: var(--text); font-weight: 700; font-size: 13px; }
.chip.on { background: var(--text); color: var(--bg); }
.chip:disabled { opacity: 0.35; }
.cash, .jb { align-self: center; }
.hero { container-type: inline-size; display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: var(--r-lg); background: var(--hero-bg); color: var(--hero-ink); border: var(--bw) solid var(--bc); box-shadow: var(--sh); }
.ht { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.fan { --cw: clamp(30px, 13cqi, 52px); display: flex; flex: none; padding-right: 6px; }
.fan > :deep(*) { margin-right: calc(var(--cw) * -0.35); box-shadow: var(--sh-sm); }
.fan > :deep(*:nth-child(1)) { transform: rotate(-10deg) translateY(4px); }
.fan > :deep(*:nth-child(3)) { transform: rotate(10deg) translateY(4px); }
.hero .k { font-size: 13px; font-weight: 800; letter-spacing: 0.08em; }
.hero .v { font-family: var(--font-display); font-weight: var(--display-weight); font-size: clamp(20px, 7.5cqi, 30px); line-height: 1.25; word-break: keep-all; }
.antes h4, .sec h4 { margin: 0; font-size: 14px; }
.sec { display: flex; flex-direction: column; gap: 6px; }
.chips.t2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.antes p { margin: 0; }
.jokbo { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 12px; margin: 0; padding: 12px 14px; border-radius: var(--r-md); background: var(--surface); border: var(--bw) solid var(--bc); font-size: 13px; }
.jokbo dt { font-weight: 800; }
.jokbo dd { margin: 0; text-align: right; color: var(--muted); }
.scrim { position: fixed; inset: 0; z-index: 50; display: grid; place-items: end center; padding: 16px; background: var(--scrim); }
.sheet { width: min(420px, 100%); display: flex; flex-direction: column; gap: 12px; padding: 18px 16px; border-radius: var(--r-lg); background: var(--bg); color: var(--text); border: var(--bw) solid var(--bc); box-shadow: var(--sh); }
.sheet h3 { margin: 0; text-align: center; font-size: 18px; }
</style>
