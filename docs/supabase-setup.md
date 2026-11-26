# 겜돌이 월드 Supabase 설정 안내

로그인(구글)과 랭킹을 켜는 방법이에요. **Free 플랜**으로 충분해요.

| 모드 | 실행 | 데이터 |
|---|---|---|
| 더미 | `.env.local` 없이 `npm run dev` | 이 브라우저 localStorage |
| 실제 Supabase | `.env.local` 작성 후 `npm run dev` | Supabase 클라우드 |

> Free 플랜은 업그레이드하지 않으면 요금이 나오지 않아요.
> 대신 **7일 동안 요청이 없으면 프로젝트가 일시정지**돼요. 대시보드에서 Restore 를 누르면 데이터 그대로 다시 켜져요.

---

## 1. 프로젝트 만들기

1. https://supabase.com/dashboard → Organization **yapyap** → **New project**
2. 입력값

| 항목 | 값 |
|---|---|
| Project name | `gamdori` |
| Database password | 길고 무작위로 (앱에서는 쓰지 않음, 비밀번호 관리자에 보관) |
| Region | Northeast Asia (Seoul) |
| Enable Data API | **켜기** (앱이 이 API로 랭킹·닉네임을 주고받아요) |
| Enable RLS on new tables automatically | **켜기** |
| Grant API access to new tables automatically | **끄기** (필요한 권한은 schema.sql 이 직접 줘요) |

## 2. 표·규칙 만들기

1. 왼쪽 **SQL Editor** → New query
2. 프로젝트의 `supabase/schema.sql` 내용을 통째로 붙여 넣고 **Run**
3. **Table Editor** 에 `profiles`, `board_limits`, `scores` 가 보이면 성공 (`board_limits` 에 34줄)

> 점수 상한(`src/games/scoreLimits.js`)을 바꾸거나 게임을 추가하면 schema.sql 의 상한 목록도 고친 뒤 다시 Run 하세요. 여러 번 실행해도 안전해요.

## 3. 구글 로그인 켜기

### 3-1. Google Cloud 에서 OAuth 클라이언트 만들기
1. https://console.cloud.google.com → 새 프로젝트(예: gamdori)
2. **APIs & Services → OAuth consent screen**: User type `External`, 앱 이름 `겜돌이 월드`, 지원 이메일 입력 → 저장
   - 테스트 중에는 *Test users* 에 내 구글 계정 추가. 누구나 쓰게 하려면 **Publish app**
3. **Credentials → Create credentials → OAuth client ID**
   - Application type: `Web application`
   - Authorized JavaScript origins: `https://gamdori.onrender.com`, `http://localhost:5173`
   - Authorized redirect URIs: `https://<프로젝트ref>.supabase.co/auth/v1/callback`
     (Supabase → Authentication → Sign In / Providers → Google 화면에 정확한 주소가 나와요)
4. 만들어진 **Client ID**, **Client secret** 을 복사

### 3-2. Supabase 에 넣기
1. **Authentication → Sign In / Providers → Google** → Enable
2. Client ID, Client secret 붙여 넣고 Save

### 3-3. 돌아올 주소 허용
**Authentication → URL Configuration**
- Site URL: `https://gamdori.onrender.com`
- Redirect URLs (Add URL):
  - `https://gamdori.onrender.com/**`
  - `http://localhost:5173/**`
  - (같은 Wi-Fi 휴대폰으로 테스트하면) `http://<내 PC IP>:5173/**`

## 4. 앱에 연결

1. **Project Settings → API Keys**(또는 Data API) 에서 두 값 복사
   - Project URL: `https://<프로젝트ref>.supabase.co`
   - 공개용 키: `anon` 키 또는 `sb_publishable_...` 키
2. 프로젝트 루트에 `.env.local` 파일 만들기 (git 에 올라가지 않아요)

```
VITE_SUPABASE_URL=https://<프로젝트ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<공개용 키>
```

> ⚠ `service_role` / `sb_secret_...` 키는 **절대** 앱이나 `.env.local` 에 넣지 마세요. 모든 규칙을 무시하는 관리자 키예요.

3. 패키지 설치 후 실행

```powershell
npm install
npm run dev
```

## 5. 배포 (Render)

Render 대시보드 → gamdori 서비스 → **Environment** 에 4번의 두 값을 같은 이름으로 추가 → 다시 배포.
(Vite 는 빌드할 때 값을 넣기 때문에, 값을 바꾸면 다시 빌드해야 해요.)

## 6. 보안 확인 (SQL Editor)

```sql
-- 1) 익명 사용자는 점수를 직접 쓸 수 없어야 함 → 권한 오류가 나면 정상
set role anon;
insert into public.scores (board, user_id, nickname, score) values ('snake_casual', gen_random_uuid(), 'x', 1);
reset role;

-- 2) 상한 확인
select * from public.board_limits order by board;

-- 3) 랭킹 보기
select board, nickname, score, updated_at from public.scores order by board, score desc;
```

## 자주 겪는 문제

| 증상 | 확인할 것 |
|---|---|
| 로그인 후 `redirect_uri_mismatch` | 3-1 의 Authorized redirect URIs 가 Supabase 콜백 주소와 같은지 |
| 로그인 후 다른 주소로 감 / 돌아오지 않음 | 3-3 의 Redirect URLs 에 지금 주소가 있는지 |
| 랭킹 저장 시 "기록할 수 없는 점수" | 10초 안에 다시 저장했거나, 상한을 넘었거나, board_limits 에 그 게임이 없음 |
| 화면에 "더미 모드" 표시 | `.env.local` 위치(프로젝트 루트)·이름, 그리고 dev 서버를 다시 켰는지 |
