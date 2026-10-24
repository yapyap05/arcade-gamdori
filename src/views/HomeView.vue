<script setup>
import { ref, computed } from 'vue'
import { games, CATEGORIES } from '../games/registry'
import GameTile from '../components/GameTile.vue'

const category = ref('all')
const query = ref('')

const filtered = computed(() =>
  games.filter(
    (g) =>
      (category.value === 'all' || g.category === category.value) &&
      (g.title + g.desc).toLowerCase().includes(query.value.trim().toLowerCase()),
  ),
)
</script>

<template>
  <section class="top">
    <div class="chips" role="tablist">
      <button v-for="c in CATEGORIES" :key="c.id" class="chip" :class="{ on: category === c.id }" role="tab" :aria-selected="category === c.id" @click="category = c.id">
        {{ c.label }}
      </button>
    </div>
    <input v-model="query" class="search" type="search" placeholder="게임 검색" aria-label="게임 검색" />
  </section>

  <section v-if="filtered.length" class="grid">
    <GameTile v-for="g in filtered" :key="g.id" :game="g" />
  </section>
  <p v-else class="muted empty">조건에 맞는 게임이 없어요. 다른 카테고리를 선택해 보세요.</p>
</template>

<style scoped>
.top { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { border: 0; padding: 8px 16px; border-radius: 999px; font-weight: 700; background: var(--surface); box-shadow: var(--shadow); }
.chip.on { background: var(--accent); color: var(--accent-text); }
.search { padding: 10px 16px; border-radius: 999px; border: 2px solid var(--line); background: var(--surface); min-width: 220px; }
.search:focus { border-color: var(--accent); outline: none; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
.empty { text-align: center; padding: 60px 0; }

/* 모바일: 한 줄에 카드 2개 (태블릿 이상은 기존 자동 배치) */
@media (max-width: 599px) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .search { width: 100%; min-width: 0; }
  .chips { flex-wrap: nowrap; overflow-x: auto; width: 100%; padding-bottom: 4px; scrollbar-width: none; }
  .chips::-webkit-scrollbar { display: none; }
  .chip { flex: none; }
}
@media (max-width: 700px) {
  .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .search { min-width: 0; width: 100%; }
  .top { gap: 10px; }
  .chips { flex-wrap: nowrap; overflow-x: auto; max-width: 100%; padding-bottom: 4px; }
  .chip { flex: none; }
}
@media (max-width: 520px) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
