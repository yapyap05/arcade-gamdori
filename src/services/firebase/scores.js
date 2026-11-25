import { getFirebase } from './client'

// Firestore 구조: leaderboards/{gameId}_{mode}/entries/{uid} = 유저별 최고점 1건
const boardId = (gameId, mode) => `${gameId}_${mode}`

/* ───── 1분 캐시: 같은 랭킹을 다시 열면 저장된 결과 사용 (무료 읽기 한도 절약) ───── */
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
const invalidate = (board) => { for (const k of cache.keys()) if (k.startsWith(board + '|')) cache.delete(k) }

/** 저장 실패 사유를 화면용으로 구분: error.reason = 'rejected' | 'network' */
function wrap(e) {
  const err = new Error(e?.message || 'submit failed')
  err.reason = e?.code === 'permission-denied' ? 'rejected' : 'network'
  return err
}

export const firebaseScores = {
  async submit({ user, gameId, score, mode, meta = {} }) {
    const { db, fsMod } = await getFirebase()
    const { doc, runTransaction, serverTimestamp } = fsMod
    const board = boardId(gameId, mode)
    const ref = doc(db, 'leaderboards', board, 'entries', user.id)
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (snap.exists() && snap.data().score >= score) return // 최고점만 갱신
        tx.set(ref, { uid: user.id, nickname: user.nickname, score, meta, updatedAt: serverTimestamp() })
      })
    } catch (e) {
      throw wrap(e)
    }
    invalidate(board)
  },

  async top({ gameId, mode, limit = 20 }) {
    const board = boardId(gameId, mode)
    return cached(`${board}|top|${limit}`, async () => {
      const { db, fsMod } = await getFirebase()
      const { collection, query, orderBy, limit: lim, getDocs } = fsMod
      const q = query(collection(db, 'leaderboards', board, 'entries'), orderBy('score', 'desc'), lim(limit))
      const snap = await getDocs(q)
      return snap.docs.map((d) => {
        const v = d.data()
        return { userId: d.id, nickname: v.nickname, score: v.score, createdAt: v.updatedAt?.toDate?.().toISOString() }
      })
    })
  },

  // 내 최고점 → 나보다 높은 사람 수 + 1 (집계 쿼리라 문서를 다 읽지 않음)
  async myRank({ userId, gameId, mode }) {
    const board = boardId(gameId, mode)
    return cached(`${board}|rank|${userId}`, async () => {
      const { db, fsMod } = await getFirebase()
      const { doc, getDoc, collection, query, where, getCountFromServer } = fsMod
      const mine = await getDoc(doc(db, 'leaderboards', board, 'entries', userId))
      if (!mine.exists()) return null
      const score = mine.data().score
      const higher = await getCountFromServer(query(collection(db, 'leaderboards', board, 'entries'), where('score', '>', score)))
      return { rank: higher.data().count + 1, score }
    })
  },
}
