import { handOf, actions, toCall } from './engine'
import { card } from '../hwatu/cards'

/** 패 세기 대략치 (0~1000). 첫 장만 있으면 그 장으로 짐작 */
function strength(cards) {
  if (cards.length === 2) {
    const h = handOf(cards[0], cards[1])
    if (h.sp === 'amh' || h.sp === 'ttj') return 450 // 잡을 패가 나오면 강함
    if (h.sp) return 380 // 구사 계열: 재경기 기대
    return h.s
  }
  const c = card(cards[0])
  if (c.k === 'G') return 760
  if (c.m === 10 || c.m === 1) return 640
  return 300 + c.m * 30
}

/** AI 행동 고르기 → kind */
export function aiAction(st, p, io, rnd = Math.random) {
  const opts = actions(st, p, io).map((a) => a.kind)
  const can = (k) => opts.includes(k)
  const s = strength(st.cards[p])
  const tc = toCall(st, p)
  const r = rnd()
  const bluff = r < 0.06

  if ((s >= 800 || bluff) && can('half') && r < 0.55) return 'half'
  if (s >= 650 && can('ddadang') && r < 0.4) return 'ddadang'
  if (tc === 0) return can('bbing') && (s >= 600 || bluff) && r < 0.5 ? 'bbing' : 'check'
  if (s < 110 && tc > st.ante * 2 && r < 0.75) return 'die'
  if (s < 420 && tc > st.pot / 2 && r < 0.55) return 'die'
  return 'call'
}
