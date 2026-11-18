-- Before applying, remove the hosted Auth hook if it points to this function.
drop function if exists public.reject_password_sessions(jsonb);
