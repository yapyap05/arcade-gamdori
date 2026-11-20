import { createRouter, createWebHashHistory } from 'vue-router'

// meta.tabs: 하단 탭 바 표시 여부 (게임 화면은 숨김)
export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue'), meta: { tabs: true } },
    { path: '/game/:id', name: 'game', component: () => import('../views/GameView.vue'), props: true },
    { path: '/ranking', name: 'ranking', component: () => import('../views/RankingView.vue'), meta: { tabs: true } },
    { path: '/records', name: 'records', component: () => import('../views/RecordsView.vue'), meta: { tabs: true } },
    { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue'), meta: { tabs: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
