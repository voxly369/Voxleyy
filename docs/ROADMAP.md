# Voxly build roadmap

This file tracks **evidence on `main`**, **partial work**, and the **ordered remaining build**. It implements the owner decisions recorded in `docs/SPEC.md` (sections 11, 17–18, 20–26). Prompt estimates are planning guides only.

---

## A. Built and proven on `main`

Each row needs a **named test or e2e** on `main` to stay DONE (see Part 3).

| Area | Main evidence |
|------|----------------|
| Sign-up | `e2e/signup-invite-gate.spec.ts`, `SignUpPage.test.tsx`, `signupInviteGate.test.ts` |
| Sign-in | Auth e2e / layout auth screens, `loginSchema` in `schemas.test.ts` |
| Invite beta & invite codes | `e2e/founder-beta-invite.spec.ts`, `founderSignup.test.ts`, `inviteCodeFormSchema.test.ts` |
| MFA (email 2FA) | `e2e/beta-readiness-18b-stage-a-mfa.spec.ts`, `MfaChallengeScreen.test.tsx`, `assurance.test.ts` |
| Entrance (swipe, animation, fresh open) | `e2e/entrance-fresh-open.spec.ts`, `e2e/entrance-19a.spec.ts`, `entranceSchedule.test.ts`, `swipeEnter.test.ts`, `EntranceScreen.test.tsx` |
| Home greeting & onboarding | `e2e/beta-readiness-18b.spec.ts`, `HomeGreeting.test.tsx`, `OnboardingFlow.test.tsx`, `stepMachine.test.ts` |
| Quote of the day / daily prompt | `quoteOfDay.test.ts`, `dailyQuoteView.test.ts`, home e2e |
| Countries & local time | `countries.test.ts`, `CountryPage.test.tsx`, signup country prefill tests |
| Languages on posts & Discover filters | `LanguagePicker.test.tsx`, `discoverQuery.test.ts`, `DiscoverLanguageFilterChips.test.tsx`, `e2e/beta-readiness-18b-stage-b.spec.ts` |
| Verified seal & About sheet | `VerifiedSeal.test.tsx`, `verifiedSealSizes.test.ts`, `verifiedSealContrast.test.ts`, `AboutProfileSheet.test.tsx`, `e2e/beta-readiness-18c-profile-layout.spec.ts` |
| Founder badge / emblem | `FounderEmblem.tsx` + badge audit tests |
| Profiles (photos, badges, layout) | `beta-readiness-18c-profile-layout.spec.ts`, `ProfileHeader`, image upload tests |
| Home & Following feeds | `listFeed.test.ts`, `HomePage.test.tsx`, layout home screens |
| Written posts & editor | Creation autosave tests, publish tests, `e2e/layout.spec.ts` editor routes |
| Books & reader | `e2e/book-chapter-reader.spec.ts`, `BookBuilderForm.test.ts`, `bookValidation.test.ts` |
| Library & highlights | `e2e/library-reading.spec.ts`, `e2e/reader-part-2.spec.ts` |
| Direct messages & Quiet mode | `e2e/messages-15a.spec.ts`, `e2e/messages-15b.spec.ts`, `e2e/messages-16b.spec.ts`, `ConversationList.test.tsx` |
| Notifications & bell | `e2e/notifications-13a.spec.ts`, `NotificationRow.test.tsx` |
| Discover & search | `e2e/discover.spec.ts`, `discoverQuery.test.ts`, `tagLink.test.ts` |
| Reporting, block, mute | `e2e/moderation-12a-ext.spec.ts`, `e2e/moderation-12b-*.spec.ts`, `reportSchema.test.ts` |
| Founder tools & analytics | `e2e/moderation-12b-founder.spec.ts`, `e2e/founder-analytics-17a.spec.ts`, `e2e/founder-analytics-17b.spec.ts`, `FounderAnalyticsPanel.test.tsx` |
| Feedback | `FeedbackModal.test.tsx`, `FounderFeedbackTab.test.tsx`, beta readiness e2e |
| Account deletion & export | `DeleteAccountModal.test.tsx`, `e2e/account-deletion-messages.spec.ts`, `e2e/beta-readiness-18b-stage-a-finish.spec.ts` (export download) |
| Settings shell | Layout settings screens, MFA/delete flows |
| Country pages | `CountryPage.test.tsx`, discover country filters |
| Book builder | `BookBuilderForm.test.ts`, book-builder e2e |
| RLS & security rules | `supabase/tests/rls_smoke_test.sql` named `pg_temp.record` assertions, `clientStorageAudit.test.ts`, `hook-safety.spec.ts` |
| Cover Studio 2 (Canva-style) | PR [#56](https://github.com/voxly369/Voxleyy/pull/56); `e2e/cover-studio-19b.spec.ts`, `CoverStudioToolbar.test.tsx`, `CoverStudioTextInspector.test.tsx`, related cover-studio-19b tests |
| Cover Studio hardening | PR [#57](https://github.com/voxly369/Voxleyy/pull/57); `e2e/cover-studio-19b-hardening.spec.ts` |
| Phase 3 cleanup (hide unbuilt Create/Discover surfaces) | PR [#58](https://github.com/voxly369/Voxleyy/pull/58); `src/pages/discoverLiveRemoved.test.ts`, `src/components/creations/CreateTypePicker.test.tsx` |
| Auto-hide at 3 distinct reports | `supabase/migrations/20261117000001_auto_hide_report_threshold.sql`, `src/lib/safety/autoHide.test.ts`, `e2e/auto-hide-moderation.spec.ts`, RLS smoke auto-hide assertions in `supabase/tests/rls_smoke_test.sql` |

---

## B. Built but partial

| Area | What is missing vs spec |
|------|-------------------------|
| **For You feed** | Tab hidden behind `SHOW_FOR_YOU_FEED_TAB` (`productFlags.ts`, `FeedSwitcher.tsx`); no full-screen ranked FYP. Evidence: `forYouScreen.test.ts`. |
| **Communities & Channels** | Discover Communities tab partial; Channels (500+ followers) not built; messaging categories incomplete. |
| **Slam & Discover performance tabs** | Slam/Live placeholders on Discover (`DiscoverPage.tsx`); spec removes Live—Slam, Battles and Duets not wired. |
| **Challenges** | Spec leaderboard/time-left/“Ended”; no full challenge product surface. |
| **Monthly report & Founder insights** | Partial analytics panels and CSV; automated monthly report, month-start/month-end emails not built. |
| **Creator Dashboard** | UI shell; subscriptions/wallet/sales placeholders until payments. |
| **Founder Dashboard** | Many tabs partial; revenue/payout views await payments; full §11/§22 scope not done. |
| **Book writing tools** | EPUB/Markdown import and spec-complete formatting/preview not done. |
| **Reader modes** | Reader exists; spec requires **page flip and scroll both** with remembered preference—verify/implement per roadmap phase 1. |
| **Storefront/checkout** | Browse/product partial; no PayFast/Stripe/Stitch checkout. |
| **Google sign-in** | Not implemented; scheduled before **second invite wave** (spec §14, §17). |
| **Entrance music** | Logic/tests exist; owner track not wired in `public/audio`. |
| **Signed-out teaser** | Spec: title + first lines public; app largely sign-in-gated today. |
| **Country Vibe banner** | Country pages exist; themed vibe banner + mood palette not spec-complete. |
| **Duets (Two Hits)** | Spec §9 collaborative duets; no join/share UI on main. |
| **Battles** | Spec §9 competitive rounds, voting, Battle Winner badge + Discover feature; not built on main. |
| **Trending Sounds & ambient mood** | Spec first release; not product-complete on main. |
| **Organisation accounts & Legacy Archive** | Spec first release; not on main. |
| **Leagues & Wrapped** | Spec first release; not on main. |
| **Emails** | Spec lists welcome, transactional, month-start, month-end; not fully implemented. |
| **Notifications** | Quiet hold partial; daily digest and scheduled posts/messages incomplete. |

---

## C. Not built — order of build

Use this order exactly. **Est. prompts** = rough numbered-prompt count. **Owner input** = when Founder must choose copy, assets, or policy.

| Phase | Work | Est. prompts | Owner input |
|------:|------|-------------:|-------------|
| 1 | Book writing tools (formatting, fonts, preview, EPUB & Markdown import) | 3–5 | Font choices |
| 2 | Entrance music (owner track in `public/audio`; wire per `ops/ENTRANCE-MUSIC.md`) | 1 | **Audio file** |
| 3 | **Done on main** — hide unbuilt Create/Discover options (PR #58; see section A) | — | Which order to unhide when re-enabling types |
| 4 | **Partial on main** — auto-hide at 3 distinct reports shipped (migration `20261117000001`); 3-strike final warning flow still to spec-complete | 1–2 | Warning copy and suspend policy |
| 5 | Signed-out teaser (title + first lines) and Country Vibe themed banner | 2–3 | Teaser length; banner art direction |
| 6 | §24 first-release batch: shelves, ratings/reviews, scheduled releases; daily goals, streak protection, Writing Month, Daily Line; monthly report, Founder insights & **full** Founder Dashboard; reading diary, public lists, popular highlights; **leagues & Wrapped** | 8–12 | Report sections; league rules |
| 7 | Notifications: held until Quiet ends, daily digest, scheduled posts & messages | 3–4 | Default digest time |
| 8 | Emails: Founder welcome, transactional, month-start events, month-end recap | 3–4 | **Copy** for each template |
| 9 | Events & announcements in local time, scheduled by time zone | 2–3 | |
| 10 | Communities, channels, community roles, Slam, **Battles**, **Duets (Two Hits)**, challenges, Discover growth, **For You**, trending sounds, ambient mood | 10–14 | **Founder-approved Battle rules page**; Slam formats |
| 11 | Create types: video, voice clip, podcast, recitation, collab, course, event (record-and-post only) | 8–10 | Max duration limits |
| 12 | Writing Clubs and live co-writing (**written parts only**) | 3–5 | |
| 13 | Creator Dashboard (all non-payment sections) | 3–4 | |
| 14 | Organisation accounts and Legacy Literature Archive | 4–6 | Legacy curation policy |
| 15 | Google sign-in (before **second invite wave**) | 2 | Google Cloud OAuth consent |
| 16 | Settings: confirm complete, no further work | 1 | Sign-off |
| 17 | Monitoring, backups and production data plan | 2–3 | **Hosting/ops** choices |
| 18 | Voxly Book ID (check digit), rights registry, external ISBN outline for off-platform retail | 3–4 | |
| 19 | Payments, wallet, checkout, supporter tiers, commissions, gifts (**PayFast, Stripe, Stitch**) | 6–10 | **Merchant accounts**, pricing |
| 20 | Legal and compliance, then launch readiness | 3–5 | **Legal review** |
| 21 | **Later:** Pen Pals, AI suite, translated UI, Capacitor app | (backlog) | See spec §26 |

---

## Part 3 — Rules for every future prompt

- A feature is **DONE** only when a **named test passes on `main`**. Anything reported DONE must stay done.
- Run the **full e2e suite once per phase**, at the end. Run only **targeted tests** during the work.
- Do **not** re-run a test to confirm it unless it failed for a reason not yet found.
- A **merge needs a green full suite** when a phase ends.
