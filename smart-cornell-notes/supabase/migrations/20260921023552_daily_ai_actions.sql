create table public.daily_ai_actions (
  clerk_user_id text not null,
  action_day date not null,
  used integer not null default 0 check (used between 0 and 6),
  primary key (clerk_user_id, action_day)
);
alter table public.daily_ai_actions enable row level security;
revoke all on public.daily_ai_actions from public, anon, authenticated;
grant select, insert, update on public.daily_ai_actions to service_role;

create function public.use_daily_ai_actions(p_user_id text, p_cost integer default 0)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_day date := (statement_timestamp() at time zone 'America/Los_Angeles')::date;
  v_used integer := 0;
  v_allowed boolean := true;
  v_reset timestamptz := (v_day + 1)::timestamp at time zone 'America/Los_Angeles';
begin
  if p_user_id is null or btrim(p_user_id) = '' or p_cost is null or p_cost not in (0, 1, 3) then
    raise exception 'Invalid action allowance request';
  end if;

  if p_cost = 0 then
    select d.used into v_used from public.daily_ai_actions d
      where d.clerk_user_id = p_user_id and d.action_day = v_day;
    v_used := coalesce(v_used, 0);
  else
    insert into public.daily_ai_actions (clerk_user_id, action_day, used)
      values (p_user_id, v_day, 0) on conflict do nothing;
    -- Serialize competing requests for this user/day, before any external API work.
    select d.used into v_used from public.daily_ai_actions d
      where d.clerk_user_id = p_user_id and d.action_day = v_day for update;
    if v_used + p_cost <= 6 then
      update public.daily_ai_actions d set used = d.used + p_cost
        where d.clerk_user_id = p_user_id and d.action_day = v_day
        returning d.used into v_used;
    else
      v_allowed := false;
    end if;
  end if;
  return jsonb_build_object('allowed', v_allowed, 'remaining', 6 - v_used,
    'limit', 6, 'resetsAt', v_reset);
end;
$$;
revoke all on function public.use_daily_ai_actions(text, integer) from public, anon, authenticated;
grant execute on function public.use_daily_ai_actions(text, integer) to service_role;
