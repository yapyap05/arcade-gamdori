<script setup>
import Icon from './Icon.vue'

const TABS = [
  { to: '/', name: 'home', icon: 'home', label: '홈' },
  { to: '/ranking', name: 'ranking', icon: 'rank', label: '랭킹' },
  { to: '/records', name: 'records', icon: 'rec', label: '기록' },
  { to: '/settings', name: 'settings', icon: 'set', label: '설정' },
]
</script>

<template>
  <nav class="tabs" aria-label="하단 메뉴">
    <RouterLink v-for="t in TABS" :key="t.name" :to="t.to" class="tab" exact-active-class="on">
      <Icon :name="t.icon" />{{ t.label }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.tabs {
  flex: none; display: flex;
  height: calc(72px + env(safe-area-inset-bottom));
  padding: 0 8px env(safe-area-inset-bottom);
  border-top: var(--bw) solid var(--tab-line); background: var(--tab-bg);
}
.tab {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  font-size: 11px; font-weight: 700; color: var(--tab-ink);
}
.tab.on { color: var(--tab-on); }
</style>
