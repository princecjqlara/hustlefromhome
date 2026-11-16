begin;
create table if not exists public.oauth_sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,pages_encrypted text not null,expires_at timestamptz not null default now()+interval '10 minutes');
alter table public.oauth_sessions enable row level security;
revoke all on public.oauth_sessions from anon,authenticated;
create or replace function public.claim_jobs(batch_size integer default 3) returns setof public.jobs language plpgsql security definer set search_path=public as $$ begin
 update jobs set status='uncertain',last_error='Worker lease expired; review outcome before sending again' where status='running' and locked_at<now()-interval '5 minutes';
 return query update jobs set status='running',locked_at=now(),attempts=attempts+1 where id in(select id from jobs where status='pending' and due_at<=now() order by due_at for update skip locked limit least(batch_size,3)) returning *;
end $$;
revoke execute on function public.claim_jobs(integer) from public,anon,authenticated;
grant execute on function public.claim_jobs(integer) to service_role;
commit;
