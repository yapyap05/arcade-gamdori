<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'
import LoginModal from './components/LoginModal.vue'
import OrientationGuard from './components/OrientationGuard.vue'

const route = useRoute()
const showTabs = computed(() => route.meta.tabs === true)

// 스크롤 영역이 window 가 아니라 .content 이므로 화면 이동 시 직접 맨 위로
const content = ref(null)
watch(() => route.fullPath, () => content.value?.scrollTo(0, 0))

/**
 * 터치 기기(태블릿·모바일)가 가로로 놓이면 앱을 흐리게 하고 세로 모드 안내.
 * 화면 비율(orientation 미디어쿼리)이 아닌 기기 방향으로 판단 → 모바일 키보드가 올라와도 오작동하지 않음
 */
const landscape = ref(false)
const touchMq = window.matchMedia('(hover: none) and (pointer: coarse)')
function checkOrientation() {
  const type = screen.orientation?.type
  const isLandscape = type ? type.startsWith('landscape') : Math.abs(window.orientation || 0) === 90
  landscape.value = touchMq.matches && isLandscape
}
onMounted(() => {
  checkOrientation()
  screen.orientation?.addEventListener?.('change', checkOrientation)
  window.addEventListener('orientationchange', checkOrientation)
  touchMq.addEventListener?.('change', checkOrientation)
})
onBeforeUnmount(() => {
  screen.orientation?.removeEventListener?.('change', checkOrientation)
  window.removeEventListener('orientationchange', checkOrientation)
  touchMq.removeEventListener?.('change', checkOrientation)
})
</script>

<template>
  <div class="frame" :class="{ blurred: landscape }" :inert="landscape || undefined">
    <main ref="content" class="content">
      <RouterView />
    </main>
    <TabBar v-if="showTabs" />
  </div>
  <LoginModal />
  <OrientationGuard v-if="landscape" />
</template>

<style scoped>
/* 모바일: 화면 전체 / 태블릿 세로: 가운데 열 / 데스크탑: 폰 모양 프레임 */
.frame {
  position: relative;
  display: flex; flex-direction: column;
  width: 100%; max-width: 480px; height: 100vh; height: 100dvh;
  margin: 0 auto; overflow: hidden;
  background: var(--bg); color: var(--text);
  padding-top: env(safe-area-inset-top);
  transition: filter 0.2s;
}
.content { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
.frame.blurred { filter: blur(8px); pointer-events: none; user-select: none; }

@media (hover: hover) and (pointer: fine) and (min-width: 600px) {
  .frame {
    max-width: 430px;
    height: min(932px, calc(100dvh - 48px));
    margin: 24px auto;
    border-radius: 44px;
    border: var(--frame-border);
    box-shadow: var(--frame-shadow);
  }
}
</style>
