/**
 * 고정 난수 — 같은 날, 같은 사람, 같은 메뉴면 항상 같은 결과
 * (원본 today_fortune 과 같은 해시·난수 방식)
 */

/** 문자열 → 32비트 해시 (FNV-1a) */
export function hash(str) {
  let h = 2166136261
  for (const c of str) {
    h ^= c.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 문자열 시드로 0~1 난수 함수 생성 */
export function rng(seed) {
  let a = hash(seed)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 난수로 배열에서 하나 */
export const pick = (r, arr) => arr[(r() * arr.length) | 0]

/** 'YYYY-MM-DD' */
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 'YYYY-MM-DD' → Date (현지 시간) */
export const parseDate = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 난수로 섞기 (원본 카드 섞기와 같은 순서) */
export function shuffleWith(r, n) {
  const ord = [...Array(n).keys()]
  for (let i = n - 1; i; i--) {
    const j = (r() * (i + 1)) | 0
    ;[ord[i], ord[j]] = [ord[j], ord[i]]
  }
  return ord
}
