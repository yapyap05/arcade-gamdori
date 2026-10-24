# Gamdori World

Vue 3 + Vite + Pinia + Vue Router + Firebase(Auth/Firestore).

## 시작하기
```
npm install
npm run dev
```

## 게임 목록 (전부 Vue 컴포넌트, 모두 랭킹 지원)
테트리스 · 스네이크 러시 · 두더지 소탕작전 · 계산x계산해 · 기억x기억해 · 키보드워리어 · 스도쿠 · 2048 · I'm솔로몬 · 색깔능력자 · 파이프정비기사 · 벽돌 철거맨 · 나는야 타자왕

## 구조
```
src/
├─ games/
│  ├─ registry.js        ← 게임 목록 (여기에만 등록)
│  ├─ shared/            ← 타이머/효과음/HUD/시작·종료 화면 공통 모듈
│  └─ tetris/ stroop/ solomon/ pipe/ sudoku/ g2048/ memory/ multicalc/ typing/ novel/ breaker/
├─ services/
│  ├─ config.js          ← Firebase 설정 (비어 있으면 더미 모드)
│  ├─ authService.js / scoreService.js  ← 어댑터 선택
│  ├─ mock/              ← 더미(localStorage) 구현
│  └─ firebase/          ← 실제 Firebase 구현 (SDK 동적 로드)
├─ stores/ (auth, theme) ← Pinia
├─ components/ views/ router/
firestore.rules          ← Firestore 보안 규칙
```


### 데이터 구조 (Firestore)
```
profiles/{uid}                          { nickname, createdAt }
nicknames/{소문자닉네임}                  { uid }            ← 닉네임 중복 방지 (중복이면 닉네임#코드)
leaderboards/{게임id}_{casual|competitive}/entries/{uid}
                                        { uid, nickname, score, meta, updatedAt }   ← 유저별 최고점 1건
```
랭킹 조회는 `orderBy('score','desc')`, 내 순위는 "나보다 높은 점수 개수 + 1"(집계 쿼리)로 계산

### 백엔드 교체 구조
`src/services/authService.js`, `scoreService.js` 가 설정 유무로 `mock/` 또는 `firebase/` 어댑터를 고릅니다. 화면 코드는 이 두 서비스만 사용해요.

## 게임 이전 규칙
- `props: { mode: 'casual' | 'competitive' }`
- 종료 시 `emit('gameover', { score, meta })` → 저장/랭킹은 `GameView`가 처리
- `registry.js`에 한 줄 등록하면 목록·랭킹·점수 저장이 자동으로 연결
