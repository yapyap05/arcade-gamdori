/**
 * 랭킹 서비스 진입점.
 *
 * 어댑터 계약:
 *   submitScore({ gameId, score, user }): Promise<{ best: number, improved: boolean }>
 *   getTop(gameId, limit): Promise<Array<{ rank, nickname, score, userId }>>
 *   getMyBest(gameId, user): Promise<number | null>
 *
 * 정책: 게임별 · 사용자별 '최고 점수 1건'만 랭킹에 남깁니다.
 */
const backend = import.meta.env.VITE_BACKEND || 'local'

let adapterPromise
function load() {
  if (!adapterPromise) {
    adapterPromise =
      backend === 'supabase' ? import('./supabaseAdapter.js') : import('./localAdapter.js')
  }
  return adapterPromise.then((m) => m.default)
}

export const rankingService = {
  backend,
  submitScore: async (p) => (await load()).submitScore(p),
  getTop: async (gameId, limit = 10) => (await load()).getTop(gameId, limit),
  getMyBest: async (gameId, user) => (await load()).getMyBest(gameId, user)
}
