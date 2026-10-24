<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getGame } from '../games/registry'
import { useAuthStore } from '../stores/auth'
import { scoreService } from '../services/scoreService'
import Leaderboard from '../components/Leaderboard.vue'
import { soundOn } from '../games/shared/sfx'

const props = defineProps({ id: String })
const router = useRouter()
const auth = useAuthStore()

// 길게 누를 때 뜨는 브라우저 메뉴(복사/공유/키보드 도움말 등) 차단. 입력창은 붙여넣기 메뉴가 필요하니 제외
const blockMenu = (e) => { if (!/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) e.preventDefault() }
const toggleSound = () => (soundOn.value = !soundOn.value)
const game = computed(() => getGame(props.id))
const mode = ref('casual')
const refreshKey = ref(0)
const message = ref('')

function selectMode(next) {
  if (next === 'competitive' && !auth.isLoggedIn) {
    auth.openLogin()
    return
  }
  mode.value = next
}

// 게임 컴포넌트가 gameover 이벤트로 점수를 넘기면 여기서 저장
async function onGameOver({ score, meta }) {
  message.value = ''
  if (score <= 0) return
  if (!auth.isLoggedIn) {
    message.value = '로그인하면 이 기록을 랭킹에 남길 수 있어요.'
    return
  }
  try {
    await scoreService.submit({ user: auth.user, gameId: game.value.id, score, mode: mode.value, meta })
    message.value = `${score.toLocaleString()}점 저장 완료!`
    refreshKey.value++
  } catch {
    message.value = '기록 저장에 실패했어요. 네트워크를 확인해 주세요.'
  }
}

if (!getGame(props.id)) router.replace('/')
</script>

<template>
  <template v-if="game">
    <div class="head">
      <RouterLink to="/" class="back">← 게임 목록</RouterLink>
      <h1>{{ game.emoji }} {{ game.title }}</h1>
      <button class="sound" :aria-pressed="soundOn" :aria-label="soundOn ? '효과음 끄기' : '효과음 켜기'" @click="toggleSound">{{ soundOn ? '🔊' : '🔇' }}</button>
    </div>

    <div class="layout">
      <section class="stage card game-stage" @contextmenu="blockMenu">
        <component :is="game.component" :key="mode" :mode="mode" @gameover="onGameOver" />
      </section>

      <aside class="side">
          <div class="seg">
            <button :class="{ on: mode === 'casual' }" @click="selectMode('casual')">캐주얼</button>
            <button :class="{ on: mode === 'competitive' }" @click="selectMode('competitive')">경쟁 🏆</button>
          </div>
          <div class="card box">
            <h2>{{ mode === 'competitive' ? '경쟁 랭킹' : '캐주얼 기록' }}</h2>
            <Leaderboard :game-id="game.id" :mode="mode" :refresh-key="refreshKey" />
          </div>
          <p v-if="message" class="msg" role="status">{{ message }}</p>
      </aside>
    </div>
  </template>
</template>

<style scoped>
.head { display: flex; align-items: baseline; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
h1 { margin: 0; font-size: 26px; }
.back { color: var(--muted); font-weight: 600; }
.layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; align-items: start; }
.stage { padding: 20px; display: grid; place-items: center; min-height: 520px; }
.sound { margin-left: auto; border: 0; background: var(--surface); border-radius: 999px; padding: 6px 12px; box-shadow: var(--shadow); }
.side { display: grid; gap: 14px; }
.box { padding: 16px; }
.box h2 { margin: 0 0 12px; font-size: 17px; }
.seg { display: flex; gap: 4px; background: var(--surface); padding: 4px; border-radius: 999px; box-shadow: var(--shadow); }
.seg button { flex: 1; border: 0; background: none; padding: 8px 12px; border-radius: 999px; font-weight: 700; }
.seg button.on { background: var(--accent); color: var(--accent-text); }
.msg { margin: 0; padding: 12px 14px; border-radius: 12px; background: var(--surface-2); font-weight: 600; }
@media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .stage { min-height: 0; padding: 12px; } }
</style>
