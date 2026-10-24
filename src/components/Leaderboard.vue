<script setup>
import { ref, watch } from 'vue'
import { scoreService } from '../services/scoreService'
import { useAuthStore } from '../stores/auth'

const props = defineProps({
  gameId: { type: String, required: true },
  mode: { type: String, default: 'competitive' },
  limit: { type: Number, default: 10 },
  refreshKey: { type: Number, default: 0 },
})
const auth = useAuthStore()
const rows = ref([])
const mine = ref(null) // 내 최고 기록 { rank, score }
const loading = ref(false)
const failed = ref(false)

async function load() {
  loading.value = true
  failed.value = false
  try {
    rows.value = await scoreService.top({ gameId: props.gameId, mode: props.mode, limit: props.limit })
    mine.value = auth.user
      ? await scoreService.myRank({ userId: auth.user.id, gameId: props.gameId, mode: props.mode }).catch(() => null)
      : null
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}
watch(() => [props.gameId, props.mode, props.refreshKey, auth.user?.id], load, { immediate: true })
</script>

<template>
  <div class="lb">
    <p v-if="loading" class="muted state">불러오는 중…</p>
    <p v-else-if="failed" class="muted state">랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
    <p v-else-if="!rows.length" class="muted state">아직 기록이 없어요. 첫 번째 주인공이 되어 보세요!</p>
    <ol v-else>
      <li v-for="(r, i) in rows" :key="r.userId" :class="{ me: r.userId === auth.user?.id }">
        <span class="rank">{{ i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1 }}</span>
        <span class="name">{{ r.nickname }}</span>
        <b class="score">{{ r.score.toLocaleString() }}</b>
      </li>
    </ol>
    <p v-if="mine" class="mine">내 순위 <b>{{ mine.rank }}위</b> · {{ mine.score.toLocaleString() }}점</p>
    <p v-else-if="!auth.isLoggedIn && !loading" class="mine muted">
      <a href="#" @click.prevent="auth.openLogin()">로그인</a>하면 내 순위를 볼 수 있어요.
    </p>
  </div>
</template>

<style scoped>
ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
li { display: grid; grid-template-columns: 36px 1fr auto; align-items: center; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); }
li.me { outline: 2px solid var(--accent); }
.rank { text-align: center; font-weight: 800; }
.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.state { margin: 8px 0; font-size: 14px; }
.mine { margin: 12px 0 0; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); font-size: 14px; }
.mine a { color: var(--accent); font-weight: 700; text-decoration: underline; }
</style>
