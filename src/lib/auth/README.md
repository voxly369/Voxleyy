# Auth follow-ups

TODO. These are later steps from spec sections 14 and 17.1. They are not part of this sign-in flow.

- Google sign-in
- Email two-factor

TODO. Founder reading of profiles.status_reason comes later through a Founder-only function. Authenticated and anon must not select that column. founder_set_user_status still writes it as a security definer function.

## Known limits (feed, profile, and creation)

- **For You** ranked feed is not built yet (switcher label only).
- **Home suggestions mix** is not built; Home shows newest public work from everyone until the ranking prompt.
- **@mention notifications** are stored in `mentions` but notification delivery arrives with the notifications prompt.
- **Most played** profile pin waits for view/play counting (see `pickMostPlayed`).
- **Profile tabs not built:** Storefront, Analytics, Collabs (scheduled in later prompts).
- **Create flows not built yet:** recitation video, voice clip, podcast, book builder, course, event, collab (shown as Coming soon in the sheet).
