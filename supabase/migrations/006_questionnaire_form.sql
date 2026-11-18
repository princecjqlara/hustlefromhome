begin;
alter table public.settings
  add column if not exists form_mode text not null default 'form' check(form_mode in ('single','form')),
  add column if not exists form_intro text not null default 'Please answer the questions below. You can answer several questions in one message, using the question numbers or labels.',
  add column if not exists process_messages jsonb not null default '[]' check(jsonb_typeof(process_messages)='array');
notify pgrst, 'reload schema';
commit;
