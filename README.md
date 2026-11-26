# Gamdori World

Vue 3 + Vite + Pinia + Vue Router + Supabase(Auth/Postgres). 버전은 루트의 `.version` 파일.

## 시작하기
```
npm install
npm run dev
```
`.env.local` 이 없으면 **오프라인 모드**(이 브라우저 localStorage)로 처리

## 게임 목록 (17종, 모두 랭킹 지원)
테트리스 · 산수마스터 · 기억력대마왕 · 키보드워리어 · 스도쿠 · 2048 · I'm 솔로몬 · 색깔능력자 · 파이프정비기사 · 벽돌부수기 · 색깔론자 · 낙서물리학자 · 스네이크러시 · 나오지마라고 · 프로타자머신 · 섯다 · 고스톱

## 구조
```
src/
├─ games/
│  ├─ registry.js        ← 게임 목록 (여기에만 등록)
│  ├─ shared/            ← 타이머/효과음/HUD/시작·종료 화면 공통 모듈
│  ├─ hwatu/             ← 화투 공통 (카드 스프라이트·지갑·AI 캐릭터)
│  └─ 게임별 폴더 (tetris/ seotda/ gostop/ …)
├─ services/
│  ├─ config.js          ← Supabase 설정 (비어 있으면 오프라인 모드)
│  ├─ authService.js / scoreService.js  ← 어댑터 선택
│  ├─ mock/              ← 오프라인 모드(localStorage) 구현
│  └─ supabase/          ← 실제 Supabase 구현 (SDK 동적 로드)
├─ stores/ (auth, theme) ← Pinia
├─ components/ views/ router/
supabase/schema.sql      ← 표·보안 규칙(RLS)·점수 저장 함수·점수 상한
```

### 데이터 구조 (Supabase Postgres)
```
profiles      (id → auth.users, nickname)                 ← 닉네임, 대소문자 구분 없이 중복 불가
board_limits  (board, max_score)                          ← '{게임id}_{casual|competitive}' 별 점수 상한
scores        (board, user_id, nickname, score, meta, updated_at)  ← 유저별 최고점 1건
```
점수 저장은 `submit_score()` 함수로만 가능하고, 랭킹은 누구나 읽을 수 있음. 내 순위는 "나보다 높은 점수 개수 + 1".

### 백엔드 교체 구조
`src/services/authService.js`, `scoreService.js` 가 설정 유무로 `mock/` 또는 `supabase/` 어댑터를 선택 하고, 화면 코드는 이 두 서비스만 사용

## 게임 이전 규칙
- `props: { mode: 'casual' | 'competitive' }`
- 종료 시 `emit('gameover', { score, meta })` → 저장/랭킹은 `GameView`가 처리
- `registry.js`에 한 줄 등록하면 목록·랭킹·점수 저장이 자동으로 연결
