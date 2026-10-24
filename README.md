# 🎮 Arcade Gamdori (Vue 3)

Vue 3 + Vite + Pinia + Vue Router. Supabase 연결 전에는 **로컬 모드(localStorage)** 로 로그인/랭킹이 동작합니다.

## 시작하기
```bash
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
│  ├─ supabase.js        ← 키 유무로 로컬/Supabase 모드 결정
│  ├─ authService.js     ← 로컬 / Supabase(매직링크) 어댑터
│  └─ scoreService.js    ← submit() / top() 어댑터
├─ stores/ (auth, theme) ← Pinia
├─ components/ views/ router/
supabase/schema.sql      ← profiles, scores, leaderboard view, RLS
```

## Supabase 연결 (로그인 + 랭킹 DB)

1. **프로젝트 생성** → SQL Editor에서 `supabase/schema.sql` 전체를 실행 (profiles / scores / leaderboard view / RLS / 도배 방지 트리거)
2. **Authentication → Providers → Email** 이 켜져 있는지 확인
3. **Authentication → Email Templates** 에서 **"Confirm signup"** 과 **"Magic Link"** 두 템플릿 본문에 아래 줄을 추가
   (처음 가입은 Confirm signup, 재방문은 Magic Link 템플릿이 쓰입니다)
   ```
   <p>인증 코드: <b>{{ .Token }}</b></p>
   ```
   링크를 누르거나, 메일의 코드를 로그인 창에 입력하면 로그인됩니다. (다른 기기/앱 메일에서 열어도 코드로 가능)
4. **Authentication → URL Configuration**
   - Site URL: `https://yapyap05.github.io/arcade-gamdori/`
   - Redirect URLs: 위 주소 + `http://localhost:5173/`
5. **Project Settings → API** 의 URL, anon key를 복사해 `.env.local` 에 입력
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
6. 배포: GitHub 저장소 Settings → Secrets and variables → Actions 에 같은 이름 2개를 등록하고,
   Settings → Pages → Source 를 **GitHub Actions** 로 변경. (`.github/workflows/deploy.yml` 포함)

> anon key는 공개되어도 되는 키입니다. 데이터 보호는 `schema.sql` 의 RLS 정책이 담당해요. **service_role 키는 절대 넣지 마세요.**
> Supabase 기본 메일 서버는 시간당 발송 수가 적어요. 실서비스 전에 Auth → SMTP 설정에서 별도 SMTP(Resend 등)를 연결하세요.

## 게임 이전 규칙 (Vue 컴포넌트)
- `props: { mode: 'casual' | 'competitive' }`
- 종료 시 `emit('gameover', { score, meta })` → 저장/랭킹은 `GameView`가 처리
- `registry.js`에 한 줄 등록하면 목록·랭킹·점수 저장이 자동으로 연결됩니다. 점수는 항상 "높을수록 좋게" 정의하세요.

## 경쟁 모드 보안 메모
현재는 클라이언트가 점수를 직접 insert 합니다. 정식 경쟁 랭킹 전에 Edge Function/RPC로 점수 검증(게임별 상한, 플레이 시간 등)을 추가하세요.
