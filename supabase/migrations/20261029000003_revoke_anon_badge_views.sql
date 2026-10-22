revoke all on public.user_badges_public from public, anon;
revoke all on public.profile_feed_badges from public, anon;
grant select on public.user_badges_public to authenticated;
grant select on public.profile_feed_badges to authenticated;

drop policy if exists user_pinned_badges_own on public.user_pinned_badges;
revoke insert, update, delete on public.user_pinned_badges from authenticated;
