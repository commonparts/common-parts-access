-- Reject new password grants without invalidating existing sessions during rollout.
create function public.reject_password_sessions(event jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case
    when event ->> 'authentication_method' = 'password' then
      jsonb_build_object(
        'error', jsonb_build_object('http_code', 403, 'message', 'Sign in with an email code.')
      )
    else jsonb_build_object('claims', event -> 'claims')
  end
$$;

revoke all on function public.reject_password_sessions(jsonb) from public, anon, authenticated;
grant execute on function public.reject_password_sessions(jsonb) to supabase_auth_admin;
