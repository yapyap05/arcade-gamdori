<script setup>
import { ref, watch, onMounted } from 'vue'
import { rankingService } from '../services/ranking'
import { useAuthStore } from '../stores/auth'

const props = defineProps({
  gameId: { type: String, required: true },
  limit: { type: Number, default: 10 },
  refreshKey: { type: Number, default: 0 }
})

const auth = useAuthStore()
const rows = ref([])
const loading = ref(true)
const failed = ref(false)

async function load() {
  loading.value = true
  failed.value = false
  try {
    rows.value = await rankingService.getTop(props.gameId, props.limit)
  } catch (e) {
    console.warn('[ranking] 불러오기 실패', e)
    failed.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => [props.gameId, props.refreshKey], load)
const medal = (rank) => ['🥇', '🥈', '🥉'][rank - 1] || rank
</script>

<template>
  <div class="rank">
    <p v-if="loading" class="muted state">불러오는 중…</p>
    <p v-else-if="failed" class="state error">랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
    <p v-else-if="!rows.length" class="muted state">아직 기록이 없어요. 첫 번째 기록의 주인공이 되어 보세요.</p>
    <ol v-else class="list">
      <li v-for="r in rows" :key="r.userId" :class="{ me: auth.user && auth.user.id === r.userId }">
        <span class="no">{{ medal(r.rank) }}</span>
        <span class="name">{{ r.nickname }}</span>
        <span class="score">{{ r.score.toLocaleString() }}</span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
li { display: grid; grid-template-columns: 36px 1fr auto; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 12px; background: var(--bg); }
li.me { outline: 2px solid var(--accent); }
.no { font-weight: 800; text-align: center; }
.name { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.score { font-variant-numeric: tabular-nums; font-weight: 800; color: var(--gold); }
.state { margin: 0; padding: 12px 4px; }
.error { color: var(--danger); font-weight: 700; }
</style>
