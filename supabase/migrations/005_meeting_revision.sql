begin;
alter table public.meetings add column if not exists revision uuid not null default gen_random_uuid();
commit;
