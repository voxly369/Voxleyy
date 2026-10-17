-- Voxly 0004. Paste after 0003.
-- The anon role receives nothing. Policies are for authenticated only.
-- Row-level security is not forced on the table owner. security definer functions run as that owner
-- and must be able to insert the audit log and maintain counters. Authenticated callers still need a policy.
-- Column grants are the lock on role, status, verified, counters, is_removed, removed_reason, and published_at.
-- There is no badges column in this step.
-- Unlisted published work is readable by any signed-in user who is not blocked. A selected-audience list does not exist yet.
-- Comment updates and deletes also require an active account, so a suspended or banned user cannot write.
-- A warning can be marked seen. seen_at cannot be cleared back to null.

revoke all on all tables in schema public from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant update (
  username, display_name, bio, avatar_url, banner_url, website, country, city, city_visible,
  timezone, language, who_can_message
) on public.profiles to authenticated;

grant select on public.creations to authenticated;
grant insert (
  author_id, type, title, caption, body_json, body_text, cover_url, media_url, media_meta,
  genre, mood, language, country, audience, status
) on public.creations to authenticated;
grant update (
  title, caption, body_json, body_text, cover_url, media_url, media_meta,
  genre, mood, language, country, audience, status
) on public.creations to authenticated;
grant delete on public.creations to authenticated;

grant select, delete on public.creation_tags to authenticated;
grant insert (creation_id, tag) on public.creation_tags to authenticated;
grant update (tag) on public.creation_tags to authenticated;

grant select, delete on public.chapters to authenticated;
grant insert (book_id, position, title, body_json, body_text, status, scheduled_for)
  on public.chapters to authenticated;
grant update (book_id, position, title, body_json, body_text, status, scheduled_for)
  on public.chapters to authenticated;

grant select, delete on public.reading_progress to authenticated;
grant insert (user_id, book_id, chapter_id, percent) on public.reading_progress to authenticated;
grant update (chapter_id, percent) on public.reading_progress to authenticated;

grant select, delete on public.likes to authenticated;
grant insert (user_id, creation_id) on public.likes to authenticated;

grant select, delete on public.saves to authenticated;
grant insert (user_id, creation_id) on public.saves to authenticated;

grant select, delete on public.comments to authenticated;
grant insert (creation_id, author_id, parent_id, body) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;

grant select, delete on public.follows to authenticated;
grant insert (follower_id, followee_id) on public.follows to authenticated;

grant select, delete on public.blocks to authenticated;
grant insert (blocker_id, blocked_id) on public.blocks to authenticated;

grant select on public.reports to authenticated;
grant insert (target_type, target_id, reported_user_id, reason, details) on public.reports to authenticated;

grant select on public.moderation_actions to authenticated;

grant select on public.warnings to authenticated;
grant update (seen_at) on public.warnings to authenticated;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_founder()
    or (status <> 'banned' and not public.is_blocked_between(auth.uid(), id))
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy creations_select on public.creations
  for select to authenticated
  using (
    author_id = auth.uid()
    or (
      status = 'published'
      and is_removed = false
      and audience in ('public', 'unlisted')
      and not public.is_blocked_between(auth.uid(), author_id)
      and exists (
        select 1 from public.profiles p
        where p.id = author_id and p.status <> 'banned'
      )
    )
    or (
      public.is_founder()
      and status in ('published', 'removed')
      and (
        audience <> 'private'
        or exists (
          select 1 from public.reports r
          where r.target_type = 'creation'
            and r.target_id = creations.id
            and r.status = 'open'
        )
      )
    )
  );

create policy creations_insert on public.creations
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_active_user()
    and status in ('draft', 'published')
  );

create policy creations_update on public.creations
  for update to authenticated
  using (author_id = auth.uid() and is_removed = false)
  with check (
    author_id = auth.uid()
    and public.is_active_user()
    and status in ('draft', 'published')
  );

create policy creations_delete on public.creations
  for delete to authenticated
  using (author_id = auth.uid());

create policy creation_tags_select on public.creation_tags
  for select to authenticated
  using (public.can_view_creation(creation_id));

create policy creation_tags_insert on public.creation_tags
  for insert to authenticated
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.creations c
      where c.id = creation_id
        and c.author_id = auth.uid()
        and c.is_removed = false
    )
  );

