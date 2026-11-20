<script setup>
import { useThemeStore, THEMES } from '../stores/theme'
import { useAuthStore } from '../stores/auth'
import { soundOn } from '../games/shared/sfx'
import { vibrateOn, autoPauseOn } from '../games/shared/prefs'

const theme = useThemeStore()
const auth = useAuthStore()
const logo = `${import.meta.env.BASE_URL}logo.png`
const set = (r, on) => (r.value = on)
</script>

<template>
  <div class="screen">
    <header class="screen-head"><h1 class="brand">설정</h1></header>

    <h2 id="theme-label" class="section-label">테마</h2>
    <div class="opts" role="radiogroup" aria-labelledby="theme-label">
      <button
        v-for="t in THEMES"
        :key="t.id"
        class="opt"
        :class="{ on: theme.resolved === t.id }"
        role="radio"
        :aria-checked="theme.resolved === t.id"
        @click="theme.setChoice(t.id)"
      >
        <span class="pv" :style="{ background: t.preview.bg, borderColor: t.preview.border }">
          <i v-for="c in t.preview.colors" :key="c" :style="{ background: c }"></i>
        </span>
        <span class="nm">{{ t.label }}</span>
      </button>
    </div>
    <label class="row standalone">
      <span>시스템 설정 따라가기</span>
      <input type="checkbox" class="switch" :checked="theme.followSystem" :disabled="theme.choice === 'candy'" @change="theme.setFollowSystem($event.target.checked)" />
    </label>

    <h2 class="section-label">게임</h2>
    <div class="panel group">
      <label class="row">
        <span>효과음</span>
        <input type="checkbox" class="switch" :checked="soundOn" @change="set(soundOn, $event.target.checked)" />
      </label>
      <label class="row">
        <span>진동</span>
        <input type="checkbox" class="switch" :checked="vibrateOn" @change="set(vibrateOn, $event.target.checked)" />
      </label>
      <label class="row last">
        <span>앱 전환 시 자동 일시정지</span>
        <input type="checkbox" class="switch" :checked="autoPauseOn" @change="set(autoPauseOn, $event.target.checked)" />
      </label>
    </div>

    <h2 class="section-label">계정</h2>
    <div class="panel group">
      <template v-if="auth.isLoggedIn">
        <div class="row"><span>닉네임</span><span class="muted val">{{ auth.user.nickname }}</span></div>
        <div class="row last"><button type="button" class="link danger" @click="auth.signOut()">로그아웃</button></div>
      </template>
      <div v-else class="row last">
        <span>로그인</span>
        <button type="button" class="btn btn-primary btn-sm" @click="auth.openLogin()">로그인</button>
      </div>
    </div>

    <div class="about">
      <img :src="logo" alt="" width="56" height="56" class="logo" />
      <span class="name">겜돌이 월드</span>
      <span class="en muted">Gamdori World</span>
      <span v-if="auth.isLocalMode" class="muted small">더미 모드 · 기록은 이 브라우저에만 저장돼요</span>
    </div>
  </div>
</template>

<style scoped>
.opts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.opt {
  display: flex; flex-direction: column; gap: 8px; padding: 8px; text-align: left;
  border-radius: var(--r-md); border: var(--bw) solid var(--opt-bc); background: var(--surface); box-shadow: var(--sh-sm);
}
.opt.on { outline: 3px solid var(--accent); outline-offset: 2px; }
.pv { height: 60px; display: flex; align-items: flex-end; gap: 4px; padding: 8px; border-radius: 10px; border: 1px solid; }
.pv i { flex: 1; height: 18px; border-radius: 5px; }
.nm { font-size: 13px; font-weight: 700; }
.group { padding: 0 16px; }
.row {
  min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  border-bottom: 1px solid var(--line-soft); font-size: 15px;
}
label.row { cursor: pointer; }
.row.last { border-bottom: 0; }
.row.standalone { border: 0; min-height: 44px; font-size: 14px; }
.val { max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.switch:disabled { opacity: 0.4; cursor: not-allowed; }
.link { border: 0; background: none; padding: 0; font-size: 15px; font-weight: 700; }
.danger { color: var(--danger); }
.about { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 16px 0 8px; text-align: center; }
.logo { width: 56px; height: 56px; border-radius: 50%; border: var(--bw) solid var(--bc); margin-bottom: 6px; }
.name { font-family: var(--font-display); font-weight: var(--display-weight); font-size: 16px; }
.en { font-family: var(--font-num); font-size: 12px; }
.small { font-size: 12px; margin-top: 6px; }
</style>
