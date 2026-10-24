-- Supabase SQL Editor에 그대로 붙여 넣어 실행하세요.

-- 1) 프로필 (닉네임)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 12),
  created_at timestamptz not null default now()
);
create unique index profiles_nickname_key on public.profiles (lower(nickname));

-- 가입 시 닉네임 자동 생성 (중복이면 뒤에 4자리 붙임)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare nick text := coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'), ''), 'player');
begin
  begin
    insert into public.profiles (id, nickname) values (new.id, nick);
  exception when unique_violation then
    insert into public.profiles (id, nickname) values (new.id, left(nick, 7) || '#' || substr(new.id::text, 1, 4));
  end;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) 점수 (모든 기록 저장. 랭킹은 view에서 유저별 최고점만 추려서 노출)
create table public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null,
  mode text not null default 'casual' check (mode in ('casual', 'competitive')),
  score integer not null check (score >= 0),
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index scores_rank_idx on public.scores (game_id, mode, score desc);

create view public.leaderboard as
  select distinct on (s.game_id, s.mode, s.user_id)
    s.game_id, s.mode, s.user_id, p.nickname, s.score, s.created_at
  from public.scores s
  join public.profiles p on p.id = s.user_id
  order by s.game_id, s.mode, s.user_id, s.score desc, s.created_at asc;

-- 3) RLS
alter table public.profiles enable row level security;
alter table public.scores enable row level security;

create policy "profiles are public" on public.profiles for select using (true);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);
create policy "scores are public" on public.scores for select using (true);
create policy "insert own score" on public.scores for insert with check (auth.uid() = user_id);

grant select on public.leaderboard to anon, authenticated;

-- TODO(경쟁 모드 정식 오픈 시): 클라이언트 직접 insert 대신
--   Edge Function / RPC로 점수를 검증(게임별 상한, 플레이 시간, 시드 재현)한 뒤 저장하세요.

-- 4) 도배 방지: 같은 유저가 같은 게임에 5초 안에 연속 저장하는 것을 막음
create index scores_user_recent_idx on public.scores (user_id, game_id, created_at desc);

create or replace function public.limit_score_rate() returns trigger
language plpgsql as $$
begin
  if exists (
    select 1 from public.scores
    where user_id = new.user_id and game_id = new.game_id and created_at > now() - interval '5 seconds'
  ) then
    raise exception 'too many submissions';
  end if;
  return new;
end $$;

create trigger scores_rate_limit before insert on public.scores
  for each row execute function public.limit_score_rate();
