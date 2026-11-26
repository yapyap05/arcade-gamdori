-- ═══════════════════════════════════════════════════════════════
-- 겜돌이 월드 Supabase 스키마
-- 대시보드 → SQL Editor 에 통째로 붙여 넣고 Run (여러 번 실행해도 안전)
--
--  profiles      : 닉네임 (한 계정에 한 번, 대소문자 구분 없이 중복 불가)
--  board_limits  : 보드별 점수 상한 (src/games/scoreLimits.js 와 같은 값 유지)
--  scores        : 보드·유저별 최고점 1건. 누구나 읽기, 쓰기는 submit_score() 로만
-- ═══════════════════════════════════════════════════════════════

-- ───── 표 ─────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (nickname ~ '^[가-힣a-zA-Z0-9_]{2,12}$'),
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_nickname_lower_key on public.profiles (lower(nickname));

create table if not exists public.board_limits (
  board text primary key,
  max_score integer not null check (max_score > 0)
);

create table if not exists public.scores (
  board text not null references public.board_limits (board) on update cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  nickname text not null,
  score integer not null check (score > 0),
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (board, user_id)
);
create index if not exists scores_board_score_idx on public.scores (board, score desc);

-- ───── 접근 규칙 (RLS) ─────
alter table public.profiles enable row level security;
alter table public.board_limits enable row level security;
alter table public.scores enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists "scores_select_all" on public.scores;
create policy "scores_select_all" on public.scores
  for select to anon, authenticated using (true);

-- board_limits 와 scores 쓰기에는 정책이 없음 → 클라이언트는 직접 접근 불가

-- ───── 권한: 자동 부여 설정과 관계없이 필요한 것만 ─────
revoke all on public.profiles, public.board_limits, public.scores from anon, authenticated;
grant select, insert on public.profiles to authenticated;
grant select on public.scores to anon, authenticated;

-- ───── 점수 저장 함수 ─────
-- 로그인·닉네임·보드·상한·meta 크기를 확인하고, 더 높은 점수일 때만 저장 (같은 사람은 10초에 한 번)
-- 거절 시 errcode: 42501(권한/너무 잦음), 22023(값 오류)
create or replace function public.submit_score(p_board text, p_score integer, p_meta jsonb default '{}'::jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_nick text;
  v_max integer;
  v_prev_score integer;
  v_prev_at timestamptz;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select nickname into v_nick from public.profiles where id = v_uid;
  if v_nick is null then
    raise exception 'no nickname' using errcode = '42501';
  end if;

  select max_score into v_max from public.board_limits where board = p_board;
  if v_max is null then
    raise exception 'unknown board' using errcode = '22023';
  end if;
  if p_score is null or p_score <= 0 or p_score > v_max then
    raise exception 'score out of range' using errcode = '22023';
  end if;

  if p_meta is null or jsonb_typeof(p_meta) <> 'object' then
    p_meta := '{}'::jsonb;
  end if;
  if (select count(*) from jsonb_object_keys(p_meta)) > 12 or length(p_meta::text) > 2000 then
    raise exception 'meta too large' using errcode = '22023';
  end if;

  select score, updated_at into v_prev_score, v_prev_at
    from public.scores where board = p_board and user_id = v_uid for update;

  if v_prev_score is not null then
    if v_prev_score >= p_score then
      return false; -- 최고점이 아니면 그대로 둠
    end if;
    if v_prev_at > now() - interval '10 seconds' then
      raise exception 'too frequent' using errcode = '42501';
    end if;
    update public.scores
       set score = p_score, nickname = v_nick, meta = p_meta, updated_at = now()
     where board = p_board and user_id = v_uid;
  else
    insert into public.scores (board, user_id, nickname, score, meta)
    values (p_board, v_uid, v_nick, p_score, p_meta)
    on conflict (board, user_id) do nothing;
  end if;
  return true;
end;
$$;

revoke all on function public.submit_score(text, integer, jsonb) from public, anon;
grant execute on function public.submit_score(text, integer, jsonb) to authenticated;

-- ───── 보드별 랭킹 기록 수 (홈 화면 게임 정렬용, 읽기 전용) ─────
create or replace function public.board_counts()
returns table (board text, n bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.board, count(*) from public.scores s group by s.board;
$$;
revoke all on function public.board_counts() from public;
grant execute on function public.board_counts() to anon, authenticated;

-- ───── 보드별 점수 상한 (src/games/scoreLimits.js 와 같게) ─────
insert into public.board_limits (board, max_score)
select g || '_' || m, v
from (values
  ('tetris', 9999999),
  ('multi-calc', 20000),
  ('word-memory', 20000),
  ('speed-typing', 20000),
  ('sudoku', 3000),
  ('2048', 5000000),
  ('weight-compare', 10000),
  ('stroop', 200000),
  ('pipe', 2000000),
  ('block-breaker', 5000000),
  ('color-link', 2000000),
  ('doodle-physics', 20000),
  ('snake', 200000),
  ('whack-mole', 2000000),
  ('novel-typing', 200000),
  ('seotda', 140000),
  ('gostop', 140000)
) as t(g, v)
cross join (values ('casual'), ('competitive')) as mm(m)
on conflict (board) do update set max_score = excluded.max_score;
