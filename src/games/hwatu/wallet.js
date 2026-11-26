import { reactive } from 'vue'

/**
 * Gam 지갑 (화투 게임 공통, 게임·모드별로 따로)
 *  - 1,000 Gam 으로 시작 → 100,000 Gam 이면 클리어, 0 Gam 이면 파산 → 도전 끝, 다시 1,000
 *  - 판돈은 내는 순간 바로 저장 → 판 도중에 나가도 낸 돈은 돌아오지 않음
 *  - 랭킹 점수: 클리어 = 100,000 + (300 − 판 수) x 100 (최소 100,000) / 파산·중도 정산 = 도전 중 최고 Gam
 * localStorage 'gamdori:gam' = { '{gameId}_{mode}': { bank, peak, rounds, clears, busts } }
 */
export const START_GAM = 1000
export const GOAL_GAM = 100000
const KEY = 'gamdori:gam'

const readAll = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
const fresh = (prev = {}) => ({ bank: START_GAM, peak: START_GAM, rounds: 0, clears: prev.clears ?? 0, busts: prev.busts ?? 0 })

export function useWallet(gameId, mode) {
  const slot = `${gameId}_${mode}`
  const saved = readAll()[slot]
  // 0 Gam 으로 저장돼 있으면 그대로 불러와서, 다음 시작 때 파산 기록을 남기고 초기화
  const w = reactive(saved ? { ...fresh(saved), ...saved } : fresh())

  function save() {
    const all = readAll()
    all[slot] = { bank: w.bank, peak: w.peak, rounds: w.rounds, clears: w.clears, busts: w.busts }
    try { localStorage.setItem(KEY, JSON.stringify(all)) } catch {}
  }

  return {
    state: w,
    /** 진행 중인 도전이 있는지 (한 판이라도 쳤는지) */
    get inRun() { return w.rounds > 0 },
    /** 새 판 시작 */
    startRound() { w.rounds++; save() },
    /** 내기: 가진 만큼만 빠져나감. 실제로 낸 금액 반환 */
    spend(amount) {
      const paid = Math.max(0, Math.min(Math.floor(amount), w.bank))
      w.bank -= paid
      save()
      return paid
    },
    /** 따기 */
    win(amount) {
      w.bank += Math.max(0, Math.floor(amount))
      w.peak = Math.max(w.peak, w.bank)
      save()
    },
    /** 'clear' | 'bust' | null */
    outcome() { return w.bank >= GOAL_GAM ? 'clear' : w.bank <= 0 ? 'bust' : null },
    /** 도전 끝내기 → 랭킹 점수 반환하고 지갑 초기화 */
    endRun(kind) {
      const rounds = w.rounds
      const peak = Math.min(w.peak, GOAL_GAM)
      const score = kind === 'clear' ? GOAL_GAM + Math.max(0, 300 - rounds) * 100 : peak
      const next = fresh(w)
      if (kind === 'clear') next.clears++
      if (kind === 'bust') next.busts++
      Object.assign(w, next)
      save()
      return { score, rounds, peak }
    },
    /** 판돈 상한: 보유 Gam / div (최소 min) */
    maxStake(div, min) { return Math.max(min, Math.floor(w.bank / div)) },
  }
}
