-- Voxly 0002. Paste after 0001.
-- Security choices:
-- * username and tag checks cast to text so citext cannot treat uppercase as lowercase.
-- * audience defaults to private and status defaults to draft, so a new row is invisible.
-- * a suspension without an end date cannot be stored.
-- * moderation_actions has no foreign keys, so the audit row survives account deletion.
-- * there is no badges column. verified is the locked flag. Badge tables come later.
-- * who_can_message is everyone or followers. Subscribers is a later step.

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null,
  display_name text not null default '' check (char_length(display_name) <= 60),
  bio text not null default '' check (char_length(bio) <= 500),
  avatar_url text,
  banner_url text,
  website text,
  country char(2) check (country is null or country ~ '^[A-Z]{2}$'),
  city text,
  city_visible boolean not null default false,
  timezone text not null default 'UTC',
  language text not null default 'en',
  role public.user_role not null default 'reader',
  status public.account_status not null default 'active',
  status_reason text,
  suspended_until timestamptz,
  verified boolean not null default false,
  who_can_message text not null default 'everyone' check (who_can_message in ('everyone','followers')),
  follower_count integer not null default 0,
  following_count integer not null default 0,
  creation_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_key unique (username),
  constraint profiles_username_format check (username::text ~ '^[a-z0-9_]{3,30}$'),
  constraint profiles_suspension_has_end check (status <> 'suspended' or suspended_until is not null)
);

create unique index one_founder on public.profiles ((true)) where role = 'founder';

alter table public.profiles enable row level security;

comment on column public.profiles.who_can_message is
  'Safe Space for messages. This step allows everyone or followers. Subscribers is a later step.';

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;

create table public.creations (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  type public.creation_type not null,
  title text check (title is null or char_length(title) <= 200),
  caption text check (caption is null or char_length(caption) <= 2200),
  body_json jsonb,
  body_text text,
  cover_url text,
  media_url text,
  media_meta jsonb not null default '{}'::jsonb,
  genre text,
  mood text,
  language text not null default 'en',
  country char(2) check (country is null or country ~ '^[A-Z]{2}$'),
  audience public.audience not null default 'private',
  status public.publish_status not null default 'draft',
  is_removed boolean not null default false,
  removed_reason text,
  published_at timestamptz,
  view_count integer not null default 0,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  save_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_tsv tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(caption, '') || ' ' || coalesce(left(body_text, 20000), '')
    )
  ) stored
);

create index creations_search_idx on public.creations using gin (search_tsv);
create index creations_author_created_idx on public.creations (author_id, created_at desc);
create index creations_feed_idx on public.creations (status, audience, published_at desc);
create index creations_type_idx on public.creations (type);

alter table public.creations enable row level security;

create table public.creation_tags (
  creation_id uuid not null references public.creations(id) on delete cascade,
  tag citext not null,
  primary key (creation_id, tag),
  constraint creation_tags_tag_format check (tag::text ~ '^[a-z0-9_]{1,40}$')
);

create index creation_tags_tag_idx on public.creation_tags (tag);

alter table public.creation_tags enable row level security;

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.creations(id) on delete cascade,
  position integer not null,
  title text,
  body_json jsonb,
  body_text text,
  status public.publish_status not null default 'draft',
  is_removed boolean not null default false,
  published_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, position) deferrable initially deferred
);

alter table public.chapters enable row level security;

create or replace function public.enforce_chapter_book() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.creations c
    where c.id = new.book_id and c.type = 'book'
  ) then
    raise exception 'chapters belong to a book';
  end if;
  return new;
end $$;

create trigger chapters_enforce_book
  before insert or update of book_id on public.chapters
  for each row execute function public.enforce_chapter_book();

create table public.reading_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.creations(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete set null,
  percent numeric(5,2) not null default 0 check (percent between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

alter table public.reading_progress enable row level security;

create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  creation_id uuid not null references public.creations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, creation_id)
);

alter table public.likes enable row level security;

create table public.saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  creation_id uuid not null references public.creations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, creation_id)
);

alter table public.saves enable row level security;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  creation_id uuid not null references public.creations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  is_removed boolean not null default false,
  removed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  target_type public.report_target not null,
  target_id uuid not null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 500),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (reporter_id, target_type, target_id)
);

create index reports_status_created_idx on public.reports (status, created_at);

alter table public.reports enable row level security;

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  action public.mod_action not null,
  target_type text not null,
  target_id uuid,
  target_user_id uuid,
  report_id uuid,
  reason text not null check (btrim(reason) <> ''),
  created_at timestamptz not null default now()
);

alter table public.moderation_actions enable row level security;

comment on table public.moderation_actions is
  'Insert-only audit log. No foreign keys, so a row survives account deletion. Updates and deletes are rejected.';

create table public.warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

alter table public.warnings enable row level security;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('like','comment','reply','follow','message','new_chapter','warning')),
  target_type text,
  target_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger creations_set_updated_at
  before update on public.creations
  for each row execute function public.set_updated_at();

create trigger chapters_set_updated_at
  before update on public.chapters
  for each row execute function public.set_updated_at();

create trigger reading_progress_set_updated_at
  before update on public.reading_progress
  for each row execute function public.set_updated_at();

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();
