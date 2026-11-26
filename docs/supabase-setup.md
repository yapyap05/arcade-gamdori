# 겜돌이 월드 Supabase 설정 안내

로그인(이메일)과 랭킹을 켜는 방법이에요. **Free 플랜**으로 충분해요.

| 모드 | 실행 | 데이터 |
|---|---|---|
| 오프라인 | `.env.local` 없이 `npm run dev` | 이 브라우저 localStorage |
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

## 3. 이메일 로그인 켜기

**Authentication → Sign In / Providers → Email**
- Enable Email provider: **켜기**
- **Confirm email: 끄기** (켜 두면 가입 때 인증 메일이 필요해요. 무료 기본 메일은 시간당 몇 통만 보내져서 가입이 막혀요)
- Minimum password length: 6 (기본값)

> 앱은 이메일 · 닉네임 · 비밀번호로 가입하고 바로 로그인해요. 비밀번호 찾기는 없어요.
> 비밀번호를 잊은 사용자는 대시보드 **Authentication → Users** 에서 직접 지우거나 비밀번호를 바꿔 줄 수 있어요.

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
| 가입 후 "가입 메일을 확인해 주세요" | 3 의 Confirm email 이 꺼져 있는지 |
| "이메일 또는 비밀번호가 맞지 않아요" | 가입한 이메일인지, 비밀번호 대소문자 |
| 랭킹 저장 시 "기록할 수 없는 점수" | 10초 안에 다시 저장했거나, 상한을 넘었거나, board_limits 에 그 게임이 없음 |
| 화면에 "오프라인 모드" 표시 | `.env.local` 위치(프로젝트 루트)·이름, 그리고 dev 서버를 다시 켰는지 |
