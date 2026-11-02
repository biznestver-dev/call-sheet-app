create table if not exists public.call_sheet_documents (
    id text primary key check (id = 'shared'),
    data jsonb not null,
    updated_at timestamptz not null default now(),
    client_id text
);

alter table public.call_sheet_documents
    add column if not exists client_id text;

alter table public.call_sheet_documents enable row level security;
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.call_sheet_documents to anon, authenticated;

drop policy if exists "Anyone can read the shared call sheet" on public.call_sheet_documents;
create policy "Anyone can read the shared call sheet"
    on public.call_sheet_documents
    for select
    to anon, authenticated
    using (id = 'shared');

drop policy if exists "Anyone can create the shared call sheet" on public.call_sheet_documents;
create policy "Anyone can create the shared call sheet"
    on public.call_sheet_documents
    for insert
    to anon, authenticated
    with check (id = 'shared');

drop policy if exists "Anyone can update the shared call sheet" on public.call_sheet_documents;
create policy "Anyone can update the shared call sheet"
    on public.call_sheet_documents
    for update
    to anon, authenticated
    using (id = 'shared')
    with check (id = 'shared');

do $$
begin
    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'call_sheet_documents'
    ) then
        alter publication supabase_realtime add table public.call_sheet_documents;
    end if;
end
$$;
