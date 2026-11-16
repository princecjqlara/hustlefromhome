begin;
alter table public.settings add column if not exists followup_buttons jsonb not null default '[]';
commit;
