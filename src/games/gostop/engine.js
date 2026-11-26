import { CARDS, GOSTOP_DECK, RIBBON, GODORI } from '../hwatu/cards'

/**
 * 고스톱 엔진 (화면과 분리된 순수 로직)
 *  - 맞고(2인): 손패 10장 · 바닥 8장 · 7점부터 고/스톱
 *  - 3인: 손패 7장 · 바닥 6장 · 3점부터 고/스톱 · 고박 대신 독박
 *  - 특수: 뻑(3뻑 바로 승) · 자뻑 · 따닥 · 쪽 · 쓸 · 폭탄 · 흔들기 · 총통(바로 승) · 보너스패
 *    피 뺏기는 마지막 턴에는 하지 않음
 *  - 배수: 고(1·2고 +1점씩, 3고부터 x2씩) · 흔들기/폭탄 x2 · 멍따 x2 · 광박 x2 · 피박 x2 · 고박 x2 · 나가리 다음 판 x2(최대 x4)
 * 사람이 골라야 하는 순간(같은 월 2장 중 하나, 고/스톱)은 st.need 에 담고 멈춤 → resolve() 로 이어감
 */
export const SAMPPUK_POINTS = 10
export const CHONGTONG_POINTS = 10
const GUKJIN = 32 // 9월 열끗 (국진): 열끗 또는 쌍피 중 유리한 쪽
export const TOKEN = 100 // 폭탄 뒤 받는 '더미 뒤집기' 패 (100 이상)

export const isToken = (id) => id >= TOKEN
const C = (id) => CARDS[id]

