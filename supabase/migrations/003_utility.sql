begin;
alter table public.contacts add column if not exists utility_requested_at timestamptz;
alter table public.contacts add column if not exists utility_request_note text not null default '';
commit;
