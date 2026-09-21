-- Only new notes explicitly opt in. No historical review backfill.
alter table public.notes add column study_enabled boolean not null default false;
alter table public.notes add column last_opened_at timestamptz;

create function public.record_note_opened(p_note_id bigint, p_user_id text)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$
  update public.notes
  set last_opened_at = greatest(last_opened_at, clock_timestamp())
  where id = p_note_id and clerk_user_id = p_user_id and study_enabled = true
  returning last_opened_at;
$$;
revoke all on function public.record_note_opened(bigint, text) from public, anon, authenticated;
grant execute on function public.record_note_opened(bigint, text) to service_role;
