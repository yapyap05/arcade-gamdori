/** 날짜 기반 유틸 — 같은 날에는 누구에게나 같은 결과 */

const pad = (n) => String(n).padStart(2, '0')

/** 로컬 날짜 키 'YYYY-MM-DD' */
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** '11월 20일 목요일' */
export function dateLabel(d = new Date()) {
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
}

/** 문자열 → 32비트 해시 (FNV-1a) */
function hash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** 오늘의 항목 하나 고르기 */
export function pickDaily(list, d = new Date()) {
  if (!list.length) return null
  return list[hash(dateKey(d)) % list.length]
}
