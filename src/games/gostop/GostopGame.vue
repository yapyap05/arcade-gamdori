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
import { CARDS } from '../hwatu/cards'
import { createGame, play, resolve, aiChoose, playInfo, scoreOf, isToken, rankOf } from './engine'

const props = defineProps({ mode: { type: String, default: 'casual' } })
const emit = defineEmits(['gameover'])
const ctx = useGameCtx()
const { later, clearAll } = useLater()
const { pct: tPct, text: tText, start: tStart, stop: tStop } = useTimer()

const STAKES = [10, 20, 50, 100, 200, 500, 1000, 2000]
const SCORE_TABLE = [
  ['오광', '15점'], ['사광', '4점'], ['삼광 / 비삼광', '3점 / 2점'], ['고도리', '2·4·8월 새 · 5점'],
  ['홍단 · 청단 · 초단', '각 3점'], ['열끗 · 띠 5장', '1점, 1장마다 +1'], ['피 10장', '1점, 1장마다 +1'],
  ['고', '1·2고 +1점, 3고부터 x2'], ['흔들기 · 폭탄 · 멍따', '각 x2'], ['광박 · 피박 · 고박', '각 x2 (3인은 고박 대신 독박)'],
  ['3뻑 · 총통', '바로 10점 승'], ['나가리 다음 판', 'x2 (최대 x4)'],
]
const fmt = (n) => Math.max(0, Math.floor(n)).toLocaleString()

const wallet = useWallet('gostop', props.mode)
const w = wallet.state
const status = ref('idle')
const players = ref(2)
const stake = ref(10)
const st = shallowRef(null) // 엔진 상태 (엔진이 직접 고치므로 고친 뒤 triggerRef)
const dealer = ref(0)
const nagariMul = ref(1)
const deposit = ref(0) // 판 시작 때 미리 건 금액
const delta = ref(0)
const sel = ref(null)
const sheet = ref(null) // 'score' | { kind: 'shake', id }
const score = ref(0)
const summary = ref('')
const toast = ref('')

const NAMES = computed(() => (players.value === 2 ? ['나', '겜돌이'] : ['나', '얍얍돌이', '펭귄돌이']))
const th = computed(() => (players.value === 2 ? 7 : 3))
const maxStake = computed(() => wallet.maxStake(100, 10))
const bestStake = () => STAKES.filter((a) => a <= maxStake.value).pop() ?? STAKES[0]
stake.value = bestStake()
watch([maxStake, status], () => { if (status.value !== 'playing' && stake.value > maxStake.value) stake.value = bestStake() })

const stats = computed(() => [
  { label: 'Gam', value: fmt(w.bank) },
  { label: '점당', value: fmt(stake.value) },
  { label: '판', value: w.rounds },
])

/* ───── 도전 시작 / 판 진행 ───── */
function start() {
  if (status.value === 'over') { status.value = 'idle'; return } // 다시 하기 → 로비
  const o = wallet.outcome() // 지난번에 결과를 보지 않고 나간 경우 먼저 정산
  if (o) return finishRun(o)
  if (stake.value > maxStake.value) stake.value = bestStake()
  status.value = 'playing'
  newGame()
}

function newGame() {
  clearAll()
  toast.value = ''
  sel.value = null
  sheet.value = null
  delta.value = 0
  wallet.startRound()
  // 판 시작 때 기본 점수만큼 미리 걸어 둠 → 판 도중에 나가도 그만큼은 잃음
  deposit.value = wallet.spend(stake.value * th.value)
  st.value = createGame({ players: players.value, dealer: dealer.value, nagariMul: nagariMul.value })
  sfx.tick()
  step()
}

function refresh() { triggerRef(st) }

function flash(name, msg) {
  if (!msg) return
  toast.value = `${name} · ${msg}`
  later(() => { toast.value = '' }, 1400)
}

function step() {
  refresh()
  const s = st.value
  if (s.result) { tStop(); return onResult(s.result) }
  if (s.need || s.turn === 0) tStart(turnSec.value, timeUp)
  else tStop()
  if (s.need) return
  if (s.turn > 0) later(aiMove, 750)
}

function aiMove() {
  const s = st.value
  if (!s || s.result || s.need || s.turn <= 0) return
  const p = s.turn
  const c = aiChoose(s, p)
  play(s, p, c.id, { shake: c.shake })
  flash(NAMES.value[p], s.msg)
  step()
}

