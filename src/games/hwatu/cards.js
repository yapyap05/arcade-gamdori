import sprite from './hwatu.webp'

/**
 * 화투패 정의 (고스톱·섯다 공통)
 * 스프라이트 hwatu.webp: 9열 x 6행, 한 칸 120x180
 *   0~47  : 1~12월 x 4장 (월마다 [광/열끗, 띠/쌍피, 피, 피] 순)
 *   48    : 보너스 투피(2피)   49 : 보너스 쓰리피(3피)   50 : 뒷면
 * k(종류): G 광 · Y 열끗 · D 띠 · P 피 · S 쌍피 · B 보너스
 */
export const SPRITE = sprite
export const BACK = 50
const COLS = 9
const ROWS = 6

const KIND = [
  ['G', 'D', 'P', 'P'], ['Y', 'D', 'P', 'P'], ['G', 'D', 'P', 'P'], ['Y', 'D', 'P', 'P'],
  ['Y', 'D', 'P', 'P'], ['Y', 'D', 'P', 'P'], ['Y', 'D', 'P', 'P'], ['G', 'Y', 'P', 'P'],
  ['Y', 'D', 'P', 'P'], ['Y', 'D', 'P', 'P'], ['G', 'S', 'P', 'P'], ['G', 'Y', 'D', 'S'],
]
/** 띠 종류: 홍단 1·2·3월, 초단 4·5·7월, 청단 6·9·10월 (12월 비띠는 없음) */
export const RIBBON = { 1: '홍', 2: '홍', 3: '홍', 4: '초', 5: '초', 7: '초', 6: '청', 9: '청', 10: '청' }
/** 고도리: 2·4·8월 열끗(새) */
export const GODORI = new Set([2, 4, 8])
export const KIND_NAME = { G: '광', Y: '열끗', D: '띠', P: '피', S: '쌍피', B: '보너스' }

export const CARDS = []
KIND.forEach((ks, mi) => ks.forEach((k, j) => CARDS.push({ id: mi * 4 + j, m: mi + 1, k })))
CARDS.push({ id: 48, m: 0, k: 'B', pi: 2, name: '투피' }, { id: 49, m: 0, k: 'B', pi: 3, name: '쓰리피' })

/** 고스톱 덱: 48장 + 보너스 2장 */
export const GOSTOP_DECK = CARDS.map((c) => c.id)

/** 섯다 덱: 1~10월 각 2장 (광·열끗 쪽 + 띠 쪽) = 20장 */
export const SEOTDA_DECK = CARDS.filter((c) => c.m >= 1 && c.m <= 10 && c.id % 4 < 2).map((c) => c.id)

export const card = (id) => CARDS[id]
export const monthOf = (id) => CARDS[id].m
export const isGwang = (id) => CARDS[id]?.k === 'G'

/** 스프라이트 위치 (background-position 값) */
export const spritePos = (id) => `${((id % COLS) / (COLS - 1)) * 100}% ${(Math.floor(id / COLS) / (ROWS - 1)) * 100}%`
export const SPRITE_SIZE = `${COLS * 100}% ${ROWS * 100}%`

/** 화면 낭독용 이름 */
export function cardLabel(id) {
  if (id == null || id === BACK) return '뒷면'
  const c = CARDS[id]
  if (c.k === 'B') return `보너스 ${c.name}`
  return `${c.m}월 ${c.k === 'D' && RIBBON[c.m] ? RIBBON[c.m] + '단' : KIND_NAME[c.k]}`
}
