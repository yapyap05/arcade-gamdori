// 더미 랭킹: Firestore 'leaderboards/{게임}_{모드}/entries/{uid}' 구조와 같은 의미로 localStorage에 저장.
const KEY = 'gamdori:mock-boards'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
const board = (gameId, mode) => `${gameId}_${mode}`

export const mockScores = {
  async submit({ user, gameId, score, mode, meta = {} }) {
    const all = read()
    const b = (all[board(gameId, mode)] ||= {})
    if (b[user.id] && b[user.id].score >= score) return // 최고점만 유지
    b[user.id] = { userId: user.id, nickname: user.nickname, score, meta, createdAt: new Date().toISOString() }
    localStorage.setItem(KEY, JSON.stringify(all))
  },
  async top({ gameId, mode, limit = 20 }) {
    const b = read()[board(gameId, mode)] || {}
    return Object.values(b).sort((a, c) => c.score - a.score).slice(0, limit)
  },
  async myRank({ userId, gameId, mode }) {
    const rows = await mockScores.top({ gameId, mode, limit: 100000 })
    const i = rows.findIndex((r) => r.userId === userId)
    return i < 0 ? null : { rank: i + 1, score: rows[i].score }
  },
}
