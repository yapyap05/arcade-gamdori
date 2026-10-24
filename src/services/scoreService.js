import { isFirebaseEnabled } from './config'
import { mockScores } from './mock/scores'
import { firebaseScores } from './firebase/scores'

/**
 * ScoreAdapter 인터페이스 (mock / firebase 동일)
 *  submit({ user, gameId, score, mode, meta })   유저별 최고점만 유지
 *  top({ gameId, mode, limit })       -> [{ userId, nickname, score, createdAt }]  내림차순
 *  myRank({ userId, gameId, mode })   -> { rank, score } | null
 */
export const scoreService = isFirebaseEnabled ? firebaseScores : mockScores
