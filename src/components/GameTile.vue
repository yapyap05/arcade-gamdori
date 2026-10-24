<script setup>
defineProps({ game: { type: Object, required: true } })
</script>

<template>
  <RouterLink :to="`/game/${game.id}`" class="tile" draggable="false" @contextmenu.prevent :style="{ '--a': game.colors[0], '--b': game.colors[1] }">
    <div class="art"><span class="emoji" aria-hidden="true">{{ game.emoji }}</span></div>
    <div class="meta">
      <div class="row">
        <h3>{{ game.title }}</h3>
        <span v-if="game.isNew" class="chip new">NEW</span>
        <span v-else-if="game.ranked" class="chip">랭킹</span>
      </div>
      <p class="muted">{{ game.desc }}</p>
    </div>
  </RouterLink>
</template>

<style scoped>
.tile { display: block; background: var(--surface); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); transition: transform 0.15s; }
.tile:hover { transform: translateY(-4px); }
.art { aspect-ratio: 4 / 3; display: grid; place-items: center; background: linear-gradient(135deg, var(--a), var(--b)); }
.emoji { font-size: 64px; filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.25)); }
.meta { padding: 12px 14px 14px; }
.row { display: flex; align-items: center; gap: 8px; }
h3 { margin: 0; font-size: 16px; flex: 1; }
p { margin: 2px 0 0; font-size: 13px; }
.chip { font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 999px; background: var(--surface-2); }
.chip.new { background: var(--cta); color: var(--cta-text); }
@media (max-width: 700px) {
  .emoji { font-size: 48px; }
  .meta { padding: 10px 10px 12px; }
  h3 { font-size: 14px; }
  p { font-size: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .chip { font-size: 10px; padding: 1px 6px; }
}

@media (max-width: 599px) {
  .art { aspect-ratio: 1 / 0.85; }
  .emoji { font-size: 46px; }
  .meta { padding: 8px 10px 10px; }
  h3 { font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  p { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chip { font-size: 10px; padding: 1px 6px; }
}
</style>
