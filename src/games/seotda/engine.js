import { SEOTDA_DECK, monthOf } from '../hwatu/cards'

/**
 * 섯다 엔진 (화면과 무관한 순수 로직)
 * 자리 0 = 나, 1~3 = AI. 1장 받고 베팅 → 2장째 받고 베팅 → 족보 비교
 * 돈 처리는 io 로 위임: io.pay(p, 금액) → 실제로 낸 금액, io.funds(p) → 남은 돈
 */
export const SEATS = 4
const MAX_RAISES = 3 // 한 베팅 라운드에 올리기(삥·따당·하프) 최대 횟수
const MAX_REMATCH = 3 // 재경기가 이만큼 이어지면 그냥 높은 패가 이김 (같으면 나눔)

/* ───────── 족보 ───────── */
const MID = { '1-2': ['알리', 700], '1-4': ['독사', 690], '1-9': ['구삥', 680], '1-10': ['장삥', 670], '4-10': ['장사', 660], '4-6': ['세륙', 650] }
// 카드 id: 1월 광 0, 3월 광 8, 8월 광 28, 4월 열끗 12, 7월 열끗 24, 9월 열끗 32

/** 두 장의 족보 → { s: 세기, n: 이름, sp?: 특수패 } */
export function handOf(a, b) {
  const has = (x, y) => (a === x && b === y) || (a === y && b === x)
  const ma = monthOf(a), mb = monthOf(b)
  const lo = Math.min(ma, mb), hi = Math.max(ma, mb)
  if (has(8, 28)) return { s: 1000, n: '38광땡' }
  if (has(0, 8)) return { s: 950, n: '13광땡' }
  if (has(0, 28)) return { s: 950, n: '18광땡' }
  if (ma === mb) return ma === 10 ? { s: 900, n: '장땡' } : { s: 800 + ma, n: `${ma}땡` }
  const mid = MID[`${lo}-${hi}`]
  if (mid) return { s: mid[1], n: mid[0] }
  if (has(12, 24)) return { s: 101, n: '암행어사', sp: 'amh' } // 잡을 패 없으면 1끗
  if (has(8, 24)) return { s: 100, n: '땡잡이', sp: 'ttj' } // 잡을 패 없으면 망통
  if (has(12, 32)) return { s: 103, n: '멍텅구리구사', sp: 'mgs' } // 재경기 못 하면 3끗
  if (lo === 4 && hi === 9) return { s: 103, n: '구사', sp: 'gs' }
  const k = (ma + mb) % 10
  return { s: 100 + k, n: k === 9 ? '갑오' : k === 0 ? '망통' : `${k}끗` }
}

/** 잡이(암행어사·땡잡이)를 상대 패에 맞춰 세기 조정 */
function adjust(hands) {
  const plain = hands.filter((x) => !x.h.sp)
  const best = plain.length ? Math.max(...plain.map((x) => x.h.s)) : 0
  return hands.map((x) => {
    if (x.h.sp === 'amh' && best === 950) return { ...x, h: { ...x.h, s: 960, n: '암행어사 (광땡 잡음)' } }
    if (x.h.sp === 'ttj' && best >= 801 && best <= 809) return { ...x, h: { ...x.h, s: 850, n: '땡잡이 (땡 잡음)' } }
    return x
  })
}

/** 판정 → { rematch: 이유 } 또는 { hands: 조정된 패 } */
export function judge(hands, allowRematch = true) {
  const adj = adjust(hands)
  if (allowRematch) {
    const others = adj.filter((x) => x.h.sp !== 'gs' && x.h.sp !== 'mgs')
    const top2 = others.length ? Math.max(...others.map((x) => x.h.s)) : 0
    if (adj.some((x) => x.h.sp === 'mgs') && top2 <= 809) return { rematch: '멍텅구리구사' }
    if (adj.some((x) => x.h.sp === 'gs') && top2 <= 700) return { rematch: '구사' }
    const top = Math.max(...adj.map((x) => x.h.s))
    if (adj.filter((x) => x.h.s === top).length > 1) return { rematch: '동점' }
  }
  return { hands: adj }
}

