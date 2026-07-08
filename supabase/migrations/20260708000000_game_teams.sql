-- Teams within a single game. Created before the game and editable at any time.
create table if not exists public.game_teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null,
  color text not null default 'blue',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_teams_game_id_idx on public.game_teams(game_id);

alter table public.game_teams enable row level security;

drop policy if exists game_teams_authenticated_all on public.game_teams;
create policy game_teams_authenticated_all on public.game_teams
  for all to authenticated using (true) with check (true);

drop trigger if exists game_teams_set_updated_at on public.game_teams;
create trigger game_teams_set_updated_at
  before update on public.game_teams
  for each row execute function public.set_updated_at();

-- A participant's team assignment. NULL = unassigned / bench.
alter table public.game_participants
  add column if not exists team_id uuid references public.game_teams(id) on delete set null;

create index if not exists game_participants_team_id_idx on public.game_participants(team_id);

comment on table public.game_teams is 'Teams for a game; players are assigned via game_participants.team_id.';
comment on column public.game_participants.team_id is 'Team the participant is assigned to for this game (NULL = bench/unassigned).';
