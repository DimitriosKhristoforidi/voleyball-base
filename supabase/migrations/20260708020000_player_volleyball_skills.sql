-- Volleyball-specific per-player skill ratings (0-5). NULL = not rated.
alter table public.players
  add column if not exists skill_serve smallint check (skill_serve between 0 and 5),
  add column if not exists skill_block smallint check (skill_block between 0 and 5),
  add column if not exists skill_set smallint check (skill_set between 0 and 5),
  add column if not exists skill_attack smallint check (skill_attack between 0 and 5),
  add column if not exists skill_reception smallint check (skill_reception between 0 and 5);

comment on column public.players.skill_serve is 'Подача (Serve) rating 0-5 (NULL = not rated).';
comment on column public.players.skill_block is 'Блок (Block) rating 0-5 (NULL = not rated).';
comment on column public.players.skill_set is 'Связка (Set/Setter) rating 0-5 (NULL = not rated).';
comment on column public.players.skill_attack is 'Атака (Attack/Spike) rating 0-5 (NULL = not rated).';
comment on column public.players.skill_reception is 'Прием (Pass/Reception) rating 0-5 (NULL = not rated).';
