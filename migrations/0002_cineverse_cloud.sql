-- Per-user CineVerse cloud backup (library, tracker, settings).
create table if not exists cineverse_cloud (
  user_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