/* ───────── 진행 ───────── */
function shuffled(arr, rnd) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 새 판 (재경기면 carry 로 이전 판돈·낸 돈을 이어받고 기본금은 다시 내지 않음)
 * players: 이번 판에 참여하는 자리 / dealer: 선 (먼저 베팅)
 */
export function createRound({ ante, dealer = 0, players = [0, 1, 2, 3], carry = null, io, rnd = Math.random }) {
  const st = {
    ante, dealer,
    deck: shuffled(SEOTDA_DECK, rnd),
    cards: [[], [], [], []],
    in: [0, 1, 2, 3].map((p) => players.includes(p)),
    allin: [false, false, false, false],
    spent: carry ? [...carry.spent] : [0, 0, 0, 0],
    pot: carry ? carry.pot : 0,
    rematches: carry ? carry.rematches + 1 : 0,
    bet: [0, 0, 0, 0],
    street: 1,
    turn: dealer,
    acted: [false, false, false, false],
    raises: 0,
    log: ['', '', '', ''],
    result: null,
  }
  if (!carry) {
    players.forEach((p) => pay(st, p, ante, io))
    st.bet = [0, 0, 0, 0] // 기본금은 판돈에만 넣고 베팅액으로는 세지 않음 → 첫 행동에 삥 가능
  }
  players.forEach((p) => st.cards[p].push(st.deck.pop()))
  if (carry) players.forEach((p) => { st.allin[p] = io.funds(p) <= 0 })
  st.turn = nextFrom(st, dealer - 1)
  if (st.turn < 0) advanceStreet(st, io)
  return st
}

function pay(st, p, amount, io) {
  const paid = io.pay(p, Math.max(0, amount))
  st.pot += paid; st.spent[p] += paid; st.bet[p] += paid
  if (io.funds(p) <= 0) st.allin[p] = true
  return paid
}

export const activePlayers = (st) => [0, 1, 2, 3].filter((p) => st.in[p])
const canAct = (st, p) => st.in[p] && !st.allin[p]
export const toCall = (st, p) => Math.max(0, Math.max(...st.bet) - st.bet[p])

/** p 다음 차례 (없으면 -1) */
function nextFrom(st, p) {
  for (let i = 1; i <= SEATS; i++) {
    const q = (((p + i) % SEATS) + SEATS) % SEATS
    if (canAct(st, q)) return q
  }
  return -1
}

/** p 가 할 수 있는 행동 [{ kind, amount, label }] */
export function actions(st, p, io) {
  const tc = toCall(st, p)
  const funds = io.funds(p)
  const max = Math.max(...st.bet)
  const fmt = (n) => n.toLocaleString()
  const list = [{ kind: 'die', amount: 0, label: '다이' }]
  if (tc === 0) list.push({ kind: 'check', amount: 0, label: '체크' })
  else list.push({ kind: 'call', amount: Math.min(tc, funds), label: funds <= tc ? `올인 ${fmt(funds)}` : `콜 ${fmt(tc)}` })
  if (st.raises < MAX_RAISES && funds > tc) {
    const raise = (kind, name, amount) => {
      const a = Math.min(amount, funds)
      if (a <= tc || list.some((x) => x.amount === a && x.kind !== 'die')) return
      list.push({ kind, amount: a, label: a >= funds ? `올인 ${fmt(a)}` : `${name} ${fmt(a)}` })
    }
    if (max === 0) raise('bbing', '삥', st.ante)
    raise('ddadang', '따당', Math.max(st.ante * 2, max * 2) - st.bet[p])
    raise('half', '하프', tc + Math.floor((st.pot + tc) / 2))
  }
  return list
}

const LOG = { die: '다이', check: '체크', call: '콜', bbing: '삥', ddadang: '따당', half: '하프' }