// 제한 시간 안에 고르지 않으면 자동: 패는 AI 처럼 골라서 냄(흔들기 안 함), 고르기는 좋은 패, 고/스톱은 스톱
function timeUp() {
  const s = st.value
  if (!s || s.result) return
  toast.value = '시간 초과 · 자동으로 진행해요'
  later(() => { if (toast.value.startsWith('시간 초과')) toast.value = '' }, 1400)
  const nd = s.need
  if (nd?.kind === 'pick') return answer(nd.options.slice().sort((a, b) => rankOf(b) - rankOf(a))[0])
  if (nd?.kind === 'gostop') return answer(false)
  if (s.turn !== 0) return
  if (sheet.value?.kind === 'shake') return doPlay(sheet.value.id, false)
  sheet.value = null
  doPlay(sel.value ?? aiChoose(s, 0).id, false)
}

function tapCard(id) {
  const s = st.value
  if (!myTurn.value) return
  if (sel.value !== id) { sel.value = id; sfx.tick(); return }
  if (playInfo(s, 0, id).shake) { sheet.value = { kind: 'shake', id }; return }
  doPlay(id, false)
}

function doPlay(id, shake) {
  const s = st.value
  tStop()
  sel.value = null
  sheet.value = null
  play(s, 0, id, { shake })
  flash('나', s.msg)
  step()
}

function answer(v) {
  const s = st.value
  tStop()
  resolve(s, v)
  if (s.msg) flash('나', s.msg)
  step()
}

function onResult(r) {
  const dep = deposit.value
  deposit.value = 0
  if (r.type === 'nagari') {
    wallet.win(dep)
    nagariMul.value = r.nextMul
    delta.value = 0
    sfx.wrong()
    return
  }
  nagariMul.value = 1
  dealer.value = r.winner
  if (r.winner === 0) {
    const gain = r.losers.reduce((sum, l) => sum + l.pay, 0) * stake.value
    wallet.win(dep + gain)
    delta.value = gain
    sfx.correct()
  } else {
    const owe = (r.losers.find((l) => l.p === 0)?.pay ?? 0) * stake.value
    if (owe >= dep) delta.value = -(dep + wallet.spend(owe - dep))
    else { wallet.win(dep - owe); delta.value = -owe }
    sfx.wrong()
  }
}

function next() {
  const o = wallet.outcome()
  if (o) return finishRun(o)
  newGame()
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
  sheet.value = null
  sfx.over()
  ctx.quitting = false // 정산은 기록으로 남김
  emit('gameover', { score: r.score, meta: { result: kind, rounds: r.rounds, peak: r.peak } })
}

// 그만하기: 지갑은 그대로, 이번 판에 미리 건 돈은 돌아오지 않음
function leave() {
  clearAll()
  tStop()
  st.value = null
  sheet.value = null
  deposit.value = 0
  status.value = 'idle'
}

/* ───── 화면용 값 ───── */
const round = st // computed 로 감싸면 같은 객체라 변경이 전달되지 않음 → ref 그대로 사용
const result = computed(() => round.value?.result ?? null)
const need = computed(() => round.value?.need ?? null)
const myTurn = computed(() => !!round.value && !result.value && !need.value && round.value.turn === 0)
const myTimer = computed(() => !!round.value && !result.value && (!!need.value || round.value.turn === 0))
const scores = computed(() => round.value?.cap.map((c) => scoreOf(c)) ?? [])
const floorMonths = computed(() => new Set(round.value?.floor.map((id) => CARDS[id].m) ?? []))
const selMonth = computed(() => (sel.value != null && !isToken(sel.value) ? CARDS[sel.value].m : null))
const hasMatch = (id) => !isToken(id) && (CARDS[id].k === 'B' || floorMonths.value.has(CARDS[id].m))

/** 바닥: 월별로 묶어 양쪽에 나눠 놓기 */
const floorSides = computed(() => {
  const groups = {}
  round.value?.floor.forEach((id) => { (groups[CARDS[id].m] ??= []).push(id) })
  const list = Object.keys(groups).map(Number).sort((a, b) => a - b).map((m) => ({ m, ids: groups[m] }))
  return [list.filter((_, i) => i % 2 === 0), list.filter((_, i) => i % 2 === 1)]
})

