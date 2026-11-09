-- Crawlvane database tables. Paste into the Supabase SQL editor and run.
-- Safe to run more than once.
--
-- Row level security is on with no policies, so the public key can read and write
-- nothing in these tables. Its only access is the three form functions below.

-- Reports, monitors, widgets, API keys, badges and counters, stored as JSON.
create table if not exists public.documents (
  collection text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
create index if not exists documents_prune_idx on public.documents (collection, updated_at);
alter table public.documents enable row level security;

-- Pro waitlist, "ask for a quote" (kind = 'fix') and contact form messages.
create table if not exists public.leads (
  id text primary key,
  kind text not null check (kind in ('waitlist', 'fix', 'contact')),
  email text not null,
  name text,
  url text,
  message text,
  source text,
  created_at timestamptz not null default now()
);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_kind_idx on public.leads (kind);
alter table public.leads enable row level security;

-- Emails collected by embedded audit widgets. widget_id refers to a widget in documents.
create table if not exists public.widget_leads (
  id text primary key,
  widget_id text not null,
  email text not null,
  name text,
  url text not null,
  score integer not null,
  created_at timestamptz not null default now()
);
create index if not exists widget_leads_widget_idx on public.widget_leads (widget_id, created_at desc);
alter table public.widget_leads enable row level security;

-- Newsletter sign-ups. Unsubscribing deletes the row.
-- Unsubscribe link for each email: https://YOUR-DOMAIN/unsubscribe?token=UNSUBSCRIBE_TOKEN
create table if not exists public.newsletter_subscribers (
  email text primary key check (email = lower(email)),
  source text,
  unsubscribe_token text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists newsletter_created_at_idx on public.newsletter_subscribers (created_at);
alter table public.newsletter_subscribers enable row level security;

-- Called from the browser with the public key. Signing up twice looks the same as
-- signing up once, so nobody can test whether an email is on the list.
create or replace function public.subscribe_newsletter(p_email text, p_source text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if length(v_email) > 254 or v_email !~ '^[^[:space:]@<>()\[\]\\,;:"]+@[^[:space:]@<>()\[\]\\,;:"]+\.[a-z]{2,}$' then
    raise exception 'Please enter a valid email address.' using errcode = '22023';
  end if;
  -- The browser can't be rate limited per visitor, so cap sign-ups for the whole list.
  if (select count(*) from public.newsletter_subscribers where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'too many sign-ups';
  end if;
  insert into public.newsletter_subscribers (email, source, unsubscribe_token)
  values (v_email, nullif(left(trim(p_source), 300), ''), replace(gen_random_uuid()::text, '-', ''))
  on conflict (email) do nothing;
end;
$$;

create or replace function public.unsubscribe_newsletter(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.newsletter_subscribers where unsubscribe_token = p_token;
  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

-- Called from the browser with the public key: waitlist, quote requests and contact form.
create or replace function public.submit_lead(
  p_kind text,
  p_email text,
  p_name text default null,
  p_url text default null,
  p_message text default null,
  p_source text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_message text := nullif(left(trim(coalesce(p_message, '')), 4000), '');
begin
  if p_kind is null or p_kind not in ('waitlist', 'fix', 'contact') then
    raise exception 'Unknown form.' using errcode = '22023';
  end if;
  if length(v_email) > 254 or v_email !~ '^[^[:space:]@<>()\[\]\\,;:"]+@[^[:space:]@<>()\[\]\\,;:"]+\.[a-z]{2,}$' then
    raise exception 'Please enter a valid email address.' using errcode = '22023';
  end if;
  if p_kind = 'contact' and v_message is null then
    raise exception 'Please write a message.' using errcode = '22023';
  end if;
  -- The browser can't be rate limited per visitor, so cap submissions for the whole site.
  if (select count(*) from public.leads where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'too many submissions';
  end if;
  insert into public.leads (id, kind, email, name, url, message, source)
  values (
    replace(gen_random_uuid()::text, '-', ''),
    p_kind,
    v_email,
    nullif(left(trim(p_name), 120), ''),
    nullif(left(trim(p_url), 2048), ''),
    v_message,
    nullif(left(trim(p_source), 300), '')
  );
end;
$$;

revoke all on function public.submit_lead(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_lead(text, text, text, text, text, text) to anon, authenticated;

revoke all on function public.subscribe_newsletter(text, text) from public, anon, authenticated;
revoke all on function public.unsubscribe_newsletter(text) from public, anon, authenticated;
grant execute on function public.subscribe_newsletter(text, text) to anon, authenticated;
grant execute on function public.unsubscribe_newsletter(text) to anon, authenticated;

-- Product statistics: which sites and pages get checked. Domain and path only, nothing
-- that identifies a person. A full site report adds one row per crawled page.
create table if not exists public.site_checks (
  id bigint generated always as identity primary key,
  domain text not null,
  path text,
  tool text not null,
  scores jsonb,
  failed_checks text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists site_checks_created_at_idx on public.site_checks (created_at desc);
create index if not exists site_checks_domain_idx on public.site_checks (domain);
alter table public.site_checks add column if not exists path text;
alter table public.site_checks enable row level security;

-- Bring across anything already saved in documents.
insert into public.leads (id, kind, email, name, url, message, source, created_at)
select id, data->>'kind', data->>'email', data->>'name', data->>'url', data->>'message', data->>'source',
       coalesce((data->>'createdAt')::timestamptz, updated_at)
from public.documents
where collection = 'leads'
on conflict (id) do nothing;

insert into public.widget_leads (id, widget_id, email, name, url, score, created_at)
select id, data->>'widgetId', data->>'email', data->>'name', data->>'url', round((data->>'score')::numeric)::integer,
       coalesce((data->>'createdAt')::timestamptz, updated_at)
from public.documents
where collection = 'widget-leads'
on conflict (id) do nothing;

-- Make the new functions available to the API straight away.
notify pgrst, 'reload schema';
