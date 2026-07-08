-- Per-player skill ratings (0-5). NULL = not rated.
alter table public.players
  add column if not exists skill_power smallint check (skill_power between 0 and 5),
  add column if not exists skill_speed smallint check (skill_speed between 0 and 5),
  add column if not exists skill_jumping smallint check (skill_jumping between 0 and 5),
  add column if not exists skill_technique smallint check (skill_technique between 0 and 5),
  add column if not exists skill_stamina smallint check (skill_stamina between 0 and 5),
  add column if not exists skill_intelligence smallint check (skill_intelligence between 0 and 5);

comment on column public.players.skill_power is 'Skill rating 0-5 (NULL = not rated).';
comment on column public.players.skill_speed is 'Skill rating 0-5 (NULL = not rated).';
comment on column public.players.skill_jumping is 'Skill rating 0-5 (NULL = not rated).';
comment on column public.players.skill_technique is 'Skill rating 0-5 (NULL = not rated).';
comment on column public.players.skill_stamina is 'Skill rating 0-5 (NULL = not rated).';
comment on column public.players.skill_intelligence is 'Skill rating 0-5 (NULL = not rated).';