/** 먹은 패: 광 / 열끗 / 띠 / 피 */
function capGroups(p) {
  const ids = round.value?.cap[p] ?? []
  const s = scores.value[p]
  const gukPi = s?.gukjinPi
  const kindOf = (id) => {
    const c = CARDS[id]
    if (c.id === 32 && gukPi) return 'P'
    return c.k === 'S' || c.k === 'B' ? 'P' : c.k
  }
  return [['G', '광', s?.g], ['Y', '열끗', s?.y], ['D', '띠', s?.d], ['P', '피', s?.pi]].map(([k, lb, n]) => ({ k, lb, n: n ?? 0, ids: ids.filter((id) => kindOf(id) === k) }))
}

const waitText = computed(() => {
  const s = round.value
  if (!s || result.value) return ''
  if (need.value) return '고를 패를 정해 주세요'
  if (s.turn === 0) return sel.value == null ? '낼 패를 눌러 고르세요. 노란 점은 바닥에 짝이 있는 패예요.' : '한 번 더 누르면 내요'
  return `${NAMES.value[s.turn]} 차례예요`
})

const resultTitle = computed(() => {
  const r = result.value
  if (!r) return ''
  if (r.type === 'nagari') return '나가리'
  const why = r.reason === 'chongtong' ? ' · 총통' : r.reason === 'samppuk' ? ' · 3뻑' : ''
  return (r.winner === 0 ? '이겼어요' : `${NAMES.value[r.winner]} 승리`) + why
})
/** 결과 표: 승자 점수 줄 + (내가 지면) 내 박 줄 / (내가 이기면) 상대별 금액 */
const resultRows = computed(() => {
  const r = result.value
  if (!r || r.type !== 'win') return []
  const rows = r.rows.map(([a, b]) => ({ a, b }))
  if (r.winner === 0) {
    r.losers.forEach((l) => rows.push({ a: `${NAMES.value[l.p]}${l.rows.length ? ` (${l.rows.map((x) => x[0]).join('·')})` : ''}`, b: `${fmt(l.pay)}점`, sum: true }))
  } else {
    const me = r.losers.find((l) => l.p === 0)
    me?.rows.forEach(([a, b]) => rows.push({ a, b }))
    if (me && r.doak != null && r.doak !== 0) rows.push({ a: `${NAMES.value[r.doak]} 독박`, b: '대신 냄' })
    if (me) rows.push({ a: `${fmt(me.pay)}점 x 점당 ${fmt(stake.value)}`, b: `${fmt(me.pay * stake.value)}`, sum: true })
  }
  return rows
})
</script>

