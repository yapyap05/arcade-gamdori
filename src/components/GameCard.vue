<script setup>
defineProps({ game: { type: Object, required: true } })
</script>

<template>
  <router-link :to="`/play/${game.id}`" class="card" :class="{ pending: game.status === 'pending' }">
    <div class="art" :style="{ '--h': game.hue }">
      <span class="emoji" aria-hidden="true">{{ game.emoji }}</span>
      <span v-if="game.status === 'pending'" class="tag">이전 준비 중</span>
    </div>
    <div class="meta">
      <strong class="title">{{ game.title }}</strong>
      <span class="desc muted">{{ game.desc }}</span>
    </div>
  </router-link>
</template>

<style scoped>
.card { display: block; border-radius: 20px; background: var(--surface); overflow: hidden; box-shadow: var(--shadow); transition: transform 0.15s ease; }
.card:hover { transform: translateY(-3px); }
.art {
  aspect-ratio: 1 / 1; display: grid; place-items: center; position: relative;
  background: linear-gradient(145deg, hsl(var(--h) 85% 60%), hsl(calc(var(--h) + 40) 80% 38%));
}
.emoji { font-size: clamp(3rem, 9vw, 4.5rem); filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.3)); }
.tag {
  position: absolute; left: 10px; top: 10px; padding: 3px 10px; border-radius: 999px;
  background: rgba(15, 18, 48, 0.78); color: #fff; font-size: 0.75rem; font-weight: 700;
}
.pending .art { filter: saturate(0.6); }
.meta { padding: 12px 14px 14px; display: grid; gap: 2px; }
.title { font-size: 1rem; }
.desc { font-size: 0.8125rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
