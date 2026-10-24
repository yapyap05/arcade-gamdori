const KEY = 'gamdori:scores'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}
const write = (data) => localStorage.setItem(KEY, JSON.stringify(data))

export default {
  async submitScore({ gameId, score, user }) {
    const db = read()
    const board = (db[gameId] ||= {})
    const prev = board[user.id]?.score ?? 0
    const improved = score > prev
    if (improved || !board[user.id]) {
      board[user.id] = { nickname: user.nickname, score, at: Date.now() }
      write(db)
    }
    return { best: Math.max(prev, score), improved }
  },

  async getTop(gameId, limit = 10) {
    const board = read()[gameId] || {}
    return Object.entries(board)
      .map(([userId, v]) => ({ userId, nickname: v.nickname, score: v.score, at: v.at }))
      .sort((a, b) => b.score - a.score || a.at - b.at)
      .slice(0, limit)
      .map((r, i) => ({ rank: i + 1, ...r }))
  },

  async getMyBest(gameId, user) {
    return read()[gameId]?.[user.id]?.score ?? null
  }
}
