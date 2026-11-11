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

-- App store checks: which app, store and country, and the score. Nothing about the visitor.
create table if not exists public.app_checks (
  id bigint generated always as identity primary key,
  store text not null check (store in ('apple', 'google')),
  app_id text not null,
  country text not null,
  title text,
  score integer,
  failed_checks text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists app_checks_created_at_idx on public.app_checks (created_at desc);
create index if not exists app_checks_app_idx on public.app_checks (store, app_id);
alter table public.app_checks enable row level security;

-- ---------- Accounts (phase 1) ----------
-- Every user belongs to an organisation: a person or an agency. Server access only.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);
alter table public.organizations enable row level security;

create table if not exists public.memberships (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists memberships_user_idx on public.memberships (user_id);
alter table public.memberships enable row level security;

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  url text not null,
  domain text not null,
  created_at timestamptz not null default now(),
  unique (org_id, domain)
);
alter table public.sites enable row level security;

create table if not exists public.site_scores (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.sites (id) on delete cascade,
  overall integer not null,
  seo integer not null,
  aeo integer not null,
  geo integer not null,
  source text not null check (source in ('page-check', 'report', 'monitor')),
  report_id text,
  created_at timestamptz not null default now()
);
create index if not exists site_scores_site_idx on public.site_scores (site_id, created_at desc);
alter table public.site_scores enable row level security;

create table if not exists public.org_reports (
  report_id text primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  site_id uuid references public.sites (id) on delete set null,
  url text not null,
  created_at timestamptz not null default now()
);
create index if not exists org_reports_org_idx on public.org_reports (org_id, created_at desc);
alter table public.org_reports enable row level security;

-- ---------- Plans and credits (phase 2) ----------
create table if not exists public.usage_counters (
  org_id uuid not null references public.organizations (id) on delete cascade,
  period text not null,
  metric text not null,
  count integer not null default 0,
  primary key (org_id, period, metric)
);
alter table public.usage_counters enable row level security;

-- Adds to a monthly counter in one step, so simultaneous requests can't lose counts.
create or replace function public.bump_usage(p_org uuid, p_period text, p_metric text, p_by integer default 1)
returns integer
language sql
set search_path = ''
as $$
  insert into public.usage_counters (org_id, period, metric, count)
  values (p_org, p_period, p_metric, p_by)
  on conflict (org_id, period, metric) do update set count = public.usage_counters.count + excluded.count
  returning count;
$$;
revoke all on function public.bump_usage(uuid, text, text, integer) from public, anon, authenticated;

-- Bought AI credit packs and one-off reports (positive) and what's been used from them (negative).
create table if not exists public.credit_ledger (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('ai', 'report')),
  delta integer not null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_org_idx on public.credit_ledger (org_id, kind);
alter table public.credit_ledger enable row level security;

-- ---------- Payments (phase 3) ----------
alter table public.organizations add column if not exists stripe_customer_id text unique;
alter table public.organizations add column if not exists stripe_subscription_id text;
alter table public.organizations add column if not exists plan_status text;
alter table public.organizations add column if not exists current_period_end timestamptz;

-- Stripe can send an event more than once; this makes each one count once.
create table if not exists public.stripe_events (
  id text primary key,
  created_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;

-- ---------- Monitoring (phase 4) ----------
alter table public.site_scores add column if not exists fails integer;

create table if not exists public.site_monitors (
  site_id uuid primary key references public.sites (id) on delete cascade,
  every_days integer not null default 7 check (every_days between 1 and 30),
  alert_email text,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.site_monitors enable row level security;

create table if not exists public.tracked_apps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  store text not null check (store in ('apple', 'google')),
  app_id text not null,
  country text not null,
  title text,
  icon text,
  url text,
  competitors jsonb not null default '[]',
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, store, app_id, country)
);
alter table public.tracked_apps enable row level security;

create table if not exists public.app_snapshots (
  id bigint generated always as identity primary key,
  tracked_app_id uuid not null references public.tracked_apps (id) on delete cascade,
  rating numeric,
  rating_count bigint,
  score integer,
  last_updated timestamptz,
  competitors jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists app_snapshots_app_idx on public.app_snapshots (tracked_app_id, created_at desc);
alter table public.app_snapshots enable row level security;

-- ---------- AI visibility over time (phase 5) ----------
create table if not exists public.visibility_trackers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  site_id uuid not null unique references public.sites (id) on delete cascade,
  brand text not null,
  prompts text[] not null default '{}',
  competitors jsonb not null default '[]',
  every_days integer not null default 7,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.visibility_trackers enable row level security;

create table if not exists public.visibility_runs (
  id bigint generated always as identity primary key,
  tracker_id uuid not null references public.visibility_trackers (id) on delete cascade,
  summary jsonb not null default '[]',
  share_of_voice jsonb not null default '[]',
  rows jsonb not null default '[]',
  error text,
  created_at timestamptz not null default now()
);
create index if not exists visibility_runs_tracker_idx on public.visibility_runs (tracker_id, created_at desc);
alter table public.visibility_runs enable row level security;

-- ---------- Dashboard detail, alerts, teams and schedules (phase 6) ----------
alter table public.site_scores add column if not exists issues jsonb;
alter table public.site_scores add column if not exists bots jsonb;
alter table public.sites add column if not exists client_name text;

create table if not exists public.alerts (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  site_id uuid references public.sites (id) on delete cascade,
  kind text not null check (kind in ('fail', 'warn', 'pass', 'info')),
  title text not null,
  detail text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists alerts_org_idx on public.alerts (org_id, created_at desc);
alter table public.alerts enable row level security;

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor', 'viewer')),
  token text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists invites_org_idx on public.invites (org_id);
alter table public.invites enable row level security;

create table if not exists public.scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  site_id uuid not null unique references public.sites (id) on delete cascade,
  email text not null,
  every_days integer not null default 30,
  last_run_at timestamptz,
  pending_report_id text,
  created_at timestamptz not null default now()
);
alter table public.scheduled_reports enable row level security;

-- ---------- Agency branding, report history and custom report domains (phase 8) ----------
alter table public.visibility_runs add column if not exists sentiment jsonb;
alter table public.organizations add column if not exists brand_name text;
alter table public.organizations add column if not exists brand_logo text;
alter table public.organizations add column if not exists brand_color text;
alter table public.organizations add column if not exists report_domain text unique;
alter table public.organizations add column if not exists report_domain_verified_at timestamptz;

-- Full reports are kept longer for teams on a paid plan. Reports nobody owns, or owned by a
-- free team, go after p_free_days; every report goes after p_paid_days. Server only.
create or replace function public.prune_reports(p_free_days integer, p_paid_days integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.documents d
  where d.collection = 'reports'
    and (
      d.updated_at < now() - make_interval(days => p_paid_days)
      or (
        d.updated_at < now() - make_interval(days => p_free_days)
        and not exists (
          select 1 from public.org_reports r
          join public.organizations o on o.id = r.org_id
          where r.report_id = d.id and o.plan in ('pro', 'agency')
        )
      )
    );
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
revoke all on function public.prune_reports(integer, integer) from public, anon, authenticated;
grant execute on function public.prune_reports(integer, integer) to service_role;
grant execute on function public.bump_usage(uuid, text, text, integer) to service_role;

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