create policy creation_tags_update on public.creation_tags
  for update to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.creations c
      where c.id = creation_id
        and c.author_id = auth.uid()
        and c.is_removed = false
    )
  )
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.creations c
      where c.id = creation_id
        and c.author_id = auth.uid()
        and c.is_removed = false
    )
  );

create policy creation_tags_delete on public.creation_tags
  for delete to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.creations c
      where c.id = creation_id
        and c.author_id = auth.uid()
        and c.is_removed = false
    )
  );

create policy chapters_select on public.chapters
  for select to authenticated
  using (
    public.can_view_creation(book_id)
    and (
      (status = 'published' and is_removed = false)
      or exists (
        select 1 from public.creations c
        where c.id = book_id and c.author_id = auth.uid()
      )
    )
  );

create policy chapters_insert on public.chapters
  for insert to authenticated
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.creations c
      where c.id = book_id and c.author_id = auth.uid() and c.type = 'book' and c.is_removed = false
    )
  );

create policy chapters_update on public.chapters
  for update to authenticated
  using (
    is_removed = false
    and public.is_active_user()
    and exists (
      select 1 from public.creations c
      where c.id = book_id and c.author_id = auth.uid() and c.type = 'book'
    )
  )
  with check (
    public.is_active_user()
    and exists (
      select 1 from public.creations c
      where c.id = book_id and c.author_id = auth.uid() and c.type = 'book' and c.is_removed = false
    )
  );

create policy chapters_delete on public.chapters
  for delete to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.creations c
      where c.id = book_id and c.author_id = auth.uid()
    )
  );

create policy reading_progress_select on public.reading_progress
  for select to authenticated
  using (user_id = auth.uid());

create policy reading_progress_insert on public.reading_progress
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_creation(book_id));

create policy reading_progress_update on public.reading_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy reading_progress_delete on public.reading_progress
  for delete to authenticated
  using (user_id = auth.uid());

create policy likes_select on public.likes
  for select to authenticated
  using (user_id = auth.uid());

create policy likes_insert on public.likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and public.can_view_creation(creation_id)
  );

create policy likes_delete on public.likes
  for delete to authenticated
  using (user_id = auth.uid());

create policy saves_select on public.saves
  for select to authenticated
  using (user_id = auth.uid());

create policy saves_insert on public.saves
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and public.can_view_creation(creation_id)
  );

create policy saves_delete on public.saves
  for delete to authenticated
  using (user_id = auth.uid());

create policy comments_select on public.comments
  for select to authenticated
  using (
    public.can_view_creation(creation_id)
    and not public.is_blocked_between(auth.uid(), author_id)
    and (is_removed = false or author_id = auth.uid() or public.is_founder())
  );

create policy comments_insert on public.comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_active_user()
    and public.can_view_creation(creation_id)
  );

create policy comments_update on public.comments
  for update to authenticated
  using (author_id = auth.uid() and public.is_active_user())
  with check (author_id = auth.uid() and public.is_active_user());

create policy comments_delete on public.comments
  for delete to authenticated
  using (author_id = auth.uid() and public.is_active_user());

create policy follows_select on public.follows
  for select to authenticated
  using (
    not public.is_blocked_between(auth.uid(), follower_id)
    and not public.is_blocked_between(auth.uid(), followee_id)
  );

create policy follows_insert on public.follows
  for insert to authenticated
  with check (
    follower_id = auth.uid()
    and public.is_active_user()
    and not public.is_blocked_between(follower_id, followee_id)
  );

create policy follows_delete on public.follows
  for delete to authenticated
  using (follower_id = auth.uid());

create policy blocks_select on public.blocks
  for select to authenticated
  using (blocker_id = auth.uid());

create policy blocks_insert on public.blocks
  for insert to authenticated
  with check (blocker_id = auth.uid());

create policy blocks_delete on public.blocks
  for delete to authenticated
  using (blocker_id = auth.uid());

create policy reports_select on public.reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_founder());

create policy reports_insert on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_active_user());

create policy moderation_actions_select on public.moderation_actions
  for select to authenticated
  using (public.is_founder());

create policy warnings_select on public.warnings
  for select to authenticated
  using (user_id = auth.uid() or public.is_founder());

create policy warnings_update on public.warnings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and seen_at is not null);

create policy notifications_select on public.notifications
  for select to authenticated
  using (recipient_id = auth.uid());

create policy notifications_update on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
