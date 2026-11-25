/** 운세 계산 함수 (화면과 무관한 순수 함수, 원본 today_fortune 과 같은 계산) */
import { rng, ymd, parseDate } from './seed'
import {
  TIER, ZODIAC, ZODIAC_ELEMENT, ELEMENT_GROUP, STROKE_CHO, STROKE_JUNG, STROKE_JONG, GOOD_NUMBERS,
  STEMS, BRANCHES, STEM_ELEMENT, TEN_GODS, BASE_SCORE,
} from './data'

/** 기본 운세 점수 4종 (30~99) — 키 순서도 원본과 같게 */
export const scoreSet = (r) => ({
  종합: (30 + r() * 70) | 0,
  연애: (30 + r() * 70) | 0,
  금전: (30 + r() * 70) | 0,
  직장: (30 + r() * 70) | 0,
})

/** 종합 점수 → 문구 */
export const tierText = (score) => TIER.find(([min]) => score >= min)[1]

/* ───── 별자리 · 띠 ───── */
export function zodiacIndex(m, d) {
  let z = 11
  ZODIAC.forEach(([zm, zd], i) => { if (m * 100 + d >= zm * 100 + zd) z = i })
  return z
}
export const zodiacName = (m, d) => ZODIAC[zodiacIndex(m, d)][2]
/** 띠 번호 (0=쥐) */
export const animalOf = (year) => (((year - 4) % 12) + 12) % 12

/* ───── 이름 획수 ───── */
export function stroke(ch) {
  const n = ch.charCodeAt(0) - 44032
  if (n < 0 || n > 11171) return 0
  return STROKE_CHO[(n / 588) | 0] + STROKE_JUNG[((n % 588) / 28) | 0] + STROKE_JONG[n % 28]
}
export const isGoodNumber = (n) => GOOD_NUMBERS.has(n % 81 || 81)

/* ───── 사주 일진 ───── */
/** 60갑자 일진 번호 */
export const dayIndex = (d) => (Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5) + 25577) % 60

/** 그날 달이 머무는 별자리 번호 (근사 계산) */
export function moonSign(d) {
  const t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12) / 864e5 - 10957.5
  const L = (((218.316 + 13.176396 * t) % 360) + 360) % 360
  return (Math.floor(L / 30) + 2) % 12
}

/**
 * 생일(YYYY-MM-DD)과 날짜로 그날의 일진 운세
 * → { r: 십성 묶음 0~4, tenGod, ganji, moon, 종합, 연애, 금전, 직장 }
 */
export function dayFortune(birth, date) {
  const u = parseDate(birth)
  const us = dayIndex(u)
  const di = dayIndex(date)
  const r = (STEM_ELEMENT[di % 10] - STEM_ELEMENT[us % 10] + 5) % 5
  const sameYinYang = di % 2 === us % 2
  const moon = moonSign(date)
  const mySign = ZODIAC_ELEMENT[zodiacIndex(u.getMonth() + 1, u.getDate())]
  const rand = rng(birth + ymd(date))
  const bonus = ELEMENT_GROUP[ZODIAC_ELEMENT[moon]] === ELEMENT_GROUP[mySign] ? 5 : -4
  const out = { r, tenGod: TEN_GODS[r][sameYinYang ? 0 : 1], ganji: STEMS[di % 10] + BRANCHES[di % 12] + '일', moon }
  for (const k in BASE_SCORE) out[k] = Math.max(25, Math.min(99, BASE_SCORE[k][r] + bonus + ((rand() * 16 - 8) | 0)))
  return out
}

/** 음력 날짜(일). 브라우저가 지원하지 않으면 NaN */
export function lunarDay(d) {
  try {
    return +new Intl.DateTimeFormat('en-u-ca-chinese', { day: 'numeric' }).formatToParts(d).find((p) => p.type === 'day').value
  } catch {
    return NaN
  }
}

/** 생후 일수 */
export function daysSince(birth, now = new Date()) {
  const [y, m, d] = birth.split('-').map(Number)
  return Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(y, m - 1, d)) / 864e5)
}
