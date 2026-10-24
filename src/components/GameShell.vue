<script setup>
import { ref, watch } from 'vue'
import RankingTable from './RankingTable.vue'
import { useAuthStore } from '../stores/auth'
import { rankingService } from '../services/ranking'

const props = defineProps({ game: { type: Object, required: true } })
const auth = useAuthStore()

const score = ref(0)
const best = ref(null)
const finalScore = ref(null)       // 끝난 판의 점수
const submitState = ref('idle')    // idle | submitting | done | error
const improved = ref(false)
const refreshKey = ref(0)
const gameRef = ref(null)

async function loadBest() {
  if (!auth.user || !props.game.rankable) { best.value = null; return }
  try { best.value = await rankingService.getMyBest(props.game.id, auth.user) } catch { /* 표시만 생략 */ }
}
watch(() => auth.user?.id, loadBest, { immediate: true })

function onGameOver(s) {
  finalScore.value = s
  submit()
}

async function submit() {
  if (!props.game.rankable || finalScore.value == null) return
  if (!auth.user) { submitState.value = 'idle'; return }
  submitState.value = 'submitting'
  try {
    const res = await rankingService.submitScore({ gameId: props.game.id, score: finalScore.value, user: auth.user })
    improved.value = res.improved
    best.value = res.best
    submitState.value = 'done'
    refreshKey.value++
  } catch (e) {
    console.warn('[ranking] 제출 실패', e)
    submitState.value = 'error'
  }
}

// 게임 종료 후 로그인하면 방금 점수를 바로 제출합니다.
watch(() => auth.user, (u) => { if (u && finalScore.value != null && submitState.value === 'idle') submit() })

function restart() {
  finalScore.value = null
  submitState.value = 'idle'
  score.value = 0
  gameRef.value?.restart?.()
}
defineExpose({ restart })
</script>

<template>
  <section class="shell">
    <div class="stage panel">
      <div class="topline">
        <div>
          <h1>{{ game.title }}</h1>
          <p class="muted">{{ game.desc }}</p>
        </div>
        <div class="stats">
          <div><span class="muted">점수</span><b>{{ score.toLocaleString() }}</b></div>
          <div v-if="game.rankable"><span class="muted">내 최고</span><b>{{ best == null ? '-' : best.toLocaleString() }}</b></div>
        </div>
      </div>

      <div class="play">
        <slot :report-score="(s) => (score = s)" :report-game-over="onGameOver" :bind-game="(el) => (gameRef = el)" />
      </div>

      <div v-if="finalScore != null" class="result" role="status">
        <p class="big">이번 점수 <b>{{ finalScore.toLocaleString() }}</b></p>
        <template v-if="game.rankable">
          <p v-if="!auth.isLoggedIn" class="muted">
            로그인하면 이 점수가 랭킹에 올라가요.
            <button class="btn small" type="button" @click="auth.openLogin()">로그인하고 기록하기</button>
          </p>
          <p v-else-if="submitState === 'submitting'" class="muted">기록하는 중…</p>
          <p v-else-if="submitState === 'done'">
            {{ improved ? '새 최고 기록이에요! 랭킹에 반영했어요.' : '기존 최고 기록이 더 높아서 랭킹은 그대로예요.' }}
          </p>
          <p v-else-if="submitState === 'error'" class="err">
            기록하지 못했어요.
            <button class="btn small ghost" type="button" @click="submit">다시 시도</button>
          </p>
        </template>
        <button class="btn" type="button" @click="restart">다시 하기</button>
      </div>
    </div>

    <aside v-if="game.rankable" class="side panel">
      <div class="side-head">
        <h2>랭킹 TOP 10</h2>
        <router-link class="muted more" :to="{ name: 'ranking', params: { id: game.id } }">전체 보기</router-link>
      </div>
      <RankingTable :game-id="game.id" :refresh-key="refreshKey" />
    </aside>
  </section>
</template>

<style scoped>
.shell { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; align-items: start; }
.stage { padding: 20px; }
.topline { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
h1 { margin: 0; font-size: 1.5rem; letter-spacing: -0.02em; }
.topline p { margin: 2px 0 0; }
.stats { display: flex; gap: 12px; }
.stats div { background: var(--bg); border-radius: 14px; padding: 8px 16px; min-width: 96px; display: grid; }
.stats span { font-size: 0.75rem; }
.stats b { font-size: 1.25rem; font-variant-numeric: tabular-nums; color: var(--gold); }
.play { display: grid; place-items: center; }
.result { margin-top: 16px; padding: 16px; border-radius: 16px; background: var(--bg); display: grid; gap: 8px; justify-items: start; }
.result p { margin: 0; }
.big b { font-size: 1.5rem; color: var(--gold); }
.err { color: var(--danger); font-weight: 700; }
.side { padding: 18px; }
.side-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
.side h2 { margin: 0; font-size: 1.05rem; }
.more { font-size: 0.8125rem; }
@media (max-width: 900px) { .shell { grid-template-columns: 1fr; } }
</style>
