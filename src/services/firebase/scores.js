import { getFirebase } from './client'

// Firestore 구조: leaderboards/{gameId}_{mode}/entries/{uid} = 유저별 최고점 1건
const boardId = (gameId, mode) => `${gameId}_${mode}`

export const firebaseScores = {
  async submit({ user, gameId, score, mode, meta = {} }) {
    const { db, fsMod } = await getFirebase()
    const { doc, runTransaction, serverTimestamp } = fsMod
    const ref = doc(db, 'leaderboards', boardId(gameId, mode), 'entries', user.id)
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (snap.exists() && snap.data().score >= score) return // 최고점만 갱신
      tx.set(ref, { uid: user.id, nickname: user.nickname, score, meta, updatedAt: serverTimestamp() })
    })
  },

  async top({ gameId, mode, limit = 20 }) {
    const { db, fsMod } = await getFirebase()
    const { collection, query, orderBy, limit: lim, getDocs } = fsMod
    const q = query(collection(db, 'leaderboards', boardId(gameId, mode), 'entries'), orderBy('score', 'desc'), lim(limit))
    const snap = await getDocs(q)
    return snap.docs.map((d) => {
      const v = d.data()
      return { userId: d.id, nickname: v.nickname, score: v.score, createdAt: v.updatedAt?.toDate?.().toISOString() }
    })
  },

  // 내 최고점 → 나보다 높은 사람 수 + 1 (집계 쿼리라 문서를 다 읽지 않음)
  async myRank({ userId, gameId, mode }) {
    const { db, fsMod } = await getFirebase()
    const { doc, getDoc, collection, query, where, getCountFromServer } = fsMod
    const mine = await getDoc(doc(db, 'leaderboards', boardId(gameId, mode), 'entries', userId))
    if (!mine.exists()) return null
    const score = mine.data().score
    const higher = await getCountFromServer(
      query(collection(db, 'leaderboards', boardId(gameId, mode), 'entries'), where('score', '>', score)),
    )
    return { rank: higher.data().count + 1, score }
  },
}
