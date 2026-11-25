<script setup>
import { ref, computed, watch } from 'vue'
import { scoreService } from '../services/scoreService'
import { useAuthStore } from '../stores/auth'

const props = defineProps({
  gameId: { type: String, required: true },
  mode: { type: String, default: 'competitive' },
  limit: { type: Number, default: 10 }, // 처음 보여 줄 인원
  max: { type: Number, default: 0 }, // 0보다 크면 '더 보기'로 이 인원까지 (limit 단위로 늘어남)
  refreshKey: { type: Number, default: 0 },
  variant: { type: String, default: 'list' }, // 'podium' = 1~3위 시상대 + 목록 + 내 순위 바 / 'list' = 간단 목록
})
const auth = useAuthStore()
const rows = ref([])
const mine = ref(null) // { rank, score }
const loading = ref(false)
const failed = ref(false)
const shown = ref(props.limit)
const canMore = computed(() => props.max > shown.value && rows.value.length >= shown.value)

// 게임·모드를 빠르게 바꿔도 마지막 요청 결과만 반영
let seq = 0
async function load() {
  const my = ++seq
  loading.value = true
  failed.value = false
  try {
    const top = await scoreService.top({ gameId: props.gameId, mode: props.mode, limit: shown.value })
    const rank = auth.isLoggedIn
      ? await scoreService.myRank({ userId: auth.user.id, gameId: props.gameId, mode: props.mode }).catch(() => null)
      : null
    if (my !== seq) return
    rows.value = top
    mine.value = rank
  } catch {
    if (my === seq) failed.value = true
  } finally {
    if (my === seq) loading.value = false
  }
}
watch(() => [props.gameId, props.mode], () => (shown.value = props.limit))
watch(() => [props.gameId, props.mode, props.refreshKey, auth.user?.id, auth.isLoggedIn, shown.value], load, { immediate: true })
const more = () => (shown.value = Math.min(props.max, shown.value + props.limit))

const podium = computed(() => {
  if (props.variant !== 'podium') return []
  const [a, b, c] = rows.value
  return [
    b && { ...b, rank: 2, cls: 'p2', h: 84 },
    a && { ...a, rank: 1, cls: 'p1', h: 110 },
    c && { ...c, rank: 3, cls: 'p3', h: 64 },
  ].filter(Boolean)
})
const listRows = computed(() =>
  rows.value.map((r, i) => ({ ...r, rank: i + 1 })).slice(props.variant === 'podium' ? 3 : 0),
)
const isMe = (r) => r.userId === auth.user?.id
</script>

<template>
  <div class="lb" :class="`v-${variant}`" aria-live="polite">
    <p v-if="loading && !rows.length" class="state muted">불러오는 중…</p>
    <p v-else-if="failed" class="state muted">랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
    <p v-else-if="!rows.length" class="state muted">아직 기록이 없어요. 첫 번째 주인공이 되어 보세요!</p>
    <template v-else>
      <div v-if="podium.length" class="podium">
        <div v-for="p in podium" :key="p.userId" class="pod">
          <span class="pn" :class="{ me: isMe(p) }">{{ p.nickname }}</span>
          <span class="ps num">{{ p.score.toLocaleString() }}</span>
          <div class="bar num" :class="p.cls" :style="{ height: `${p.h}px` }">{{ p.rank }}</div>
        </div>
      </div>
      <ol v-if="listRows.length" class="panel list">
        <li v-for="r in listRows" :key="r.userId" :class="{ me: isMe(r) }">
          <span class="rk num">{{ r.rank }}</span>
          <span class="grow name">{{ r.nickname }}</span>
          <span class="num">{{ r.score.toLocaleString() }}</span>
        </li>
      </ol>
      <button v-if="canMore" type="button" class="more" :disabled="loading" @click="more">{{ loading ? '불러오는 중…' : '더 보기' }}</button>
    </template>

    <div v-if="mine" class="mine">
      <span class="num">{{ mine.rank }}위</span>
      <span class="grow">나 ({{ auth.user?.nickname }})</span>
      <span class="num">{{ mine.score.toLocaleString() }}</span>
    </div>
    <p v-else-if="!auth.isLoggedIn && !loading" class="login muted">
      <button type="button" class="link" @click="auth.openLogin()">로그인</button>하면 내 순위를 볼 수 있어요.
    </p>
  </div>
</template>

<style scoped>
.lb { display: flex; flex-direction: column; gap: 14px; }
.more {
  align-self: center; height: 40px; padding: 0 20px; border-radius: 999px; font-size: 14px; font-weight: 700;
  background: var(--surface); color: var(--text); border: var(--bw) solid var(--bc); box-shadow: var(--sh-sm);
}
.state { margin: 8px 0; font-size: 14px; text-align: center; }

.podium { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; align-items: end; }
.pod { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; }
.pn { max-width: 100%; font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pn.me { color: var(--accent); }
.ps { font-size: 12px; color: var(--muted); }
.bar {
  width: 100%; display: flex; justify-content: center; padding-top: 8px;
  border-radius: 14px 14px 6px 6px; border: var(--bw) solid var(--bc); box-shadow: var(--sh-sm);
  font-size: 24px; color: var(--pod-ink);
}
.p1 { background: var(--p1); color: var(--p1-ink); }
.p2 { background: var(--p2); }
.p3 { background: var(--p3); }

.list { list-style: none; margin: 0; padding: 0 14px; }
.list li { min-height: 48px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--line-soft); font-size: 15px; }
.list li:last-child { border-bottom: 0; }
.list li.me { font-weight: 700; color: var(--accent); }
.rk { width: 24px; color: var(--muted); }
.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.mine {
  display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 0 16px;
  border-radius: var(--r-md); background: var(--me-bg); color: var(--me-ink);
  border: var(--bw) solid var(--me-bc); box-shadow: var(--sh-sm); font-weight: 700;
}
.v-podium .mine { position: sticky; bottom: 12px; }
.login { margin: 0; font-size: 14px; text-align: center; }
.link { border: 0; background: none; padding: 0; color: var(--accent); font-weight: 700; text-decoration: underline; }
</style>