/** 행동 적용 → 다음 차례/다음 장/결과까지 진행 */
export function act(st, p, kind, io) {
  if (st.result || st.turn !== p) return st
  const opt = actions(st, p, io).find((a) => a.kind === kind) ?? actions(st, p, io)[1] // 없으면 체크/콜
  if (opt.kind === 'die') st.in[p] = false
  else if (opt.amount > 0) {
    const before = Math.max(...st.bet)
    pay(st, p, opt.amount, io)
    if (st.bet[p] > before) { // 올림 → 다른 사람은 다시 행동
      st.raises++
      st.acted = st.acted.map(() => false)
    }
  }
  st.acted[p] = true
  st.log[p] = opt.label.startsWith('올인') ? '올인' : LOG[opt.kind]

  const alive = activePlayers(st)
  if (alive.length === 1) return finishFold(st, alive[0])
  const done = alive.every((q) => st.allin[q] || (st.acted[q] && toCall(st, q) === 0))
  if (done) return advanceStreet(st, io)
  st.turn = nextFrom(st, p)
  if (st.turn < 0) return advanceStreet(st, io)
  return st
}

function advanceStreet(st, io) {
  const alive = activePlayers(st)
  if (st.street === 1) {
    st.street = 2
    alive.forEach((q) => st.cards[q].push(st.deck.pop()))
    st.bet = [0, 0, 0, 0]
    st.acted = [false, false, false, false]
    st.raises = 0
    st.log = st.log.map((l, q) => (st.in[q] ? (st.allin[q] ? '올인' : '') : l))
    st.turn = nextFrom(st, st.dealer - 1)
    // 베팅할 수 있는 사람이 1명 이하면 바로 공개
    if (alive.filter((q) => !st.allin[q]).length <= 1 && alive.every((q) => toCall(st, q) === 0)) return showdown(st)
    if (st.turn < 0) return showdown(st)
    return st
  }
  return showdown(st)
}

function finishFold(st, winner) {
  const payouts = [0, 0, 0, 0]
  payouts[winner] = st.pot
  st.result = { type: 'fold', winner, payouts, hands: null }
  st.turn = -1
  return st
}

function showdown(st) {
  st.turn = -1
  const hands = activePlayers(st).map((p) => ({ p, h: handOf(st.cards[p][0], st.cards[p][1]) }))
  const j = judge(hands, st.rematches < MAX_REMATCH)
  if (j.rematch) {
    st.result = { type: 'rematch', reason: j.rematch, hands }
    return st
  }
  const payouts = distribute(st)
  const winner = payouts.indexOf(Math.max(...payouts))
  st.result = { type: 'win', winner, payouts, hands: j.hands }
  return st
}

/** 낸 돈 기준으로 판돈 나누기 (올인한 사람은 자기가 낸 만큼까지만 겨룸) */
function distribute(st) {
  const left = [...st.spent]
  const payouts = [0, 0, 0, 0]
  const alive = activePlayers(st)
  let lastWinners = alive
  while (left.some((v) => v > 0)) {
    const elig = alive.filter((q) => left[q] > 0)
    if (!elig.length) { // 다이한 사람이 더 낸 몫 → 마지막 승자에게
      const rest = left.reduce((a, b) => a + b, 0)
      split(payouts, lastWinners, rest)
      break
    }
    const lvl = Math.min(...elig.map((q) => left[q]))
    let pot = 0
    for (let q = 0; q < SEATS; q++) { const t = Math.min(left[q], lvl); pot += t; left[q] -= t }
    const adj = adjust(elig.map((p) => ({ p, h: handOf(st.cards[p][0], st.cards[p][1]) })))
    const top = Math.max(...adj.map((x) => x.h.s))
    lastWinners = adj.filter((x) => x.h.s === top).map((x) => x.p)
    split(payouts, lastWinners, pot)
  }
  return payouts
}

function split(payouts, winners, amount) {
  const each = Math.floor(amount / winners.length)
  winners.forEach((w, i) => { payouts[w] += each + (i === 0 ? amount - each * winners.length : 0) })
}

/** 재경기: 남은 사람끼리 판돈 그대로 다시 */
export function rematch(st, io, rnd) {
  return createRound({
    ante: st.ante, dealer: st.dealer, players: activePlayers(st),
    carry: { spent: st.spent, pot: st.pot, rematches: st.rematches }, io, rnd,
  })
}
