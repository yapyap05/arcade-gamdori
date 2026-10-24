import { getSupabase } from '../supabaseClient.js'

/**
 * scores 테이블은 직접 insert/update 를 막고(RLS) submit_score() 함수로만 기록합니다.
 * → supabase/schema.sql 참고
 */
export default {
  async submitScore({ gameId, score }) {
    const { data, error } = await getSupabase().rpc('submit_score', {
      p_game_id: gameId,
      p_score: Math.floor(score)
    })
    if (error) throw new Error(error.message)
    return { best: data.best, improved: data.improved }
  },

  async getTop(gameId, limit = 10) {
    const { data, error } = await getSupabase()
      .from('leaderboard')
      .select('user_id,nickname,score')
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .order('updated_at', { ascending: true })
      .limit(limit)
    if (error) throw new Error(error.message)
    return data.map((r, i) => ({ rank: i + 1, userId: r.user_id, nickname: r.nickname, score: r.score }))
  },

  async getMyBest(gameId, user) {
    const { data } = await getSupabase()
      .from('scores')
      .select('score')
      .eq('game_id', gameId)
      .eq('user_id', user.id)
      .maybeSingle()
    return data?.score ?? null
  }
}