<template>
  <GameScreen :status="status" :mode="mode" :score="score" :summary="summary" :stats="stats" :toast="toast" @start="start" @quit="leave">
    <template #lobby="{ start: go }">
      <section class="hero">
        <div class="ht">
          <span class="k">고스톱</span>
          <b class="v">겜돌이 AI와 고스톱 한판 고고?!!</b>
        </div>
        <div class="fan" aria-hidden="true">
          <HwatuCard v-for="id in [0, 40, 44]" :key="id" :id="id" />
        </div>
      </section>
      <div class="wallet">
        <div class="row"><span>보유</span><b class="num">{{ fmt(w.bank) }} Gam</b></div>
        <div class="bar" aria-hidden="true"><i :style="{ width: Math.min(100, Math.max(2, (Math.log10(Math.max(w.bank, 1) / 1000) / 2) * 100)) + '%' }" /></div>
        <div class="row sm muted"><span>0 파산</span><span>목표 {{ fmt(GOAL_GAM) }}</span></div>
        <div class="row sm muted"><span>판 {{ w.rounds }} · 최고 {{ fmt(w.peak) }}</span><span>클리어 {{ w.clears }} · 파산 {{ w.busts }}</span></div>
      </div>
      <div class="sec" role="group" aria-label="방식">
        <h4>방식</h4>
        <div class="opts">
          <button type="button" class="opt" :aria-pressed="players === 2" @click="players = 2"><b>맞고</b><span>겜돌이와 1:1 · 손패 10장 · 7점부터 고/스톱</span></button>
          <button type="button" class="opt" :aria-pressed="players === 3" @click="players = 3"><b>고스톱 3인</b><span>얍얍돌이·펭귄돌이 · 손패 7장 · 3점부터 고/스톱</span></button>
        </div>
      </div>
      <div class="sec" role="group" aria-label="점당 배팅금">
        <h4>점당 배팅금</h4>
        <div class="chips">
          <button v-for="a in STAKES" :key="a" type="button" class="chip num" :class="{ on: stake === a }" :disabled="a > maxStake" :aria-pressed="stake === a" @click="stake = a">{{ fmt(a) }}</button>
        </div>
        <p class="sm muted">Gam의 1/100까지 배팅이 가능해요. 판을 시작할 때 기본 점수({{ th }}점)만큼 미리 걸고, 끝나면 정산해요. 지면 보유한 만큼만 잃어요.</p>
      </div>
      <div class="sec" role="group" aria-label="내 차례 시간">
        <h4>내 차례 시간</h4>
        <div class="chips t2">
          <button v-for="t in TURN_OPTIONS" :key="t" type="button" class="chip num" :class="{ on: turnSec === t }" :aria-pressed="turnSec === t" @click="turnSec = t">{{ t }}초</button>
        </div>
      </div>
      <button type="button" class="btn btn-primary go" @click="go">{{ wallet.outcome() ? '결과 보기' : wallet.inRun ? '이어서 하기' : '게임 시작' }}</button>
      <button v-if="wallet.inRun" type="button" class="btn btn-sm cash" @click="finishRun('cashout')">도전 끝내고 기록 남기기</button>
      <dl class="calc">
        <template v-for="[a, b] in SCORE_TABLE" :key="a"><dt>{{ a }}</dt><dd>{{ b }}</dd></template>
      </dl>
    </template>

    <div v-if="round" class="board">
      <!-- 상대 -->
      <div class="opps" :class="{ three: round.n === 3 }">
        <div v-for="p in round.n - 1" :key="p" class="opp" :class="{ on: round.turn === p }">
          <div class="who">
            <span class="ava" :style="{ background: avatarOf(NAMES[p]).bg }"><PixelIcon :name="avatarOf(NAMES[p]).icon" :size="18" /></span>
            <b>{{ NAMES[p] }}<template v-if="round.go[p]"> · {{ round.go[p] }}고</template></b>
            <span class="pts num">{{ scores[p].total }}<small>점</small></span>
          </div>
          <div class="backs" :aria-label="`손패 ${round.hands[p].length}장`">
            <HwatuCard v-for="(_, i) in round.hands[p]" :key="i" back />
          </div>
          <div class="caps sm-caps">
            <div v-for="g in capGroups(p)" :key="g.k" class="cap">
              <div class="lb"><span>{{ g.lb }}</span><span class="num">{{ g.n }}</span></div>
              <div class="crow"><HwatuCard v-for="id in g.ids" :key="id" :id="id" /></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 바닥 -->
      <div class="felt">
        <div v-for="(side, si) in floorSides" :key="si" class="side" :style="{ order: si * 2 }">
          <div v-for="g in side" :key="g.m" class="stack" :class="{ hot: selMonth === g.m }">
            <HwatuCard v-for="id in g.ids" :key="id" :id="id" />
          </div>
        </div>
        <div class="deck" style="order: 1">
          <div class="pile"><HwatuCard v-for="i in Math.min(3, round.deck.length)" :key="i" back /></div>
          <span class="num">더미 {{ round.deck.length }}</span>
        </div>
        <span v-if="round.nagariMul > 1" class="mul">나가리 x{{ round.nagariMul }}</span>
      </div>

      <!-- 내 먹은 패 -->
      <div class="caps">
        <div v-for="g in capGroups(0)" :key="g.k" class="cap">
          <div class="lb"><span>{{ g.lb }}</span><span class="num">{{ g.n }}</span></div>
          <div class="crow"><HwatuCard v-for="id in g.ids" :key="id" :id="id" /></div>
        </div>
      </div>
      <div class="me">
        <span class="lb">점당 <b class="num">{{ fmt(stake) }}</b> Gam · {{ round.th }}점부터 고/스톱</span>
        <span class="lb">내 점수 <b class="num big">{{ scores[0].total }}</b><template v-if="round.go[0]"> · {{ round.go[0] }}고</template></span>
      </div>

      <!-- 내 손패 -->
      <div class="hand" :class="{ seven: round.n === 3 }">
        <button
          v-for="id in round.hands[0]" :key="id" type="button" class="hc" :class="{ sel: sel === id }"
          :disabled="!myTurn" :aria-pressed="sel === id" @click="tapCard(id)"
        >
          <HwatuCard :id="isToken(id) ? null : id" :back="isToken(id)" />
          <span v-if="isToken(id)" class="tk">뒤집기</span>
          <span v-else-if="hasMatch(id)" class="dot" aria-hidden="true" />
        </button>
      </div>
    </div>

    <template #controls>
      <TimerBar v-if="round && !result" :pct="myTimer ? tPct : 0" :text="myTimer ? tText : '-'" label="내 차례" />
      <div v-if="result" class="res" role="status">
        <h3>{{ resultTitle }}</h3>
        <template v-if="result.type === 'nagari'">
          <p class="muted">아무도 점수를 내지 못했어요. 미리 건 돈은 돌려받고, 다음 판은 x{{ result.nextMul }}예요.</p>
        </template>
        <template v-else>
          <p class="delta num" :class="delta >= 0 ? 'up' : 'down'">{{ delta >= 0 ? '+' : '-' }}{{ fmt(Math.abs(delta)) }} Gam</p>
          <dl class="calc">
            <template v-for="(x, i) in resultRows" :key="i"><dt :class="{ sum: x.sum }">{{ x.a }}</dt><dd :class="{ sum: x.sum }">{{ x.b }}</dd></template>
          </dl>
        </template>
        <button type="button" class="btn btn-primary go" @click="next">{{ wallet.outcome() ? '결과 보기' : '다음 판' }}</button>
      </div>
      <p v-else-if="round" class="wait muted">{{ waitText }}</p>
      <button v-if="round" type="button" class="btn btn-sm jb" @click="sheet = 'score'">점수표 보기</button>
    </template>
  </GameScreen>

  <Teleport to="body">
    <div v-if="need || sheet" class="scrim" @click.self="sheet === 'score' && (sheet = null)">
      <div class="sheet" role="dialog" aria-modal="true">
        <template v-if="need && need.kind === 'pick'">
          <h3>어느 패를 먹을까요?</h3>
          <div class="picks">
            <button v-for="id in need.options" :key="id" type="button" class="pick" @click="answer(id)"><HwatuCard :id="id" /></button>
          </div>
        </template>
        <template v-else-if="need && need.kind === 'gostop'">
          <h3>{{ need.score }}점 났어요</h3>
          <div class="bigq num">{{ round.go[0] + 1 }}고?</div>
          <dl class="calc">
            <template v-for="[a, b] in scores[0].lines" :key="a"><dt>{{ a }}</dt><dd>{{ b }}점</dd></template>
          </dl>
          <p class="muted">고를 하면 점수가 더 붙지만, 상대가 먼저 나면 {{ round.n === 2 ? '고박으로 2배를 물어요' : '독박으로 혼자 다 물어요' }}.</p>
          <div class="two">
            <button type="button" class="btn btn-primary" @click="answer(true)">고</button>
            <button type="button" class="btn" @click="answer(false)">스톱</button>
          </div>
        </template>
        <template v-else-if="sheet && sheet.kind === 'shake'">
          <h3>흔들까요?</h3>
          <p class="muted">같은 월 3장을 보여 주고 내요. 이기면 점수가 2배예요.</p>
          <div class="two">
            <button type="button" class="btn btn-primary" @click="doPlay(sheet.id, true)">흔들기</button>
            <button type="button" class="btn" @click="doPlay(sheet.id, false)">그냥 내기</button>
          </div>
        </template>
        <template v-else-if="sheet === 'score'">
          <h3>고스톱 점수표</h3>
          <dl class="calc">
            <template v-for="[a, b] in SCORE_TABLE" :key="a"><dt>{{ a }}</dt><dd>{{ b }}</dd></template>
          </dl>
          <button type="button" class="btn btn-primary go" @click="sheet = null">닫기</button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.board { --felt: #3F7A4E; container-type: inline-size; display: flex; flex-direction: column; gap: 8px; min-width: 0; }

/* 상대 */
.opps { display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; }
.opps.three { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.opp { display: flex; flex-direction: column; gap: 6px; padding: 8px; min-width: 0; border-radius: var(--r-md); background: var(--surface); border: var(--bw) solid var(--bc); box-shadow: var(--sh-sm); }
.opp.on { outline: 3px solid var(--accent); outline-offset: 1px; }
.who { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 13px; }
.who b { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pts { font-size: 18px; font-weight: 800; }
.pts small { font-size: 11px; margin-left: 1px; color: var(--muted); }
.ava { width: 26px; height: 26px; flex: none; display: grid; place-items: center; border-radius: 8px; border: 2px solid var(--bc); }
.backs { --cw: clamp(10px, 3.6cqi, 18px); display: flex; min-height: calc(var(--cw) * 1.5); }
.backs > :deep(*) { margin-right: calc(var(--cw) * -0.45); }

/* 먹은 패 */
.caps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
.cap { display: flex; flex-direction: column; gap: 3px; padding: 4px 5px; min-width: 0; border-radius: 10px; background: var(--surface); border: 1.5px solid var(--bc); }
.cap .lb { display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; }
.crow { --cw: clamp(12px, 4.4cqi, 20px); display: flex; flex-wrap: wrap; row-gap: 2px; min-height: calc(var(--cw) * 1.5); padding-left: calc(var(--cw) * 0.55); }
.crow > :deep(*) { margin-left: calc(var(--cw) * -0.55); }
.sm-caps { gap: 3px; }
.sm-caps .cap { padding: 3px 4px; }
.sm-caps .crow { --cw: clamp(9px, 2.6cqi, 14px); }
.three .sm-caps { grid-template-columns: repeat(2, minmax(0, 1fr)); }

/* 바닥: 카드 크기를 바닥 폭(cqi)에 맞춰 줄고 늘어남 → 좁아도 넘치지 않음 */
.felt {
  position: relative; container-type: inline-size; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center; gap: 6px; min-height: 150px; padding: 12px 8px;
  border-radius: var(--r-md); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
  background: radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.07) 1px, transparent 1.5px) 0 0 / 6px 6px, var(--felt);
  --fw: clamp(22px, 9cqi, 46px); --off: calc(var(--fw) * 0.13);
}
.side { display: grid; grid-template-columns: repeat(3, minmax(0, max-content)); gap: 8px 4px; justify-content: center; min-width: 0; }
.stack { position: relative; width: calc(var(--fw) + var(--off) * 2); height: calc(var(--fw) * 1.5 + var(--off) * 3); }
.stack > :deep(*) { --cw: var(--fw); position: absolute; left: 0; top: 0; }
.stack > :deep(*:nth-child(2)) { left: var(--off); top: var(--off); }
.stack > :deep(*:nth-child(3)) { left: calc(var(--off) * 2); top: calc(var(--off) * 2); }
.stack > :deep(*:nth-child(4)) { left: calc(var(--off) * 2); top: calc(var(--off) * 3); }
.stack.hot > :deep(*) { outline: 3px solid #FFD54A; outline-offset: 1px; }
.deck { display: flex; flex-direction: column; align-items: center; gap: 4px; color: #F4F7EE; font-size: 11px; font-weight: 700; }
.pile { position: relative; width: calc(var(--fw) * 1.1); height: calc(var(--fw) * 1.65); }
.pile > :deep(*) { --cw: calc(var(--fw) * 1.1); position: absolute; box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.35); }
.pile > :deep(*:nth-child(2)) { left: -2px; top: -2px; }
.pile > :deep(*:nth-child(3)) { left: -4px; top: -4px; }
.mul { position: absolute; left: 50%; top: 6px; transform: translateX(-50%); padding: 2px 8px; border-radius: 999px; background: #FFD54A; color: #2B1B12; font-size: 11px; font-weight: 800; }

/* 나 */
.me { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.me .lb { font-size: 12px; color: var(--muted); }
.me .big { font-size: 18px; color: var(--text); }
.hand { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px 6px; justify-items: center; }
.hand.seven { grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px 4px; }
.hc { position: relative; width: 100%; max-width: 66px; padding: 0; border: 0; background: none; border-radius: 6px; transition: transform 0.12s; }
.hc > :deep(.hwatu) { --cw: 100%; width: 100%; }
.hc.sel { transform: translateY(-8px); }
.hc.sel > :deep(.hwatu) { outline: 3px solid var(--accent); outline-offset: 1px; }
.hc:disabled { filter: saturate(0.6) brightness(0.94); }
.dot { position: absolute; top: -3px; right: -3px; width: 12px; height: 12px; border-radius: 50%; background: #FFD54A; border: 2px solid var(--bc); }
.tk { position: absolute; left: 50%; bottom: 6px; transform: translateX(-50%); padding: 1px 5px; border-radius: 6px; background: var(--text); color: var(--bg); font-size: 10px; font-weight: 700; white-space: nowrap; }

/* 조작 */
.wait { margin: 0; text-align: center; font-size: 13px; min-height: 44px; display: grid; place-items: center; }
.jb, .cash { align-self: center; }
.res { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: var(--r-md); background: var(--surface); border: var(--bw) solid var(--bc); }
.res h3 { margin: 0; text-align: center; font-size: 18px; }
.res .muted { margin: 0; text-align: center; font-size: 13px; }
.delta { margin: 0; text-align: center; font-size: 26px; font-weight: 800; }
.delta.up { color: var(--primary); }
.delta.down { color: var(--danger); }
.go { height: 50px; font-size: 16px; }
.calc { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 12px; margin: 0; padding: 10px 12px; border-radius: var(--r-md); background: var(--surface); border: var(--bw) solid var(--bc); font-size: 13px; }
.calc dt { font-weight: 800; }
.calc dd { margin: 0; text-align: right; color: var(--muted); }
.calc .sum { border-top: 2px dashed var(--bc); padding-top: 6px; color: var(--text); font-weight: 800; }

/* 로비 */
.hero { container-type: inline-size; display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: var(--r-lg); background: var(--hero-bg); color: var(--hero-ink); border: var(--bw) solid var(--bc); box-shadow: var(--sh); }
.ht { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.fan { --cw: clamp(30px, 13cqi, 52px); display: flex; flex: none; padding-right: 6px; }
.fan > :deep(*) { margin-right: calc(var(--cw) * -0.35); box-shadow: var(--sh-sm); }
.fan > :deep(*:nth-child(1)) { transform: rotate(-10deg) translateY(4px); }
.fan > :deep(*:nth-child(3)) { transform: rotate(10deg) translateY(4px); }
.hero .k { font-size: 13px; font-weight: 800; letter-spacing: 0.08em; }
.hero .v { font-family: var(--font-display); font-weight: var(--display-weight); font-size: clamp(20px, 7.5cqi, 30px); line-height: 1.25; word-break: keep-all; }
.wallet { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: var(--r-md); background: var(--surface-2); border: var(--bw) solid var(--bc); text-align: left; }
.row { display: flex; justify-content: space-between; gap: 8px; }
.row b { font-size: 16px; }
.sm { font-size: 11px; }
.bar { height: 10px; border-radius: 999px; border: 2px solid var(--bc); overflow: hidden; background: var(--bg); }
.bar i { display: block; height: 100%; background: var(--accent); }
.sec { display: flex; flex-direction: column; gap: 6px; }
.sec h4 { margin: 0; font-size: 14px; }
.sec p { margin: 0; }
.opts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.opt { display: flex; flex-direction: column; gap: 3px; padding: 12px; text-align: left; border-radius: var(--r-md); border: var(--bw) solid var(--bc); background: var(--surface); color: var(--text); }
.opt b { font-size: 15px; }
.opt span { font-size: 11px; line-height: 1.4; color: var(--muted); }
.opt[aria-pressed='true'] { background: var(--text); color: var(--bg); }
.opt[aria-pressed='true'] span { color: inherit; opacity: 0.8; }
.chips { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.chip { height: 36px; border-radius: 12px; border: 2px solid var(--bc); background: var(--surface); color: var(--text); font-weight: 700; font-size: 13px; }
.chip.on { background: var(--text); color: var(--bg); }
.chip:disabled { opacity: 0.35; }
.chips.t2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

/* 시트 */
.scrim { position: fixed; inset: 0; z-index: 50; display: grid; place-items: end center; padding: 16px; background: var(--scrim); }
.sheet { width: min(420px, 100%); display: flex; flex-direction: column; gap: 12px; padding: 18px 16px; border-radius: var(--r-lg); background: var(--bg); color: var(--text); border: var(--bw) solid var(--bc); box-shadow: var(--sh); }
.sheet h3 { margin: 0; text-align: center; font-size: 18px; }
.sheet .muted { margin: 0; text-align: center; font-size: 13px; }
.bigq { text-align: center; font-size: 40px; font-weight: 800; line-height: 1; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.two .btn { height: 52px; font-size: 17px; }
.picks { display: flex; justify-content: center; gap: 16px; }
.pick { --cw: 84px; padding: 0; border: 0; background: none; border-radius: 8px; }
.pick:focus-visible, .pick:hover { outline: 3px solid var(--accent); outline-offset: 2px; }
</style>
