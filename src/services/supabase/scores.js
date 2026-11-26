import { getSupabase } from './client'

// 표 구조: scores(board = '{gameId}_{mode}', user_id, nickname, score, meta, updated_at) — 유저별 최고점 1건
const boardId = (gameId, mode) => `${gameId}_${mode}`

/* ───── 1분 캐시: 같은 랭킹을 다시 열면 저장된 결과 사용 (요청 수 절약) ───── */
const TTL = 60 * 1000
const cache = new Map() // key -> { at, value }
async function cached(key, load) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.value
  const value = await load()
  cache.set(key, { at: Date.now(), value })
  return value
}
// 내 점수를 저장하면 그 보드의 캐시만 지움
const invalidate = (board) => { for (const k of cache.keys()) if (k.startsWith(board + '|') || k === 'all|counts') cache.delete(k) }

/** 저장 실패 사유를 화면용으로 구분: error.reason = 'rejected' | 'network' */
function wrap(e) {
  const err = new Error(e?.message || 'submit failed')
  err.reason = e?.code === '42501' || e?.code === '22023' ? 'rejected' : 'network'
  return err
}

export const supabaseScores = {
  async submit({ gameId, score, mode, meta = {} }) {
    const sb = await getSupabase()
    const board = boardId(gameId, mode)
    const { error } = await sb.rpc('submit_score', { p_board: board, p_score: score, p_meta: meta })
    if (error) throw wrap(error)
    invalidate(board)
  },

  async top({ gameId, mode, limit = 20 }) {
    const board = boardId(gameId, mode)
    return cached(`${board}|top|${limit}`, async () => {
      const sb = await getSupabase()
      const { data, error } = await sb.from('scores')
        .select('user_id, nickname, score, updated_at')
        .eq('board', board)
        .order('score', { ascending: false })
        .order('updated_at', { ascending: true })
        .limit(limit)
      if (error) throw error
      return data.map((r) => ({ userId: r.user_id, nickname: r.nickname, score: r.score, createdAt: r.updated_at }))
    })
  },

  // 게임별 랭킹 기록 수 (캐주얼 + 경쟁) → { gameId: n }
  async counts() {
    return cached('all|counts', async () => {
      const sb = await getSupabase()
      const { data, error } = await sb.rpc('board_counts')
      if (error) throw error
      const out = {}
      data.forEach((r) => {
        const gameId = r.board.replace(/_(casual|competitive)$/, '')
        out[gameId] = (out[gameId] ?? 0) + Number(r.n)
      })
      return out
    })
  },

  // 내 최고점 → 나보다 높은 사람 수 + 1 (개수만 세고 행은 받지 않음)
  async myRank({ userId, gameId, mode }) {
    const board = boardId(gameId, mode)
    return cached(`${board}|rank|${userId}`, async () => {
      const sb = await getSupabase()
      const { data: mine, error } = await sb.from('scores').select('score').eq('board', board).eq('user_id', userId).maybeSingle()
      if (error) throw error
      if (!mine) return null
      const { count, error: e2 } = await sb.from('scores').select('user_id', { count: 'exact', head: true }).eq('board', board).gt('score', mine.score)
      if (e2) throw e2
      return { rank: (count ?? 0) + 1, score: mine.score }
    })
  },
}
