<script setup>
import { computed } from 'vue'
import { games, categoryLabel } from '../games/registry'
import { useRecordsStore } from '../stores/records'

const records = useRecordsStore()
const logo = `${import.meta.env.BASE_URL}logo.png`
const fmtDate = (t) => new Date(t).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })

const rows = computed(() =>
  games.map((g) => {
    const r = records.best[g.id] || {}
    return { game: g, casual: r.casual, competitive: r.competitive }
  }),
)
const played = computed(() => rows.value.filter((r) => r.casual || r.competitive))
const unplayed = computed(() => rows.value.filter((r) => !r.casual && !r.competitive))
</script>

<template>
  <div class="screen">
    <header class="screen-head">
      <h1 class="brand">기록</h1>
      <span class="count muted">{{ played.length }} / {{ games.length }} 게임 플레이</span>
    </header>
    <ul v-if="played.length" class="panel list">
      <li v-for="r in played" :key="r.game.id">
        <RouterLink :to="`/game/${r.game.id}`" class="row">
          <span class="grow col">
            <span class="nm">{{ r.game.title }}</span>
            <span class="cat muted">{{ categoryLabel(r.game.category) }}</span>
          </span>
          <span class="scores">
            <span v-if="r.casual" class="sc"><span class="lbl muted">캐주얼</span><span class="num">{{ r.casual.score.toLocaleString() }}</span><span class="at muted">{{ fmtDate(r.casual.at) }}</span></span>
            <span v-if="r.competitive" class="sc"><span class="lbl muted">경쟁</span><span class="num">{{ r.competitive.score.toLocaleString() }}</span><span class="at muted">{{ fmtDate(r.competitive.at) }}</span></span>
          </span>
        </RouterLink>
      </li>
    </ul>
    <div v-else class="empty">
      <img :src="logo" alt="" width="72" height="72" class="logo" />
      <p class="muted">아직 기록이 없어요</p>
    </div>

    <template v-if="unplayed.length">
      <h2 class="section-label">아직 안 해 본 게임</h2>
      <div class="chips wrap">
        <RouterLink v-for="r in unplayed" :key="r.game.id" :to="`/game/${r.game.id}`" class="chip">{{ r.game.title }}</RouterLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.count { font-size: 13px; }
.list { list-style: none; margin: 0; padding: 0 16px; }
.list li { border-bottom: 1px solid var(--line-soft); }
.list li:last-child { border-bottom: 0; }
.row { display: flex; align-items: center; gap: 12px; min-height: 64px; padding: 10px 0; }
.col { display: flex; flex-direction: column; gap: 2px; }
.nm { font-size: 15px; font-weight: 700; }
.cat { font-size: 12px; }
.scores { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
.sc { display: flex; align-items: baseline; gap: 6px; }
.lbl, .at { font-size: 11px; }
.sc .num { font-size: 15px; }
.empty { display: flex; flex-direction: column; align-items: center; gap: 8px; margin: 24px 0; font-size: 14px; }
.empty p { margin: 0; }
.logo { width: 72px; height: 72px; border-radius: 50%; border: var(--bw) solid var(--bc); }
.chips.wrap { flex-wrap: wrap; overflow: visible; margin: 0; padding: 0; }
.chips.wrap .chip { display: inline-flex; align-items: center; }
</style>
