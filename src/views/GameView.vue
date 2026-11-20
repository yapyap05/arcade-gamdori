<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { getGame } from '../games/registry'
import { TUTORIALS } from '../games/tutorials'
import { provideGameCtx } from '../games/shared/context'
import { autoPauseOn } from '../games/shared/prefs'
import { useAuthStore } from '../stores/auth'
import { useRecordsStore } from '../stores/records'
import { scoreService } from '../services/scoreService'
import Leaderboard from '../components/Leaderboard.vue'
import Icon from '../components/Icon.vue'
import TutorialSheet from '../components/TutorialSheet.vue'

const props = defineProps({ id: String })
const router = useRouter()
const auth = useAuthStore()
const records = useRecordsStore()

const game = computed(() => getGame(props.id))
const ctx = provideGameCtx(game.value)
watch(game, (g) => { ctx.game = g; ctx.paused = false; ctx.quitting = false })

// 길게 누를 때 뜨는 브라우저 메뉴(복사/공유/키보드 도움말 등) 차단. 입력창은 붙여넣기 메뉴가 필요하니 제외
const blockMenu = (e) => { if (!/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) e.preventDefault() }
const mode = ref('casual')
const runKey = ref(0) // 바꾸면 게임을 처음 상태로 다시 마운트
const refreshKey = ref(0)
const message = ref('')

function selectMode(next) {
  if (next === 'competitive' && !auth.isLoggedIn) {
    auth.openLogin()
    return
  }
  mode.value = next
}

function goBack() {
  if (window.history.state?.back) router.back()
  else router.push('/')
}

/* ───── 튜토리얼: 게임별 첫 진입 시 1회 ───── */
const SEEN_KEY = 'gamdori:tutorial-seen'
const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || [] } catch { return [] } }
const steps = computed(() => TUTORIALS[props.id] ?? [])
const tutorialOpen = ref(false)
watch(() => props.id, (id) => { tutorialOpen.value = !!TUTORIALS[id] && !readSeen().includes(id) }, { immediate: true })
function openTutorial() {
  pause()
  tutorialOpen.value = true
}
function closeTutorial() {
  tutorialOpen.value = false
  const seen = readSeen()
  if (!seen.includes(props.id)) {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, props.id])) } catch {}
  }
}

/* ───── 일시정지 (공통 타이머 기반으로 이전된 게임만: registry 의 pausable) ───── */
const canPause = computed(() => ctx.playing && !!game.value?.pausable)
const pause = () => { if (canPause.value) ctx.paused = true }
const resume = () => { ctx.paused = false }
function quitFromPause() {
  ctx.paused = false
  ctx.quitting = false
  runKey.value++ // 그만하기 → 기록 없이 처음 화면으로
}
function onVisibility() {
  if (document.hidden && autoPauseOn.value) pause()
}
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onVisibility)
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pagehide', onVisibility)
})

/* ───── 점수 저장 ───── */
async function onGameOver({ score, meta }) {
  message.value = ''
  if (ctx.quitting) { ctx.quitting = false; return } // 그만하기 → 기록하지 않음
  score = Math.floor(score)
  if (!(score > 0)) return
  const isBest = records.submit(game.value.id, mode.value, score)
  if (!auth.isLoggedIn) {
    message.value = `${isBest ? '내 최고 기록! ' : ''}로그인하면 이 기록을 랭킹에 남길 수 있어요.`
    return
  }
  try {
    await scoreService.submit({ user: auth.user, gameId: game.value.id, score, mode: mode.value, meta })
    message.value = `${score.toLocaleString()}점 저장 완료!${isBest ? ' 내 최고 기록이에요.' : ''}`
    refreshKey.value++
  } catch {
    message.value = '기록 저장에 실패했어요. 네트워크를 확인해 주세요.'
  }
}

if (!getGame(props.id)) router.replace('/')
</script>

<template>
  <div v-if="game" class="screen">
    <header class="screen-head">
      <button class="icon-btn" aria-label="뒤로" @click="goBack"><Icon name="back" /></button>
      <h1 class="title">{{ game.title }}</h1>
      <div class="right">
        <button class="icon-btn" aria-label="플레이 방법" @click="openTutorial"><Icon name="help" /></button>
        <button v-if="canPause" class="icon-btn" aria-label="일시정지" @click="pause"><Icon name="pause" /></button>
      </div>
    </header>

    <div class="seg" role="tablist" aria-label="게임 모드">
      <button role="tab" :aria-selected="mode === 'casual'" :class="{ on: mode === 'casual' }" :disabled="ctx.playing" @click="selectMode('casual')">캐주얼</button>
      <button role="tab" :aria-selected="mode === 'competitive'" :class="{ on: mode === 'competitive' }" :disabled="ctx.playing" @click="selectMode('competitive')">
        {{ auth.isLoggedIn ? '경쟁' : '경쟁 · 로그인 필요' }}
      </button>
    </div>

    <section class="stage game-stage" @contextmenu="blockMenu">
      <component :is="game.component" :key="`${mode}-${runKey}`" :mode="mode" @gameover="onGameOver" />
      <div v-if="ctx.paused" class="paused" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <div class="card">
          <h2 id="pause-title">일시정지</h2>
          <button type="button" class="btn btn-primary" @click="resume">계속하기</button>
          <button type="button" class="btn" @click="quitFromPause">그만하기</button>
        </div>
      </div>
    </section>

    <p v-if="message" class="msg" role="status">{{ message }}</p>

    <section class="board-sec" aria-labelledby="lb-title">
      <div class="sec-head">
        <h2 id="lb-title" class="section-title">{{ mode === 'competitive' ? '경쟁 랭킹' : '캐주얼 랭킹' }} TOP 5</h2>
        <RouterLink to="/ranking" class="more">전체 보기</RouterLink>
      </div>
      <Leaderboard :game-id="game.id" :mode="mode" :limit="5" :refresh-key="refreshKey" />
    </section>

    <TutorialSheet v-if="tutorialOpen && steps.length" :game="game" :steps="steps" @close="closeTutorial" />
  </div>
</template>

<style scoped>
.title {
  margin: 0; flex: 1; min-width: 0;
  font-family: var(--font-display); font-weight: var(--display-weight); font-size: 20px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.right { display: flex; gap: 8px; }
.seg button:disabled { cursor: default; }
.stage {
  position: relative; padding: 12px; border-radius: var(--r-md);
  background: var(--surface); border: var(--bw) solid var(--bc); box-shadow: var(--sh);
}
.paused {
  position: absolute; inset: 0; z-index: 20; border-radius: inherit;
  display: grid; place-items: center; padding: 16px; background: var(--bg);
}
.paused .card {
  width: min(280px, 100%); display: flex; flex-direction: column; gap: 10px; padding: 22px;
  border-radius: var(--r-lg); background: var(--surface); border: var(--bw) solid var(--bc); box-shadow: var(--sh); text-align: center;
}
.paused h2 { margin: 0 0 6px; font-family: var(--font-display); font-weight: var(--display-weight); font-size: 24px; }
.paused .btn { height: 50px; }
.msg {
  margin: 0; padding: 12px 14px; border-radius: var(--r-md);
  background: var(--surface-2); border: var(--bw) solid var(--bc); font-size: 14px; font-weight: 600;
}
.board-sec { display: flex; flex-direction: column; gap: 10px; }
.sec-head { display: flex; justify-content: space-between; align-items: baseline; }
.section-title { margin: 0; font-size: 15px; font-weight: 700; }
.more { font-size: 13px; font-weight: 600; color: var(--accent); }
</style>
