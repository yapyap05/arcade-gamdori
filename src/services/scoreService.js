import { isSupabaseEnabled } from './config'
import { mockScores } from './mock/scores'
import { supabaseScores } from './supabase/scores'

/**
 * ScoreAdapter 인터페이스 (mock / supabase 동일)
 *  submit({ user, gameId, score, mode, meta })   유저별 최고점만 유지
 *  top({ gameId, mode, limit })       -> [{ userId, nickname, score, createdAt }]  내림차순
 *  myRank({ userId, gameId, mode })   -> { rank, score } | null
 *  stats()                           -> { gameId: { n: 랭킹 기록 수 (캐주얼+경쟁), top: 경쟁 1위 점수 | null } }
 */
export const scoreService = isSupabaseEnabled ? supabaseScores : mockScores