function shuffled(list, rnd) {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ───── 점수 ───── */
const piOf = (c, gukjinPi) => (c.k === 'P' ? 1 : c.k === 'S' ? 2 : c.k === 'B' ? c.pi : c.id === GUKJIN && gukjinPi ? 2 : 0)

function calc(ids, gukjinPi) {
  const cs = ids.map(C)
  const g = cs.filter((c) => c.k === 'G')
  const y = cs.filter((c) => c.k === 'Y' && !(c.id === GUKJIN && gukjinPi))
  const d = cs.filter((c) => c.k === 'D')
  const pi = cs.reduce((s, c) => s + piOf(c, gukjinPi), 0)
  const lines = []
  if (g.length >= 3) {
    const rain = g.some((c) => c.m === 12)
    const v = g.length === 5 ? 15 : g.length === 4 ? 4 : rain ? 2 : 3
    lines.push([g.length === 5 ? '오광' : g.length === 4 ? '사광' : rain ? '비삼광' : '삼광', v])
  }
  if (y.filter((c) => GODORI.has(c.m)).length === 3) lines.push(['고도리', 5])
  if (y.length >= 5) lines.push([`열끗 ${y.length}장`, y.length - 4])
  for (const [n, t] of [['홍단', '홍'], ['청단', '청'], ['초단', '초']]) {
    if (d.filter((c) => RIBBON[c.m] === t).length === 3) lines.push([n, 3])
  }
  if (d.length >= 5) lines.push([`띠 ${d.length}장`, d.length - 4])
  if (pi >= 10) lines.push([`피 ${pi}장`, pi - 9])
  return { total: lines.reduce((s, l) => s + l[1], 0), lines, g: g.length, y: y.length, d: d.length, pi, gukjinPi }
}

/** 먹은 패 점수 (국진은 점수가 더 높은 쪽, 같으면 열끗) */
export function scoreOf(ids) {
  const a = calc(ids, false)
  if (!ids.includes(GUKJIN)) return a
  const b = calc(ids, true)
  return b.total > a.total ? b : a
}

/** 패 가치 (AI·자동 선택용) */
export function rankOf(id) {
  if (isToken(id)) return 0
  const c = C(id)
  if (c.k === 'G') return 20
  if (c.k === 'Y') return GODORI.has(c.m) ? 12 : c.id === GUKJIN ? 11 : 9
  if (c.k === 'D') return RIBBON[c.m] ? 9 : 7
  if (c.k === 'S' || c.k === 'B') return 8
  return 4
}
const best = (ids) => ids.slice().sort((a, b) => rankOf(b) - rankOf(a))[0]

/* ───── 판 만들기 ───── */
export function createGame({ players = 2, dealer = 0, nagariMul = 1, human = [true, false, false], rnd = Math.random } = {}) {
  const n = players
  for (;;) {
    const deck = shuffled(GOSTOP_DECK, rnd)
    const per = n === 2 ? 10 : 7
    const st = {
      n, th: n === 2 ? 7 : 3, dealer, nagariMul, human: human.slice(0, n),
      deck, hands: Array.from({ length: n }, () => []), floor: [], cap: Array.from({ length: n }, () => []),
      go: Array(n).fill(0), last: Array(n).fill(0), shake: Array(n).fill(0), bomb: Array(n).fill(0),
      ppuk: {}, ppukCount: Array(n).fill(0), tokens: 0,
      turn: dealer, need: null, result: null, msg: '', cur: null, turns: 0,
    }
    for (let i = 0; i < per; i++) for (let k = 0; k < n; k++) st.hands[(dealer + k) % n].push(deck.pop())
    for (let i = 0; i < (n === 2 ? 8 : 6); i++) st.floor.push(deck.pop())
    // 바닥에 깔린 보너스패는 선이 가져가고 다시 깜
    for (let i = 0; i < st.floor.length; i++) {
      while (C(st.floor[i]).k === 'B') { st.cap[dealer].push(st.floor[i]); st.floor[i] = deck.pop() }
    }
    // 바닥에 같은 월 4장이면 다시 섞음
    const cnt = {}
    st.floor.forEach((id) => { cnt[C(id).m] = (cnt[C(id).m] ?? 0) + 1 })
    if (Object.values(cnt).some((v) => v === 4)) continue
    st.hands.forEach(sortHand)
    // 총통: 손에 같은 월 4장 → 바로 승
    for (let k = 0; k < n; k++) {
      const p = (dealer + k) % n
      if (monthsInHand(st.hands[p]).some(([, v]) => v === 4)) { settle(st, p, 'chongtong'); break }
    }
    return st
  }
}

function sortHand(h) { h.sort((a, b) => (isToken(a) ? 99 : C(a).m) - (isToken(b) ? 99 : C(b).m) || a - b) }
function monthsInHand(h) {
  const cnt = {}
  h.forEach((id) => { if (!isToken(id) && C(id).m) cnt[C(id).m] = (cnt[C(id).m] ?? 0) + 1 })
  return Object.entries(cnt).map(([m, v]) => [Number(m), v])
}

const floorOf = (st, m) => st.floor.filter((id) => C(id).m === m)
const others = (st, p) => Array.from({ length: st.n }, (_, i) => i).filter((q) => q !== p)

/** 이 패를 낼 때 가능한 특수 행동 */
export function playInfo(st, p, id) {
  if (isToken(id) || C(id).k === 'B') return { bomb: false, shake: false }
  const m = C(id).m
  const inHand = st.hands[p].filter((x) => !isToken(x) && C(x).m === m).length
  const onFloor = floorOf(st, m).length
  return { bomb: inHand === 3 && onFloor === 1, shake: inHand === 3 && onFloor === 0 }
}

/* ───── 피 뺏기 ───── */
function steal(st, p, times) {
  if (times <= 0 || st.cur?.last) return
  for (const o of others(st, p)) {
    for (let t = 0; t < times; t++) {
      const cap = st.cap[o]
      const i = [cap.findIndex((id) => C(id).k === 'P'), cap.findIndex((id) => C(id).k === 'B'), cap.findIndex((id) => C(id).k === 'S')].find((x) => x >= 0)
      if (i == null) break
      st.cap[p].push(cap.splice(i, 1)[0])
    }
  }
}

/* ───── 한 턴 ───── */
/** p 가 손패 id 를 냄. opt.shake: 흔들기 선택 */
export function play(st, p, id, opt = {}) {
  if (st.result || st.need || st.turn !== p) return st
  const hand = st.hands[p]
  const at = hand.indexOf(id)
  if (at < 0) return st
  const last = st.hands.every((h, q) => h.length === (q === p ? 1 : 0)) && C(id)?.k !== 'B'
  st.cur = { p, c: null, f: null, take: [], notes: [], steal: 0, step: 'hand', last, pickHand: null, pickFlip: null }
  const k = st.cur

  if (isToken(id)) { // 폭탄 뒤 빈 패: 더미만 뒤집음
    hand.splice(at, 1)
  } else if (C(id).k === 'B') { // 보너스: 바로 먹고 피 1장, 더미에서 한 장 받아 계속
    hand.splice(at, 1)
    st.cap[p].push(id)
    steal(st, p, 1)
    if (st.deck.length) hand.push(st.deck.pop())
    sortHand(hand)
    st.msg = `보너스 ${C(id).pi}피`
    st.cur = null
    if (!hand.length) return finishTurn(st, p)
    return st
  } else {
    const info = playInfo(st, p, id)
    const m = C(id).m
    if (info.bomb) { // 폭탄: 3장 내고 바닥 1장까지 4장 먹기, 빈 패 2장
      const three = hand.filter((x) => !isToken(x) && C(x).m === m)
      three.forEach((x) => hand.splice(hand.indexOf(x), 1))
      const f1 = floorOf(st, m)
      grab(st, f1)
      k.take.push(...three, ...f1)
      k.steal += 1
      st.bomb[p]++
      for (let i = 0; i < 2; i++) hand.push(TOKEN + st.tokens++)
      k.notes.push('폭탄')
    } else {
      if (info.shake && opt.shake) { st.shake[p]++; k.notes.push('흔들기') }
      hand.splice(at, 1)
      k.c = id
    }
  }
  // 더미 뒤집기 (보너스가 나오면 먹고 한 번 더)
  while (st.deck.length) {
    const f = st.deck.pop()
    if (C(f).k === 'B') { st.cap[p].push(f); k.notes.push('보너스'); steal(st, p, 1); continue }
    k.f = f
    break
  }
  return proceed(st)
}

function grab(st, ids) { ids.forEach((x) => { const i = st.floor.indexOf(x); if (i >= 0) st.floor.splice(i, 1) }) }

/** 같은 월 2장 중 하나 고르기: 종류가 같으면 자동, 다르면 사람에게 물음 */
function choose(st, list, which) {
  const k = st.cur
  const key = which === 'hand' ? 'pickHand' : 'pickFlip'
  if (k[key] != null && list.includes(k[key])) return k[key]
  const kinds = new Set(list.map((x) => C(x).k))
  if (kinds.size > 1 && st.human[k.p]) { st.need = { kind: 'pick', which, options: list.slice() }; return null }
  return best(list)
}

/** 4장 다 먹기 (뻑 먹기면 피 뺏기: 자뻑 2장, 남의 뻑 1장) */
function takeAll(st, m, extra) {
  const k = st.cur
  const fl = floorOf(st, m)
  grab(st, fl)
  k.take.push(...fl, ...extra)
  if (st.ppuk[m] != null) {
    const own = st.ppuk[m] === k.p
    k.steal += own ? 2 : 1
    k.notes.push(own ? '자뻑' : '뻑 먹기')
    delete st.ppuk[m]
  }
}

function proceed(st) {
  const k = st.cur
  const p = k.p
  if (k.step === 'hand') {
    const c = k.c
    if (c == null) k.step = 'flip'
    else {
      const m = C(c).m
      const m1 = floorOf(st, m)
      if (k.f != null && C(k.f).m === m) {
        if (m1.length === 0) { k.take.push(c, k.f); k.notes.push('쪽'); k.steal += 1 }
        else if (m1.length === 1) {
          st.floor.push(c, k.f)
          st.ppuk[m] = p
          st.ppukCount[p]++
          k.notes.push('뻑')
        } else { grab(st, m1); k.take.push(c, ...m1, k.f); k.notes.push('따닥'); k.steal += 1 }
        k.f = null
        k.step = 'end'
      } else {
        if (m1.length === 0) st.floor.push(c)
        else if (m1.length === 1) { grab(st, m1); k.take.push(c, m1[0]) }
        else if (m1.length === 2) {
          const pick = choose(st, m1, 'hand')
          if (pick == null) return st
          grab(st, [pick]); k.take.push(c, pick)
        } else takeAll(st, m, [c])
        k.step = 'flip'
      }
    }
  }
  if (k.step === 'flip') {
    const f = k.f
    if (f != null) {
      const m = C(f).m
      const m2 = floorOf(st, m)
      if (m2.length === 0) st.floor.push(f)
      else if (m2.length === 1) { grab(st, m2); k.take.push(f, m2[0]) }
      else if (m2.length === 2) {
        const pick = choose(st, m2, 'flip')
        if (pick == null) return st
        grab(st, [pick]); k.take.push(f, pick)
      } else takeAll(st, m, [f])
    }
    k.step = 'end'
  }
  // 마무리
  st.cap[p].push(...k.take)
  if (k.take.length && !st.floor.length && !k.last) { k.notes.push('쓸'); k.steal += 1 }
  steal(st, p, k.steal)
  st.msg = k.notes.join(' · ')
  st.cur = null
  st.turns++
  if (st.ppukCount[p] >= 3) return settle(st, p, 'samppuk')
  return finishTurn(st, p)
}

/** 같은 월 고르기 / 고·스톱 답하기 */
export function resolve(st, answer) {
  const nd = st.need
  if (!nd) return st
  st.need = null
  if (nd.kind === 'pick') {
    st.cur[nd.which === 'hand' ? 'pickHand' : 'pickFlip'] = answer
    return proceed(st)
  }
  if (nd.kind === 'gostop') return answer ? callGo(st, nd.p) : settle(st, nd.p, 'stop')
  return st
}

function callGo(st, p) {
  st.go[p]++
  st.last[p] = scoreOf(st.cap[p]).total
  st.msg = `${st.go[p]}고!`
  return nextTurn(st, p)
}

function finishTurn(st, p) {
  const sc = scoreOf(st.cap[p]).total
  const allEmpty = st.hands.every((h) => !h.length)
  if (sc >= st.th && sc > st.last[p]) {
    if (!st.hands[p].length) return settle(st, p, 'stop')
    if (st.human[p]) { st.need = { kind: 'gostop', p, score: sc }; return st }
    return aiGoStop(st, p) ? callGo(st, p) : settle(st, p, 'stop')
  }
  if (allEmpty) return nagari(st)
  return nextTurn(st, p)
}

function nextTurn(st, p) {
  if (st.hands.every((h) => !h.length)) return nagari(st)
  for (let i = 1; i <= st.n; i++) {
    const q = (p + i) % st.n
    if (st.hands[q].length) { st.turn = q; return st }
  }
  return nagari(st)
}

function nagari(st) {
  st.turn = -1
  st.result = { type: 'nagari', nextMul: Math.min(4, st.nagariMul * 2) }
  return st
}

/* ───── 정산 ───── */
/** 점수·배수 계산 → st.result. 금액은 points(점수 x 배수)로 주고, Gam 환산은 화면에서 */
function settle(st, w, reason) {
  st.turn = -1
  st.need = null
  const ws = scoreOf(st.cap[w])
  const rows = []
  let pts
  let mul = 1
  if (reason === 'chongtong' || reason === 'samppuk') {
    pts = reason === 'chongtong' ? CHONGTONG_POINTS : SAMPPUK_POINTS
    rows.push([reason === 'chongtong' ? '총통' : '3뻑', `${pts}점`])
  } else {
    ws.lines.forEach(([nm, v]) => rows.push([nm, `${v}점`]))
    pts = ws.total
    const go = st.go[w]
    if (go) {
      const plus = Math.min(go, 2)
      pts += plus
      rows.push([`${go}고`, `+${plus}점`])
      if (go >= 3) { mul *= 2 ** (go - 2); rows.push([`${go}고 배수`, `x${2 ** (go - 2)}`]) }
    }
    const sb = st.shake[w] + st.bomb[w]
    if (st.shake[w]) rows.push([`흔들기${st.shake[w] > 1 ? ` ${st.shake[w]}번` : ''}`, `x${2 ** st.shake[w]}`])
    if (st.bomb[w]) rows.push([`폭탄${st.bomb[w] > 1 ? ` ${st.bomb[w]}번` : ''}`, `x${2 ** st.bomb[w]}`])
    mul *= 2 ** sb
    if (ws.y >= 7) { mul *= 2; rows.push(['멍따', 'x2']) }
  }
  if (st.nagariMul > 1) { mul *= st.nagariMul; rows.push(['나가리 다음 판', `x${st.nagariMul}`]) }

  const special = reason === 'chongtong' || reason === 'samppuk'
  const piLine = st.n === 2 ? 7 : 6 // 맞고 7장 미만, 3인 5장 이하 (0장은 피박 아님)
  const losers = others(st, w).map((q) => {
    const ls = scoreOf(st.cap[q])
    const lrows = []
    let m = 1
    if (!special) {
      if (ws.g >= 3 && ls.g === 0) { m *= 2; lrows.push(['광박', 'x2']) }
      if (ws.pi >= 10 && ls.pi > 0 && ls.pi < piLine) { m *= 2; lrows.push(['피박', 'x2']) }
      if (st.n === 2 && st.go[q] > 0) { m *= 2; lrows.push(['고박', 'x2']) }
    }
    return { p: q, rows: lrows, owe: pts * mul * m }
  })
  // 3인 독박: 고를 불렀다가 진 사람이 나머지 몫까지 냄
  let doak = null
  if (st.n === 3 && !special) {
    const goers = losers.filter((l) => st.go[l.p] > 0)
    if (goers.length === 1) {
      doak = goers[0].p
      const sum = losers.reduce((s, l) => s + l.owe, 0)
      losers.forEach((l) => { l.pay = l.p === doak ? sum : 0 })
      goers[0].rows.push(['독박', '모두 냄'])
    }
  }
  losers.forEach((l) => { if (l.pay == null) l.pay = l.owe })
  st.result = { type: 'win', winner: w, reason, rows, points: pts, mul, losers, doak, score: ws }
  return st
}

/* ───── AI ───── */
function aiGoStop(st, p) {
  const left = st.hands[p].length
  const opp = Math.max(...others(st, p).map((q) => scoreOf(st.cap[q]).total))
  if (left < 2 || st.go[p] >= 3) return false
  if (opp >= st.th - 2) return false
  return Math.random() < (left >= 4 ? 0.75 : 0.45)
}

/** AI 가 낼 패와 옵션 */
export function aiChoose(st, p) {
  const hand = st.hands[p]
  const bonus = hand.find((id) => !isToken(id) && C(id).k === 'B')
  if (bonus != null) return { id: bonus }
  const tok = hand.find(isToken)
  const real = hand.filter((id) => !isToken(id))
  for (const id of real) if (playInfo(st, p, id).bomb) return { id }
  // 먹을 수 있는 패 중 가치가 큰 것
  let bestId = null
  let bestV = -1
  for (const id of real) {
    const fl = floorOf(st, C(id).m)
    if (!fl.length) continue
    const v = rankOf(id) + (fl.length === 3 ? 40 : Math.max(...fl.map(rankOf)))
    if (v > bestV) { bestV = v; bestId = id }
  }
  if (bestId != null) return { id: bestId }
  if (tok != null) return { id: tok }
  // 못 먹으면 가장 싼 패 (흔들기 가능하면 흔듦)
  const cheap = real.slice().sort((a, b) => rankOf(a) - rankOf(b))[0]
  return { id: cheap, shake: playInfo(st, p, cheap).shake }
}
