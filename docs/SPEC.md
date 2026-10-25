> **SOURCE OF TRUTH.** This file is the final, authoritative specification for Voxly. If anything in `docs/reference/` (images) or in any older document disagrees with this file, THIS FILE WINS. The images are out of date and show only the general look and feel. Build in numbered prompts, one at a time; features not in the current prompt are scheduled for later, not cancelled.
>
> **Build status and phase order:** `docs/ROADMAP.md` records what is built on `main`, what is partial, and the ordered remaining work.

# Voxly: Product and Platform Specification

## 1. Vision and product overview

Voxly is one platform where writers and spoken-word performers share, publish and sell their work, and where readers discover, follow, read, listen and buy it. It replaces the stack a writer juggles today: a short-video app for clips, a blogging platform for long-form, a serial-fiction site for chapters, a self-publishing store for books, a design tool for covers and quote cards, and a separate inbox on each.

**Positioning.** The scroll feed and social graph of TikTok and Instagram, the reading experience and writer-owned audience of Medium and Substack, the serialized chapters of Wattpad and Inkitt, the self-publishing and storefront of Amazon KDP, and the creation tools of Canva, scoped to writing and spoken word.

**Founder.** Jaydin Donough.

Voxly is several products working as one: a social feed, a creation suite, a marketplace with a creator wallet, messaging and communities, a discovery engine, and a Founder control centre. It is planned and built as a platform.

**Core loop.** Sign up, discover writers, follow, join communities, save work, publish, gain followers, earn.

### What Voxly takes from each reference

| Reference                  | What Voxly takes                                                                       |
|----------------------------|----------------------------------------------------------------------------------------|
| TikTok                     | Full-screen vertical For You feed, sound trends, duets, engagement ranking (no live broadcast) |
| Instagram                  | Continuous feed, follow graph, profile grid, grouped Settings                          |
| Medium                     | Editorial reading typography, clean long-form writing                                  |
| Substack                   | Writer-owned audience, direct writer-to-reader relationship, broadcast channels        |
| Wattpad                    | Serialized chapter reading, discovery of ongoing works                                 |
| Inkitt                     | Cover-forward browsing, shelf-style library                                            |
| Amazon KDP / Draft2Digital | Self-publishing: write or upload a book, set a price, sell directly                    |
| Amazon / Takealot          | Storefront listings, purchase flow, buyer library of owned items                       |
| Canva                      | In-app quote-card and cover design tools                                               |

### Product principles

1.  **Writers first.** Writers keep 80% of every sale; the platform keeps 20%. The split is fixed and visible to writers.

2.  **Writers own their work.** They can export it and leave at any time.

3.  **Real data only.** Every count, follower number, play and earning comes from a real action. No fake engagement and no demo data in production.

4.  **Rule-based, explainable discovery.** Ranking uses transparent rules (watch time, replays, likes, saves, comments, recency). Weights are adjustable and the rules are public. Nobody can pay to be ranked above others.

5.  **Fair marketplace.** No seller, and not the platform itself, is favoured by payment alone.

6.  **Everyone is bound by the rules.** Platform rules apply to every account including the Founder, and every Founder action is recorded in an insert-only audit log.

7.  **Premium quality.** The product must look and feel better than Instagram, TikTok, Medium, Tapas and Inkitt: no templated or default-component look.

8.  **World-class infrastructure.** Choose the best tool for each job for performance, security, reliability and design.

9.  **Identity belongs to the account, not the device.** Sign-in persists (remember me) and works across devices.

**Voxly is a closed, immersive environment.** Everything is read, heard and watched inside the app. There is no sharing to other social platforms and no downloads or external links to paid or published work, which protects writers from plagiarism and keeps readers inside the Voxly experience (section 23).

### Name

Voxly comes from *vox*, Latin for voice. A trademark application for "VOXLY" in voice and audio recording software classes was filed in September 2024, and an unrelated game named Voxly exists on Google Play. Obtain a trademark-attorney clearance before filing in software classes or publishing to the app stores.

## 2. Roles and permissions

There are three roles. Only the Founder moderates or administers anything. There is no moderator role, no admin role and no invite flow for either.

- **Reader.** The default for every new account.

- **Writer.** Unlocked automatically the moment a Reader publishes their first piece. No application, approval or waiting.

- **Founder.** One permanently locked account: voxly369@gmail.com. The role is decided on the server and in database rules, never by a client-sent value or a role picker. The role is granted only to that verified email, first-run setup locks itself after use, and no copycat account can ever become Founder.

| Capability                                                                            | Reader                            | Writer                   | Founder |
|---------------------------------------------------------------------------------------|-----------------------------------|--------------------------|---------|
| Discover, read, listen, search                                                        | Yes                               | Yes                      | Yes     |
| Follow, like, comment, save                                                           | Yes                               | Yes                      | Yes     |
| Personal Library (saved, purchased, reading progress, collections)                    | Yes                               | Yes                      | Yes     |
| Join Communities, send DMs (subject to the recipient's Safe Space)                    | Yes                               | Yes                      | Yes     |
| Buy, rent or subscribe to paid content                                                | Yes                               | Yes                      | Yes     |
| Buy the Verified badge                                                                | Yes                               | Yes                      | Yes     |
| Report content, block and mute users                                                  | Yes                               | Yes                      | Yes     |
| Publish posts and use the creation flows                                              | First publish makes them a Writer | Yes                      | Yes     |
| Storefront, pricing, Creator Wallet, payouts                                          | No                                | Yes                      | Yes     |
| Creator Dashboard and own analytics                                                   | No                                | Yes                      | Yes     |
| Earn badges automatically                                                             | No                                | Yes                      | Yes     |
| Run a broadcast Channel                                                               | No                                | At 500 or more followers | Yes     |
| Founder Dashboard, report queue, user management, audit log                           | No                                | No                       | Yes     |
| Award Featured badge, curate Featured Writers, set Word of the Day, create challenges | No                                | No                       | Yes     |
| Remove content, warn, suspend or ban users, review appeals                            | No                                | No                       | Yes     |

### Enforcement rules

1.  Every permission is enforced in the database with row-level security or equivalent server rules. Hiding a button or route in the interface is never enough: a user who guesses a URL or calls the API directly must still be refused.

2.  A user can never change their own role, status, verified flag or badges.

3.  Founder access is a server-side check against the single Founder account. The Founder Dashboard entry is hidden for everyone else and its URL redirects anyone else to Home.

4.  Every account has a status: active, suspended (with an end date) or banned, plus a reason. Suspended and banned users cannot post, comment, message or follow, blocked at the database level. A banned user sees a clear 'account banned' screen on sign-in and can open an appeal.

5.  Safe Space (who may message or interact with a writer: Everyone, Followers only, Subscribers only) is enforced on the server, not only in the interface.

## 3. Content model

Everything on Voxly is a **Creation**. One content model carries every format, so a single set of rules for visibility, ranking, reporting, saving and selling applies to all of them.

| Creation type               | Description                                                  |
|-----------------------------|--------------------------------------------------------------|
| Poem, story, essay, article | Written pieces published in-app                              |
| Lyric, letter, script       | Other written forms                                          |
| Journal / work in progress  | Raw writing, public, unlisted or private                     |
| Book                        | A Creation with ordered chapters, a cover and optional price |
| Recitation video            | Performed piece recorded on video                            |
| Voice clip / audio          | Voice-only performance with waveform                         |
| Podcast                     | Episodic audio                                               |
| Quote card                  | Designed text graphic                                        |
| Book / chapter clip         | Teaser tied to a storefront book or chapter                  |
| Course                      | A sequenced set of lessons from a writer                     |
| Event                       | A reading, launch or open mic with date, place or link       |
| Collaboration               | A piece co-created and approved by two writers               |

Every Creation has an author, type, title (optional for posts), body or media, genre, mood, language, country, tags, audience (public, unlisted, private), status (draft, published, removed), and real counts for views, likes, comments, saves and shares.

**Books and chapters.** A book is made of ordered chapters. Writers can publish a book whole or one chapter at a time (serialized reading). The chapter reader has previous and next, a table of contents, adjustable text size and theme, and saves each reader's progress so reading resumes where it stopped. Followers are notified when a new chapter is published.

## 4. Feeds and ranking

The feed is three experiences for three reading moods.

1.  **Home.** A continuous multi-post scroll in the Instagram style. Several pieces are visible at once, mixing posts from followed writers with suggestions.

2.  **For You (FYP).** A full-screen, one-post-at-a-time snap scroll in the TikTok style. Swipe up for the next piece. Ranked by transparent rules.

3.  **Following.** Only posts from writers the reader follows, newest first, no ranking.

Home, For You and Following are reachable from a clear switcher at the top of the home screen.

### Ranking rules

- Inputs: watch time, replays, likes, saves, comments and recency.

- Every factor and weight is a stored, adjustable setting and is explainable. No black box.

- Rising Voices, Trending, Top Poems and Top Stories use the same engagement score, filtered by account size or tag.

- Blocked users, removed content, suspended or banned authors, private journals and drafts never appear in any feed.

### A single post

- A video autoplays (muted until the first tap, then sound on). A quote card or text post renders as a styled card.

- Double-tap to like. The comment icon opens threaded comments with @mentions. Save bookmarks to the Library. Share sends it to a DM, Community or Channel inside Voxly; nothing is shared outside the app. Swipe to the author's profile.

- The three-dot menu holds Report and Block for other people's posts.

- Every post carries a caption, tags and comments. Comments support replies and @mentions. A mentioned writer is notified and the mention is tappable.

- A post removed by the Founder is hidden from everyone except the Founder.

**Performance.** Lazy-load media, preload the next For You item, show skeletons while loading, and never show a broken-image icon (see section 15).

## 5. Content creation and publishing tools

Each format has its own purpose-built flow, opened from the persistent coral Create (+) button as a sheet titled 'What will you share?'. The sheet scrolls as one piece, has bottom padding so the last option is never clipped, and groups options (Video and voice, Written, Collab).

Every flow includes: tags or hashtags, an audience selector, a caption field, Save as Draft, and Preview before publishing.

| Flow                | What it does                                                                                                                                                                                                                                                                                                                                            |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Recitation Video    | Record in-app (front or back camera) or import from the gallery. Trim, add a text overlay of the poem or line, choose a filter (Original, Warm, Cool, Dramatic), optionally add a background instrumental, preview, publish                                                                                                                             |
| Voice Clip          | Record voice only. Shown as an audio post with a waveform and the poem text                                                                                                                                                                                                                                                                             |
| Quote Card          | Canva-style tool. Type the line, see it render live, choose background colour, text colour and size, optionally add music. Produces a graphic that lives in the app and is posted and shared only inside Voxly. Style: bold text on a plain dark background, short and punchy, a reflective question to the audience, the author's handle at the bottom |
| Book / Chapter Clip | Upload a short teaser video or audio excerpt tied to a storefront book or chapter. Optional 'Book Flip' animation: a 3D page turn revealing the cover and first page                                                                                                                                                                                    |
| WIP / Journal       | A raw writing space in a notes-app style. Audience: Public (share the process), Private (personal only) or Unlisted (selected audience). Private and unlisted entries never appear in feeds, profiles, search or Discover and never show play counts                                                                                                    |
| Written Post        | Full rich-text editor (bold, italic, headings, line breaks) for a complete poem, story, essay, lyric, letter or script                                                                                                                                                                                                                                  |
| Collab Post         | Two writers co-create one piece. Both approve before it publishes. Both avatars show on the post, and it appears in both writers' Collabs tab                                                                                                                                                                                                           |
| Book Builder        | Create a book with chapters, a cover and a price, then publish whole or chapter by chapter                                                                                                                                                                                                                                                              |
| Podcast and Course  | Episodic audio and sequenced lessons                                                                                                                                                                                                                                                                                                                    |
| Event               | Create a reading, launch or open mic with date, place or link, and RSVP                                                                                                                                                                                                                                                                                 |

All writing types are welcome: poems, stories, essays, prose, letters, scripts, lyrics and journaling.

**Linking a post to a book.** Any post in any flow can carry an optional 'From a book' link that leads straight to the book in the author's storefront (see 'From a post to a purchase' in section 7).

### Writing and publishing tools

- **Rich-text editor** to write directly in the app, with autosave.

- **Manuscript import** for .docx, .txt and .pdf with rule-based chapter-break detection (split on headings or on chapter markers the writer confirms).

- **Cover Studio.** Design a cover with templates, fonts, colours and image upload, or import a finished cover.

- **Pricing per book.** Free, one-time purchase, time-limited rental, or monthly subscription.

- **Rights registry and Voxly Book ID.** Every published book receives a **Voxly Book ID**: an internal identifier generated in the app, with a valid check digit, unique across the platform. It is never labelled or displayed as an ISBN. The rights registry stores author, first publication time and version for every Creation. A reserved Book ID expires after 30 days if the book is not published. **External ISBN (South Africa):** a real ISBN from the SA ISBN Agency is required only when a writer sells through external retailers later; that process follows the same outline as Amazon KDP, Draft2Digital and Notion Press—metadata form, one generated identifier per format, preview, then publish to the external channel.

- **Background music.** Writers upload their own audio; a licensed library may be added later.

- **Language on content (English interface).** The app interface stays in English. Each Creation declares its primary language; readers filter and search by language. Writers may add a translation or caption in another language on a post, the way creators do on Instagram, TikTok and Facebook. There is no translated app interface in the first release.

- **Export.** Writers can request a copy of their own work and data at any time, as a privacy right. Readers can never export or download paid or published work.

**Video and audio pipeline.** Creators **record and post** video and voice inside Voxly (in-app recording or import, trimming, filters, compression, thumbnails). There is **no live streaming**, no live broadcast and no live invite. Quote card and text flows ship before full video and voice creation flows.

**Drafts.** Every flow can save a draft. Drafts are private to the author, live in the Drafts tab on their own profile, are never counted as public posts, and are never ranked.

## 6. Profiles, badges, streaks and follows

Every profile shows an avatar, banner, display name, username, bio with clickable links, a country flag with the country name, a Writer tag where it applies, badges, and the stats Posts, Followers and Following. All counts come from real data. A new account shows 0 posts and 0 followers.

**Buttons.** Own profile: Edit profile, Library and a go-live shortcut. Someone else's profile: Follow or Following, Message (if their Safe Space allows it) and a three-dot menu with Report and Block.

### Profile tabs

1.  **Posts.** A grid of everything published, with the most-played piece pinned as 'Most played'. Long-press saves to the Library. Only published, public posts appear.

2.  **Drafts.** Own profile only. Drafts, WIP and private journal entries.

3.  **Storefront.** The writer's marketplace listings (section 7), rendered directly under the tab bar.

4.  **Analytics.** Own profile only. Views, watch time, likes, saves, sales and best-performing piece.

5.  **Collabs.** Collaborative posts grouped by type (Poetry, Story, Voice, Book).

The tab row scrolls horizontally with even spacing and keeps the active tab in view.

### Badges

Awarded automatically by stored rules, except Featured and Verified. A user can never edit their own badges.

| Badge          | Rule                                                                       |
|----------------|----------------------------------------------------------------------------|
| Spoken Word    | 5 published recitation videos                                              |
| Poet           | 5 published poems                                                          |
| Storyteller    | 5 published written posts                                                  |
| Voice          | 5 published voice clips                                                    |
| Author         | Listed a book in the storefront                                            |
| Trending       | 1,000 likes on one post                                                    |
| Rising Creator | 100 followers                                                              |
| Viral Creator  | 10,000 total likes                                                         |
| Featured       | Awarded by the Founder only                                                |
| Verified       | Purchased by the user. The only paid badge. One colour everywhere (Voxly coral accent) |

**Where badges show.** The profile has a Badges shelf directly under the bio: the three badges the user pins, and a 'See all' page listing every badge with its icon, description, date earned and progress toward the next one. Up to two badges also appear beside the name on posts and comments.

**Performance badges.** Awarded automatically when each month closes, by the same stored-rule engine, and announced in a notification and in the monthly report (section 22). They exist to give writers something to look forward to and a reason to return.

| Badge                                             | Rule                                                          |
|---------------------------------------------------|---------------------------------------------------------------|
| Poem of the Month                                 | Most-liked poem in the calendar month                         |
| Video of the Month                                | Top recitation video in the month                             |
| Slam Entrant, Finalist, Champion, Crowd Favourite | Results of Slam events (section 9)                            |
| Rising Star of the Month                          | Fastest follower growth among writers under 1,000 followers   |
| Most Read                                         | Most-read book or chapter in the month                        |
| Top Seller                                        | Highest sales in the month                                    |
| Streak badges                                     | 7, 30, 100 and 365 consecutive writing days                   |
| Community Builder                                 | Membership milestones in a community the writer created       |
| Pen Pal, Global Correspondent                     | Sustained Pen Pal exchanges (see section 26; not in the first release) |
| Monthly Top 10                                    | Placed in the platform's top ten writers for the month        |

**Writing streaks.** Tracked daily per writer in the writer's time zone. The profile shows the current and longest streak. A missed day resets the current streak. Reading streaks follow the same model.

**Follow system.** Follow and unfollow with counts that update at once. The Following feed and notifications depend on it. Blocking removes follows in both directions and hides content both ways.

**Country.** One country field, edited in Settings and shown on the profile as a flag plus the name. Used by Discover filters.

**Organisation accounts.** Publishers, schools and writing groups can hold an organisation profile with multiple members publishing under one name, with a clear organisation label. Organisation accounts are part of the **first release** (see `docs/ROADMAP.md`).

## 7. Marketplace, wallet and Library

The self-publishing and storefront layer. Writers publish and sell. Readers browse, buy and own. The platform takes a fixed 20%.

### Writer side: creating a listing

1.  Choose the type: book, single chapter, limited drop, course, or merch.

2.  Choose the sale model: free, one-time purchase, time-limited rental, or monthly subscription.

3.  Set the price.

4.  Design a cover in Cover Studio or import one.

5.  Publish. The listing goes live at once with no approval queue. Reported listings go through the report system.

### Reader side: buying

1.  Open a writer's storefront: a Featured product, then Latest Drops, filterable by All, Books, Chapters and Drops.

2.  Open the product page: cover, description, price, author, sale model, sample or preview.

3.  Buy through the payment provider.

4.  The purchase lands immediately in the buyer's Library under Purchased.

5.  Reading progress (for example 32%, 67%, Completed) tracks and syncs automatically.

A storefront always shows the profile owner as the author. Products are never duplicated. Product cards fit the screen width, wrap long titles and descriptions, and show cover, price and type in full.

### Money rules

- Fixed split on every sale: 80% to the writer, 20% to the platform.

- Creator Wallet shows earnings, pending payouts and a full transaction ledger. Writers request payouts from it.

- An insert-only ledger records every sale, refund, platform fee and payout so the numbers always reconcile.

- Payment provider: Stripe Connect (percentage fees, direct payouts) or PayFast. Confirm payout support for writers in South Africa before launch of the marketplace.

- Verified badge purchase uses the same provider.

- Marketplace fairness: ranking and placement rules are public; no paid placement can override them.

### Library

- **Purchased.** Everything bought, with a synced reading-progress bar.

- **Saved.** Everything bookmarked from the feed, opening directly on tap.

- **Reading history** and **Collections** that readers create and name.

- A chapter and book reader with editorial typography (Fraunces), a progress indicator, adjustable size and theme, and resume position.

### From a post to a purchase

A writer posts a poem, quote card, video or voice clip taken from a book and links it to that book. A reader who sees the post can reach the book in two taps.

1.  When creating or editing a post, the writer chooses 'Link to my book' and picks a book, chapter or drop from their own storefront.

2.  The post shows a tappable strip at the bottom, under the caption: the cover, 'From *Book title* by *Author*', and a visit-profile shortcut. It appears on every surface: Home, For You, Following, post detail and shares.

3.  Tapping opens the book's page inside the author's profile Storefront. It shows the cover, description, price and where the post sits in the book (for example 'Chapter 3').

4.  The reader chooses how to get it, according to the writer's sale model: Buy once, Rent for a set period, Subscribe monthly, Read a free sample, or Save to Library.

5.  Back returns to the post the reader came from.

6.  If the viewer already owns the book the strip reads 'Continue reading'. If the book is removed or unlisted the strip hides gracefully.

7.  Every tap is recorded (post, product, viewer, time) so that writers and the Founder can see which posts drive profile visits, book views and sales.

### Kindle-style reading experience

Reading on Voxly should feel as good as a dedicated e-reader.

- **Two reading modes in the first release:** page mode with a page-turn animation, and continuous scroll. The reader remembers the user's choice per account.

- Text size, font (Fraunces, other serif and sans options, a dyslexia-friendly font), line spacing, margins and justification.

- Themes: Paper, Sepia, Dark and Black, plus a brightness control.

- Table of contents, chapter navigation, progress percentage, pages left in the chapter and estimated time left.

- Highlights, notes and bookmarks that sync to the account.

- Word look-up.

- Offline reading of purchased and rented books, with rental expiry enforced, and reading position synced across devices.

- Library shown as a bookshelf of covers with filters (Reading, Finished, Rented, Subscribed), a 'Continue reading' row and days left on rentals.

- Paid text is delivered only to buyers and renters and is not downloadable as a raw file.

## 8. Messaging, communities and notifications

Messaging has three categories, not one flat inbox.

1.  **Direct messages.** Private one-to-one chat. Search any writer to start one. Share a post or clip directly into a conversation. Real-time delivery. Safe Space decides who may message a given writer (Everyone, Followers only, Subscribers only), enforced on the server.

2.  **Communities.** Group spaces tied to a writing interest. Anyone can create one; members join and leave freely. Members post and discuss, posts can be shared into the group, and a member list is visible in an info panel. Seed communities: Poetry, Fantasy, Romance, Self Publishing, Christian Writers, Short Stories.

3.  **Channels.** Read-only broadcast channels. A writer with 500 or more followers can run one. Followers receive posts and react with emoji.

**Behaviour rules.**

- Show the error state (with Retry) only when a query fails. Show the empty state ('No messages yet' with a Find Writers button) only when it succeeds with zero results. Never both.

- Blocked users cannot message each other. Suspended or banned users cannot send messages.

- Search covers DMs, communities and channels.

- Community controls (remove post, remove member) belong to the Founder.

### Notifications

Real-time alerts for: new follower, like, comment, reply, @mention, new message, collab invitation, community post, new chapter from a followed book, purchase or sale, challenge start, Founder announcement, and warning or moderation notice.

A bell icon shows an unread badge; opening it offers mark-all-as-read. Settings let each user turn each type on or off. The Founder also receives admin notifications: a new report, payout issues and platform milestones.

**Warnings.** A warning from the Founder appears as a one-time dialog with an 'I understand' button that records when it was seen.

### Respecting time zones

Voxly connects people across the world, for example South Africa and the United States, six to eight hours apart. Nobody should be woken by a message from someone for whom it is daytime.

- Every account stores a time zone, detected at sign-up and editable in Settings. People can choose to hide their local time (Settings, Privacy and safety, 'Show my local time').

- **Quiet mode is optional and entirely in the user's control.** It is off by default. A user can leave it off (a night owl, for instance), set a schedule (for example 23:00 to 08:00), or switch it on manually at any moment, like a Do Not Disturb or night mode. They can also choose who may still reach them while it is on: everyone, close contacts or nobody.

- Where shown, a person's local time appears on their profile and in the header of every chat, for example 'Amara, 02:14'.

- **Considerate sending.** The prompt appears only when the recipient's Quiet mode is actually on. The sender sees: 'Amara has Quiet mode on right now. Send quietly, deliver when they are back, or cancel?' If the recipient has Quiet mode off, no prompt appears, whatever the hour.

- **Notifications while Quiet mode is on:** push alerts and sounds are **held** until Quiet mode ends; the underlying event still arrives in the inbox so nothing is lost. When Quiet mode ends, a single summary alert is sent.

- **Daily digest:** batch notifications into one summary at a time the user chooses.

- **Scheduled delivery:** scheduled send for messages and scheduled posts for writers.

- **Events and announcements in local time:** events, Slam windows, duets, challenges and Founder announcements are **scheduled by time zone** and shown in each viewer's local time with a countdown. Reminders follow each user's Quiet mode.

## 9. Discover, search, challenges and growth

Discover is the rule-based discovery layer. Its tabs are Explore, Communities and Slam. (There is no Live tab: Voxly does not offer live streaming.)

### Explore sections, in order

| Section                             | Definition                                                                     |
|-------------------------------------|--------------------------------------------------------------------------------|
| Spoken Word of the Day              | The top-engagement recitation video from the last 24 hours, full width         |
| Featured Writers                    | Curated by the Founder, horizontal scroll with Follow buttons                  |
| Word of the Day                     | A daily writing prompt. 'Write now' opens Create pre-filled                    |
| Browse by Mood                      | Heartbreak, Motivation, Humor, Horror, Romance, Reflection, Anger, Hope        |
| Browse by Genre                     | Poetry, Fiction, Essays, Scripts, Lyrics, Journaling, Letters                  |
| Trending                            | Ranked by the engagement score (section 4)                                     |
| New                                 | Newest published work                                                          |
| Rising Voices                       | Writers under 1,000 followers gaining momentum, so small creators are surfaced |
| Top Poems and Top Stories this week | Highest-liked posts by tag                                                     |
| Trending Sounds                     | Most-used backing tracks; tapping one opens every post that used it (first release) |
| Trending Challenges                 | Active challenges with deadline and entry count                                |
| Search                              | Real-time search across writers, posts, books, communities and tags            |

Filters: genre, mood, language, country, trending, new. Mood and genre chip rows scroll horizontally from the left edge. Hashtag and topic pages (#spokenword, \#poetry, \#bookclip) are included.

### Growth features

- **Writing challenges.** Time-limited prompts with hashtag entry, a leaderboard, points per submission and engagement, and a weekly winner. Time remaining is computed from the end date and reads 'Ended' when passed. Created by the Founder.

- **Streaks.** See section 6.

- **Duets (also called Two Hits).** A writer posts a **part**, which can be text, audio or video. Another writer can join and post their **response part**. The original and the response appear together—side by side on wide screens and stacked on phones—and each keeps its own author, time and credit. Duets work for writing, voice and video. Any writer can start a duet from an eligible post; the original author can turn joins off for that post. Both authors' Safe Space, block and report rules apply in full.

- **Collabs.** See section 5.

- **Sound trends and Trending Sounds.** Backing tracks that spread across the platform; part of the first release.

- **No external sharing.** Voxly is in-app only. Work is shared inside Voxly (DMs, Communities, Channels), never exported to or posted on other platforms (see section 23).

- **@Mentions.** Tag any writer in a post or comment; they are notified.

- **Ambient mood.** A user-selected ambient sound and visual preset while reading or browsing (first release).

- **Founder announcements** to all users or a segment, scheduled and shown in each recipient's local time.

### Performance culture

- **Slam events.** Scheduled, asynchronous competitions—community-voted, bracket-style or open-entry—with clear start and end times, a Founder-approved rules page, and vote counts while voting is open. Entries are recorded posts (text, audio or video), not live performances.

- **Featured Stage.** A rotating daily or weekly spotlight slot.

Every empty state offers a clear action: Communities, 'Create the first community'; Slam, 'Learn how Slam works'.

### Slam events

Slam events are scheduled, community-voted competitions and are a core part of Voxly.

- **Official Slams.** Created by the Founder: title, theme, rules, format, entry window and schedule. These are the platform's flagship events.

- **Community Slams.** Any Writer can host their own Slam (to confirm with the Founder: whether this opens to all Writers or only to Writers above a follower or badge threshold). The host sets the theme, rules, format, entry window and schedule, and the same voting, protection and badge rules apply. The Founder can feature, pause or remove any Slam.

- **Formats.** Head-to-head bracket (weekly), open slam (everyone enters one piece and the community votes), and **Slam duets**—head-to-head **Duets (Two Hits)** under Slam rules the Founder approves, with community voting while the entry window is open.

- **Time zones.** The creator sets the time once; each event then shows start, close and results times in the viewer's own local time, with a countdown and an add-to-calendar button. Reminders follow each user's Quiet mode.

- **Entries.** A writer enters with a recitation video or voice clip inside the window and within the duration limit.

- **Voting.** One vote per user per matchup, a live vote count, no voting for yourself, and protection against fake votes (account age checks and rate limits). Results lock when voting closes.

- **Event page.** Bracket, entries, schedule, leaderboard, replays and the winner announcement, with a notification to the winner's followers.

- **Rewards.** Slam badges (Entrant, Finalist, Champion, Crowd Favourite), a Featured Stage slot for Official Slam winners, and a place in the monthly report.

- **Empty state.** 'Learn how Slam works' with the next event and a way to be notified.

## 10. Settings

Settings follows the Instagram pattern: a search bar, then grouped, tappable rows, each opening a subpage with one Save (or autosave with a confirmation toast), and Log out at the bottom.

| Group                  | Rows                                                                                                                                                                                       |
|------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Account                | Edit profile (name, bio, username, website, country), Change password, Verified badge, Two-factor authentication, Account status                                                           |
| Privacy and safety     | Who can DM me (Everyone, Followers, Subscribers), Comment controls, Tags and mentions, Sharing and reuse (who may quote or repost my work), Muted accounts, Blocked accounts, Hidden words |
| Notifications          | Toggles per type: likes, comments, follows, DMs, sales, chapters, announcements; Quiet mode (optional, off by default)                                                                     |
| Creator (Writers only) | Creator Dashboard, Earnings and payouts, Storefront settings                                                                                                                               |
| Purchases              | Orders, Rentals, Subscriptions                                                                                                                                                             |
| Your activity          | Saved, Likes, Comments, History                                                                                                                                                            |
| App                    | Dark or light mode, Accessibility, Download my data / export my work (interface English only; section 5)                                                                                   |
| Support                | Help, Report a problem, Appeal a decision                                                                                                                                                  |
| About                  | Version, About Voxly, Terms of Service, Privacy Policy                                                                                                                                     |
| Founder (Founder only) | Founder Dashboard                                                                                                                                                                          |
| Bottom                 | Log out, then Delete account with confirmation                                                                                                                                             |

'Sharing and reuse' is the plagiarism and repost control that a writing platform needs. The Founder Dashboard row appears only for the Founder; the Creator Dashboard row only for Writers.

## 11. Safety, moderation and the Founder dashboard

The Founder is the only moderator and the only administrator. Moderation is manual, with automatic guardrails below.

### Automatic hide and warnings

- When a **post, comment or profile** receives **3 to 5 distinct reports** (exact threshold stored in platform settings), it is **hidden automatically** and flagged for the Founder in the report queue.

- When a **user's posts** have been **flagged through this auto-hide rule 3 times**, the user receives a **final warning** (Founder message plus in-app dialog). **Suspension or ban** is always a **Founder decision** after that warning, never automatic.

### User safety tools (every user)

- **Safe Space.** Per-writer control over who can message, comment or interact: Everyone, Followers only, Subscribers only. Enforced on the server.

- **Block.** Hides their posts from your feed, blocks profile view and blocks DMs, in both directions.

- **Mute and hidden words.** Filter accounts and comment or message text without blocking.

- **Report.** Available in the three-dot menu on every post, comment and profile that is not your own. A sheet asks for a reason and optional details (up to 500 characters). Reasons: Spam, Inappropriate, Harassment, Copyright, Other. A user cannot report the same target twice and sees 'You already reported this'. Confirmation: 'Thanks, the Founder will review this.'

- **Appeals.** A suspended or banned user, or one whose content was removed, can submit an appeal; the Founder reviews and records the decision.

### Data for moderation

- **reports:** reporter, target type (post, comment, profile), target id, reason, details, status (open, dismissed, actioned), timestamps.

- **moderation_actions:** insert-only audit log of every action (dismiss, remove, warn, suspend, ban, unban, restore, appeal decision), with target, target user, linked report, reason and time. Nobody can edit or delete rows.

- **warnings:** user, message, created time, seen time.

- **appeals:** user, action appealed, message, status, decision, decided time.

- Posts and comments carry a removed flag and removal reason. Users carry a status (active, suspended with end date, banned) and a reason.

Row-level rules: any signed-in user can insert a report as themselves and read only their own reports. Only the Founder can read all reports, read the audit log, change user status, remove or restore content, and decide appeals.

### Founder dashboard

The **Founder Dashboard must be fully built** for launch: every section below wired to real data, with CSV export where specified. **Payment-dependent** sections (revenue totals, payouts due, top earners from sales) populate when payments go live; until then they show empty states, not placeholders labelled 'Coming soon'.

Reached from a row in Settings that only the Founder sees. Anyone else visiting the URL is redirected to Home and the database refuses the data. Mobile-friendly cards rather than wide tables.

1.  **Overview.** Total users and writers, new users in 7 and 30 days, daily active users, total followers, posts, comments, open reports, revenue, period-over-period change, and a signups-over-time chart.

2.  **Retention.** Day-1, day-7 and day-30 return rates; active versus inactive users.

3.  **Top content.** Highest-performing posts by plays, likes, saves and comments, filterable by day, week, month and all time.

4.  **Top creators.** Most followed, fastest growing, top earners.

5.  **Platform health.** Products listed, purchases, writer-to-reader ratio, recent signups with role, recent published posts.

6.  **Revenue.** Subscriptions, premium content sales, the platform's 20% share, payouts due.

7.  **Report queue.** Open reports filterable by reason and type. Opening one shows the content, reporter, reported user and that user's history. Actions: Dismiss, Remove content, Warn (with message), Suspend for 1, 7 or 30 days, Ban, Restore. Every action requires a reason and writes an audit row.

8.  **Users.** Search by name, username or email, showing role, status, joined date and followers. Open a user to see profile summary, posts, reports against them and history, with Warn, Suspend, Ban and Unban.

9.  **Content.** Browse all posts and comments with Remove and Restore.

10. **Communities.** Remove posts or members, and manage community controls.

11. **Appeals.** Review and decide.

12. **Announcements.** Send platform-wide or segmented announcements.

13. **Audit log.** Read-only, filterable by action.

14. **Curation.** Award the Featured badge, choose Featured Writers, set Word of the Day, create challenges.

**Engagement and click analytics, retention and the monthly report.** The Founder also sees follows, clicks and conversion, and controls the automated monthly report. These are specified in section 22.

**Oversight and privacy.** The Founder can see all public posts, premium content and its metadata. Private journals, private WIP and private DMs are not browsable by default; they open only when reported, and every such view is written to the audit log. The Terms of Service and Privacy Policy describe this plainly, in line with South Africa's POPIA and the promise made to users.

## 12. Creator Dashboard (every Writer)

Every Writer has their own dashboard under Settings, separate from the Founder's. A writer sees only their own data, enforced by row-level security. The **Creator Dashboard must be fully built** for launch. **Payment-dependent** sections (subscriptions, premium sales, wallet balance, payout history, Request payout) go live with payments; all other sections must work on real data before launch.

1.  **Overview.** Followers gained or lost in 7 and 30 days; total plays, likes, saves and comments.

2.  **My top posts.** Highest-performing pieces with a time filter.

3.  **Audience.** The followers who engage most and a count of returning readers.

4.  **Subscriptions.** Active subscribers, new and cancelled this month, monthly recurring revenue.

5.  **Premium content.** Sales and rentals per book, chapter or drop, and earnings after the 20% platform share.

6.  **Wallet.** Balance, pending, payout history, Request payout.

7.  **Videos and recitations.** Plays, average watch time and completion rate per video.

8.  **Work in progress.** Drafts and WIP with last-edited date and a Publish button.

The profile Analytics tab keeps quick numbers (views, watch time, likes, saves, sales, best piece); the Creator Dashboard is the deeper view.

## 13. Platform governance and extended capabilities

The following belong to the full Voxly platform and are specified here so the architecture accommodates them from the start.

| Capability                | Specification                                                                                                                        |
|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| Rights registry           | Dated record of author, first publication time and version for every Creation; supports ownership disputes                           |
| Voxly Book ID             | Internal book identifier with check digit (section 5); never labelled ISBN; external SA ISBN only for off-platform retail           |
| Cover Studio              | Template-based cover and quote-card designer with fonts, colours and image upload                                                    |
| Creator mobility          | Writers export all work and leave at any time; export in standard formats                                                            |
| Appeals                   | Users appeal suspensions, bans and removals; Founder decides; decisions are audit-logged                                             |
| Language on content       | English app interface; content language field, filters, and optional translations/captions on posts (section 5)                      |
| Organisation accounts     | Publishers, schools and writing groups with multiple members under one name (first release)                                          |
| Legacy Literature Archive | A curated public-domain library, labelled and kept separate from user content (first release)                                        |
| AI Creator Suite          | Optional writing-assist layer **after public launch**, when the Founder turns it on; never used for ranking or moderation           |
| Production operations     | Error logging, monitoring, daily backups and a documented production data plan are **required before launch** (legal/compliance after payments) |
| Marketplace fairness      | Public ranking rules, no paid placement above rules, fixed 80/20 split, transparent ledger                                           |
| Constitutional hierarchy  | Product rules in section 1 outrank feature decisions; the Founder is bound by them and every Founder action is logged                |

## 14. Technical architecture, data model and security

### Stack

| Layer              | Choice                                                                                                |
|--------------------|-------------------------------------------------------------------------------------------------------|
| Frontend           | React with Vite, mobile-first, responsive with a desktop sidebar layout                               |
| Backend            | Supabase: Postgres, Auth, Storage, Realtime                                                           |
| Payments           | PayFast, Stripe Connect and Stitch (all three); wallet and checkout are the last build phase before launch checks (section 17, `docs/ROADMAP.md`) |
| Video and audio    | Browser MediaRecorder, Supabase Storage, open-source compression such as FFmpeg, thumbnail generation |
| Real-time          | Supabase Realtime for messages, notifications, reactions and live vote counts                         |
| Installable app    | PWA manifest and service worker for iOS and Android home screens, offline support                     |
| Store distribution | Capacitor wrap of the web app for the App Store and Google Play                                       |
| Auth               | Email and password, forgot-password flow, email two-factor, persistent sessions; **Google sign-in before the second invite wave**, not before the first beta wave |

### Core tables (all with row-level security)

| Table                                          | Purpose                                                                                                                                        |
|------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| profiles                                       | Username, display name, bio, avatar, banner, website, country, language, role, status, suspended_until, status_reason, verified, streak counts |
| organisations, organisation_members            | Organisation accounts                                                                                                                          |
| follows                                        | Follower and followee                                                                                                                          |
| creations                                      | Author, type, title, body, media paths, caption, genre, mood, language, country, audience, status, is_removed, removed_reason, counts          |
| chapters                                       | Book id, order, title, body, published time                                                                                                    |
| creation_tags                                  | Tags, mood and genre per creation                                                                                                              |
| likes, saves                                   | One row per user and creation                                                                                                                  |
| comments                                       | Threaded, with parent id and is_removed                                                                                                        |
| mentions                                       | Mentioned user per post or comment                                                                                                             |
| creation_events                                | Views, watch time, replays for ranking and analytics                                                                                           |
| collabs                                        | Two authors and each one's approval state                                                                                                      |
| products, purchases                            | Storefront listings; buyer, price, rental expiry, subscription state                                                                           |
| library_items, collections                     | Purchased and saved items, reading progress, reader collections                                                                                |
| rights_records, voxly_book_ids                 | Rights registry and Voxly Book IDs                                                                                                             |
| wallet_ledger, payouts                         | Insert-only money ledger; payout requests                                                                                                      |
| conversations, messages, conversation_members  | DMs, communities, channels                                                                                                                     |
| communities, community_posts                   | Group spaces and their posts                                                                                                                   |
| notifications, admin_notifications             | User and Founder alerts                                                                                                                        |
| blocks, mutes                                  | Per-user lists                                                                                                                                 |
| badges, user_badges                            | Rule definitions and awards                                                                                                                    |
| challenges, challenge_entries                  | Prompts, deadlines, points, entries                                                                                                            |
| events, event_rsvps                            | Readings and launches                                                                                                                          |
| reports, moderation_actions, warnings, appeals | Section 11                                                                                                                                     |
| settings                                       | Per-user notification and privacy preferences                                                                                                  |
| ranking_settings                               | Adjustable ranking weights                                                                                                                     |
| slam_events, duets                             | Slam competitions and Duet (Two Hits) pairs                                                                                                    |
| legacy_works                                   | Legacy Literature Archive                                                                                                                      |

**Storage buckets:** avatars, banners, post media, covers, manuscripts, exports. Paid content files are private and served only to buyers.

### Security rules

1.  Row-level security on every table with explicit policies; no table without a policy.

2.  Role, status, verified flag and badges are never writable by the user.

3.  Founder is one server-side check, not a client flag; the setup flow locks itself after first use.

4.  Safe Space, block and suspended-user rules are enforced in the database.

5.  No secrets in code; payment keys and setup secrets live in server environment variables.

6.  Rate limits and spam protection on posting, commenting, messaging, reporting and sign-up.

7.  **Legal and compliance** (Terms, Privacy, cookie/consent, POPIA wording, payment and tax handling for writer payouts, age requirements) are finalised **after payments** are integrated and before public launch.

8.  **Monitoring, backups and a production data plan** are live and tested **before launch**, independent of payments.

## 15. Brand and design system

- **Name:** Voxly, from *vox*, Latin for voice.

- **Logo concept:** a bold V combined with double closed-quote marks and a play triangle, joining voice and story, poetry and prose, and performance.

- **Signature colour:** coral \#FF5A3C for likes, live indicators, the Create button, active states and primary buttons.

- **Typography:** Fraunces (serif) for anything that is writing: quote cards, post content, chapter text, screen titles and the wordmark. Inter for interface text.

- **Modes:** dark and light, with a toggle in Settings. Dark: near-black background, slightly lighter card surfaces with thin borders, large rounded corners, small uppercase section labels with a coral icon, off-white text, muted grey secondary text.

- **Navigation:** a fixed bottom bar with Home, Discover, a raised coral Create (+) button, Messages and Profile; on phones Settings opens from the three-line button at the top right of your own profile; desktop uses the rail with a More menu. The bar is opaque, every screen has bottom padding equal to the bar height plus the device safe area, and every role sees the same bar.

- **Verified badge:** one colour everywhere (Voxly coral accent).

- **Quality bar:** custom type scale, deliberate palette, real micro-interactions (like and save animations, page transitions, tactile feedback), cover-forward browsing, and a shelf feel for Library and Storefront.

- **Reading experience:** Medium-like editorial typography, generous margins, chapter reader with progress.

### Interface quality requirements

| Area                    | Requirement                                                                                                                                                                                                                         |
|-------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Images                  | Every avatar, thumbnail, poster and cover has a fallback: initial on a tinted circle for avatars, a styled text preview for posts, a title-based placeholder for products. Lazy-load with skeletons. Never show a broken-image icon |
| Video                   | Poster fallback and a clear empty state when media is missing                                                                                                                                                                       |
| States                  | One state at a time: loading, error with Retry, empty with an action, or content                                                                                                                                                    |
| Counts                  | Always from real data                                                                                                                                                                                                               |
| Drafts and private work | Never shown publicly and never with play counts                                                                                                                                                                                     |
| Storefront              | One row per product, correct author, cards sized to the screen with wrapped text                                                                                                                                                    |
| Profile tabs            | Horizontally scrolling row with even spacing                                                                                                                                                                                        |
| Post cards              | Flex layout with gaps; counts never overlap; text clamped with an ellipsis                                                                                                                                                          |
| Sheets and menus        | Bottom sheets with a dimmed backdrop; the Create sheet scrolls as one piece                                                                                                                                                         |
| Challenges              | Time left computed from the end date; 'Ended' when past                                                                                                                                                                             |
| Country                 | One field, shown as flag plus name everywhere                                                                                                                                                                                       |
| Sign-in                 | One tagline, a logo small enough that the form is visible, copy that says 'continue your writing journey'                                                                                                                           |
| Empty states            | Icon, one plain sentence, one action button                                                                                                                                                                                         |

## 16. Screen map

| Area              | Screens                                                                                                                                                                                      |
|-------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Entry             | Welcome, Sign up, Sign in, Google sign-in, Forgot password, Two-factor, Account banned, Warning dialog                                                                                       |
| Feed              | Home, For You, Following, Post detail, Comments, Hashtag page, Sound page                                                                                                                    |
| Discover          | Explore, Communities, Slam, Search, Challenge page, Leaderboard                                                                                                                              |
| Create            | Create sheet, Recitation Video, Voice Clip, Quote Card, Book / Chapter Clip, WIP / Journal, Written Post, Collab Post, Book Builder, Cover Studio, Manuscript import, Podcast, Course, Event |
| Profile           | Own profile, Other profile, Edit profile, Followers and Following lists, Badges, Streaks                                                                                                     |
| Marketplace       | Storefront, Product page, Checkout, Purchase confirmation, Library (Purchased, Saved, History, Collections), Reader                                                                          |
| Messaging         | Messages (Direct, Communities, Channels), Chat, Community page, Channel, Member list                                                                                                         |
| Notifications     | Notification list, Notification settings                                                                                                                                                     |
| Settings          | Settings home with search, and a subpage for every group in section 10                                                                                                                       |
| Creator           | Creator Dashboard, Wallet, Payout request, Storefront settings                                                                                                                               |
| Founder           | Overview, Retention, Top content, Top creators, Platform health, Revenue, Report queue, Report detail, Users, User detail, Content, Communities, Appeals, Announcements, Audit log, Curation |
| Legal and support | Terms, Privacy, Help, Report a problem, Appeal                                                                                                                                               |

## 17. Delivery sequence

The whole scope above is the product. **Phase order and build status** are maintained in `docs/ROADMAP.md`. Every step is complete when its behaviour works against real data, passes its security checks, and (where applicable) has a **named passing test on `main`**.

High-level order (details and evidence in the roadmap):

1.  **Book writing tools and Cover Studio** (formatting, fonts, preview, EPUB and Markdown import; Canva-style covers).

2.  **Entrance music** (owner-supplied track in `public/audio`).

3.  **Remove 'Coming soon'** from Create and Discover until each option is actually built.

4.  **Auto-hide and warnings** (section 11).

5.  **Signed-out teaser** and **Country Vibe** banner (section 20).

6.  **Section 24 first-release batch:** shelves, ratings and reviews, scheduled releases; daily goals, streak protection, Writing Month, Daily Line; monthly report, Founder insights and full Founder Dashboard; reading diary, public lists, popular highlights; **leagues and Wrapped** (Kudos removed).

7.  **Notifications:** held until Quiet mode ends, daily digest, scheduled posts and messages.

8.  **Emails:** Founder welcome, transactional account emails, month-start events list, month-end recap.

9.  **Events and announcements** in local time, scheduled by time zone.

10. **Communities, channels, community roles, Slam, Duets, challenges, Discover growth, For You, trending sounds, duets, ambient mood.**

11. **Create types:** video, voice clip, podcast, recitation, collab, course, event (record-and-post; no live streaming).

12. **Writing Clubs and live co-writing** (written parts only).

13. **Creator Dashboard** (every non-payment section).

14. **Organisation accounts and Legacy Literature Archive.**

15. **Google sign-in** (before the **second invite wave**, not the first).

16. **Settings:** confirm complete.

17. **Monitoring, backups and production data plan.**

18. **Voxly Book ID, rights registry** and external ISBN process for off-platform retail.

19. **Payments, wallet, checkout** (PayFast, Stripe, Stitch), supporter tiers, commissions and gifts.

20. **Legal and compliance**, then **launch readiness** checks.

**Later (not first release):** Pen Pals (section 26), AI Creator Suite, translated app interface, Capacitor app stores packaging.

## 18. Decisions to confirm and legal checklist

| Item                                                                                        | Status (Owner)                                                                 |
|---------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| Payment providers: PayFast, Stripe Connect and Stitch                                       | **All three** integrated in the final payments phase before launch             |
| Free or paid reader tiers (ad-supported, or a subscription)                                 | Still to confirm if needed beyond current scope                                |
| Background music: user-uploaded only, or a licensed library                                 | User-uploaded first; licensed library optional later                             |
| Trademark clearance for 'VOXLY'                                                             | Required before Capacitor app store packaging (later roadmap)                    |
| Terms of Service and Privacy Policy wording on Founder oversight of private content         | Finalise **after payments**, before public launch                               |
| Backend: Supabase as specified                                                              | **Confirmed**                                                                  |
| Google sign-in                                                                              | **Before second invite wave**, not before the first                            |
| Live streaming                                                                              | **Not in product** (record and post only)                                      |
| Country Vibe visual                                                                         | **Themed banner with mood palette** (not a map)                                |
| Signed-out public posts                                                                     | **Title and first lines** visible; full content requires sign-in               |
| Auto-hide threshold                                                                         | **3 to 5 distinct reports** per target; **3 flagged posts** → final warning    |

**Legal checklist:** Terms of Service, Privacy Policy, cookie and consent notice, POPIA compliance, copyright and takedown procedure, payment and tax handling for writer payouts, age requirements, and data export and deletion—completed **after payments**, immediately before public launch. **Monitoring, backups and the production data plan** are required **before** launch (section 14).

## 19. Bridging worlds: one platform in place of ten

Voxly is not one more social app. It brings together what writers, performers and readers currently spread across at least ten separate platforms, and adds the one thing none of them do: connect people across the world through the written and spoken word.

| Replaces or combines                | Voxly feature                                             |
|-------------------------------------|-----------------------------------------------------------|
| Short-video apps                    | For You feed, recitation video, voice clips, duets        |
| Photo and feed apps                 | Home feed, profile grid, cross-posting                    |
| Blogging and newsletter platforms   | Written posts, long-form, writer-owned audience, Channels |
| Serial-fiction sites                | Books with chapters, serialized reading                   |
| Self-publishing stores              | Book Builder, storefront, wallet, Voxly Book ID, rights registry |
| Design tools                        | Cover Studio, quote cards                                 |
| Messaging apps and forums           | DMs, Communities, Channels                                |
| Performance and spotlight apps      | Slam events, Duets (Two Hits), Featured Stage (no live streaming) |
| Learning platforms                  | Courses, challenges, prompts                              |
| Pen-pal and cultural exchange sites | Country Vibe (section 20); Pen Pals later (section 26)    |

Every item in this specification is part of the Voxly platform.

## 20. Country Vibe, location and time zone

### Country Vibe

Every country has a living page showing the voice of that place.

- A country page shows the flag, local time, languages, trending pieces, rising writers, active Communities and featured work from that country.

- Discover includes a Browse by Country section and a country filter on every feed and search.

- **Country Vibe visual:** a **themed banner with a mood palette** for each country page (not a map). The vibe surfaces the mood and themes dominant in that country that week, using the same transparent, rule-based scoring as the rest of the platform.

- Writers can show their country on the profile and appear on their country's page.

- Founder can feature a Country of the Week.

### Location

- Required at sign-up: country. Optional: city or region.

- Privacy by default: only country is public; city is hidden unless the user chooses to show it. Exact location is never collected or shown.

- Location powers country pages, local events and Discover filters.

### Time zone

- Each account stores a time zone (detected on sign-up, editable in Settings).

- The profile and chat headers show the person's local time where the product displays it.

- Time zone drives writing streak days, the Word of the Day and challenge deadlines, scheduled posts, notification quiet hours, and the display of events and Slam windows in the viewer's own time.

### Data additions

| Table or field                                                            | Purpose                                                    |
|---------------------------------------------------------------------------|------------------------------------------------------------|
| profiles.country, profiles.city, profiles.timezone, profiles.city_visible | Location and time zone                                     |
| countries                                                                 | Country reference with flag, languages, default time zones |
| country_features                                                          | Country of the Week, vibe banner and featured items        |

## 21. Welcome and onboarding

The first moments set the feeling of the whole platform: this is a home for writers, authors, poets, performers, bloggers and video makers, all in one place.

- **Time-aware greeting.** On launch and at the top of Home, a warm greeting in the user's local time: 'Good morning, Jaydin', 'Good afternoon', 'Good evening'. Writers also see their streak and a writing prompt; readers see 'Pick up where you left off'.

- **Welcome moment.** On first launch, and after a long absence, a short branded welcome with the logo animation and a line that names who Voxly is for.

- **Onboarding.** After sign-up: choose what you are (poet, author, spoken-word artist, blogger, video creator, reader), genres, languages, country and time zone, and an optional Quiet mode. Then suggested writers to follow and Communities to join.

- **Emails (first release):** a **Founder welcome email** after sign-up; **transactional emails** for account events (confirm email, password reset, security notices); a **month-start email** listing events for the month ahead; and a **month-end recap email**. An in-app inbox message from the Founder complements the welcome email.

- **Tone.** Warm, literary and encouraging in all copy, including empty states and errors.

### 21.1 Swipe entrance, animated scene and optional music

The entrance appears on each **fresh open** of the app (a full load, or returning after about thirty minutes away), not when moving between in-app routes or brief tab switches; **Show the entrance screen** in Settings (default on) turns it off for the account. When it is shown, the member greets Voxly with a **swipe to step inside** (or **Enter** on pointer devices, plus **Step inside** for assistive tech). A rightward drag moves the scene with the finger; releasing before about one-third of the width springs back, while a firm flick or passing the threshold slides the overlay away into Home with no layout shift (instant when reduced motion is preferred). Keyboard **Enter**, **Space** and **ArrowRight** also enter; focus returns to the main Home landmark.

The welcome scene is an **original layered SVG** animation (pages, quills, books, microphones, notebooks, stars and small stickers) using transforms and opacity only, with parallax tied to the swipe, element caps by viewport width, and motion paused when the tab is hidden or after the entrance closes. With **prefers-reduced-motion**, the scene is a still composition.

An **optional owner-supplied instrumental** may loop on the entrance only: it starts after a gesture on that screen, fades in quietly, fades out on exit, and is controlled by a mute toggle (remembered on the device) and a Settings **Entrance music** switch (default on). No track is bundled; configuration lives in `src/config/brand.ts` and `ops/ENTRANCE-MUSIC.md`.

## 22. Retention, insights and the monthly report

### Founder insights

Founder-only, row-level secured, with filters by date range, country and role, and CSV export.

- **Growth and retention.** Sign-ups, activation, day-1, day-7 and day-30 retention, cohorts, churn risk, active versus inactive users.

- **Following.** Total follows, who followed whom, daily follow counts, fastest-growing writers.

- **Engagement.** Views, plays, completion rate, likes, saves, shares, comments, and time spent.

- **Clicks and conversion.** Profile visits, book-link clicks, storefront and product views, purchases, and the funnel from post to profile to product to purchase, attributed to the post that started it.

- **Content and creators.** Top poems, videos, Slam entries, books and writers by day, week, month and all time.

- **Audience.** Distribution by country and time zone, language and role.

- **Slam and Duets.** Participation, votes and active duet pairs.

### Automated monthly report

Generated by rules from real statistics. It requires no manual work.

- **Delivery.** On the first of each month, at a suitable local time for each user, to the in-app inbox ('Voxly Monthly'), plus the **month-end recap email** (section 21). Users can opt out of marketing-style emails; the inbox copy remains unless they disable that notification type.

- **For every writer.** Posts, plays, new followers, best piece of the month, streak, badges earned, sales and earnings summary, comparison with the previous month, and a suggested next step.

- **For every reader.** Reading time, books in progress and finished, favourite genres, writers followed and streak.

- **Platform highlights.** Poem of the Month, Video of the Month, top Slam poem and Slam Champion, Book of the Month, rising writers, top countries and notable milestones.

- **Design.** A branded layout built from the statistics, with sections that appear only when there is something real to show.

- **Founder control.** Preview before sending, an optional personal note, and the ability to switch sections off.

- **Rewards.** Performance badges are awarded at month close and announced in the report (section 6).

- **Retention loops.** Streaks, monthly goals, badges to look forward to, and a gentle comeback message after a period of inactivity, always respecting quiet hours, frequency caps and each user's notification settings.

### Data additions

| Table                                 | Purpose                                                                |
|---------------------------------------|------------------------------------------------------------------------|
| link_clicks                           | Post-to-book and profile click tracking, attributed to the source post |
| daily_metrics                         | Aggregated platform and per-user statistics for dashboards and reports |
| monthly_reports                       | Generated report content per user and delivery status                  |
| report_templates                      | Layout and section rules for the monthly report                        |
| user_goals                            | Monthly writing and reading goals                                      |
| slam_events, slam_entries, slam_votes | Slam events, entries and one-vote-per-user voting                      |
| scheduled_messages                    | Considerate and scheduled delivery                                     |
| posts.linked_product_id               | Book link on a post                                                    |

## 23. Content protection, in-app only and launch standard

### In-app only

- All reading, listening and watching happens inside Voxly. There is no export to or sharing on external platforms (TikTok, Instagram, Facebook, email or link-outs), no download links and no files.

- Sharing means sending a link card inside Voxly: to a DM, a Community or a Channel. The recipient opens it in the app.

- **Signed-out teaser:** for **public** posts, a signed-out visitor sees the **title and first lines**; the rest of the content and all non-public work require sign-in.

### Protecting writers from plagiarism

No system can make copying impossible, and screenshots can never be fully blocked on every device. The measures below make copying harder, make leaks traceable and make enforcement fast.

1.  **No raw files.** Paid and published text is served in pages or chunks through authenticated, short-lived requests from private storage. There is no public file URL and no download button. Video and audio are streamed with expiring signed addresses.

2.  **Reading surfaces locked down.** Text selection, copy, print and save-as are disabled on the reader and on media where the platform allows it.

3.  **Per-reader watermark.** Paid text and media carry a faint, per-reader identifier so any leaked copy can be traced to an account.

4.  **Screenshots.** In the installed apps, screenshots are blocked on Android and detected on iOS where the operating system permits, with a warning and a record of repeat events.

5.  **Anti-scraping.** Rate limits, bot detection, no bulk endpoints, and monitoring for abnormal reading speed or volume per account.

6.  **Rights registry and similarity checks.** Every published Creation gets a dated fingerprint. Rule-based text-similarity matching (not AI) flags new work that closely matches existing work and sends it to the Founder's queue. To confirm: whether a strong match blocks publishing or only flags it.

7.  **Copyright reports.** The Copyright reason in the report sheet opens a dedicated flow: claimant, original work and evidence. The Founder decides, can take work down, and a counter-notice route exists. Repeat infringers receive strikes leading to suspension or a ban.

8.  **Attestation.** At publish, the writer confirms they are the author or hold the rights. The Terms prohibit copying and redistribution.

9.  **Access logging.** Access to paid content is logged.

### Launch standard

- Voxly launches when every **first-release** feature in this specification and `docs/ROADMAP.md` is wired to real data. There are no permanent 'Coming soon' labels: options stay **hidden** until built (section 17, roadmap phase 3).

- Anyone can register, follow, post and publish books from launch day; **selling** goes live with payments (roadmap phase 19).

- Because fake accounts and demo content are not allowed, the platform is filled by real people. A **Founding Writers programme** invites real writers and performers to publish before public launch, so that the feed, storefronts, Communities and Slam have real content at go-live.

- A private test period with real users precedes go-live, with load testing for launch traffic.

- **Moderation at scale.** Reports are prioritised by severity and report count. **Auto-hide** follows section 11: **3 to 5 distinct reports** hides content and flags the Founder; **3 flagged posts** for a user triggers a **final warning** before any Founder suspension decision.

## 24. Features borrowed from other platforms

These features take proven ideas from other platforms and adapt them to Voxly. All of them follow Voxly's rules: in-app only, rule-based and explainable (no AI), real data only, enforced on the server, and subject to Safe Space, blocking and moderation.

### A. Keeping writers and readers coming back

**1. Daily goals, streak protection and weekly leagues (from Duolingo)**

- Each user sets a daily writing goal (words or minutes) and a daily reading goal (pages or minutes). Progress shows on Home and on the profile.

- Streak protection: a user can protect a streak on a missed day. Protections are earned through goals and badges, and a limited number are granted each month (to confirm the number).

- Weekly leagues: users are grouped with about 30 others of similar activity and ranked for the week by points. Points come from words written, posts published, chapters released and reading time. Top places move up a league and bottom places move down. League badges are awarded.

- Points reward activity, never opinion of quality. Leagues are optional and can be switched off.

**2. Voxly Wrapped (from Spotify)**

- Each December, and in a lighter form each month, every user receives an animated set of cards in the app: top poems, words written, reading time, favourite genres, countries reached, longest streak and badges earned.

- The cards live in the app and can be sent to a DM or pinned to the profile as 'My Year'. They cannot be exported or shared outside Voxly.

- This extends the monthly report in section 22.

**3. Writing Clubs and group challenges (from Strava)**

- Writing Clubs are accountability groups of up to 50 people with shared goals, a club streak, a club leaderboard and club challenges, for example 'write 20,000 words together this month'. They are different from Communities, which are interest-based. (**Kudos** one-tap congratulations are **removed from the plan**.)

**4. Voxly Writing Month (from NaNoWriMo)**

- A yearly word-count challenge, scheduled by the Founder, in November by default. The default goal is 50,000 words, and the user can set their own.

- A progress bar and daily totals in the editor, writing buddies, a Finisher badge and a wrap-up card.

- Anti-cheating: only words typed in the Voxly editor count, and large pastes are discounted.

### B. Reading and books

**5. Shelves and reading goals (from Goodreads)**

- Default shelves: Want to read, Reading, Read. Users can add custom shelves.

- Any book can be added to a shelf from anywhere. Shelves show on the profile and can be public or private.

- A yearly reading goal ('read 12 books') with a progress bar.

**6. Ratings and reviews (from Goodreads and Amazon)**

- One 1 to 5 star rating and an optional written review per reader per book, with a spoiler tag.

- Only readers who have read at least 10 percent of the book, or bought it, can review it. This stops fake reviews.

- Other readers can mark a review helpful. The writer can reply once. Reviews can be reported. The average rating and count show on the book page.

**7. Popular highlights (from Kindle)**

- Readers' highlights are private by default. When at least five readers highlight the same passage, it shows an underline and a count ('142 readers highlighted this').

- Readers can turn popular highlights off. Writers see their most-highlighted lines in their analytics.

**8. Scheduled releases and premieres (from Webtoon, Tapas and YouTube)**

- Writers schedule chapters for a date and time and set a series schedule ('new chapter every Friday at 18:00').

- The book page shows a countdown and 'Updates every Friday', in the viewer's local time. 'Notify me' reminders respect Quiet mode.

- An optional **Premiere window:** when a chapter drops, readers who open it during the premiere window can react in-app (no live stream), and the author can pin a note.

**9. Reading diary and public lists (from Letterboxd)**

- A diary entry records when a book was finished, a rating and a short note.

- Users create public or private lists, such as 'Best heartbreak poems', containing books, poems or writers. Lists can be followed.

**10. Audio extras (from Audible)**

- For audio books, podcasts and voice clips: sleep timer, bookmarks, playback speed, resume position and chapter markers.

### C. Writers and money

**11. Supporter tiers and tips (from Patreon and Ko-fi)**

- A writer can set up to three monthly supporter tiers, each with a price and perks: supporter-only posts and chapters, early access, a supporter badge.

- One-off tips of any amount, with an optional message.

- Supporters can choose whether their name is shown. The 80 percent to writer and 20 percent to platform split applies (to confirm for tips).

**12. Commissions (from Fiverr)**

- A writer lists services: custom poem, editing, proofreading, ghostwriting, cover design, narration. Each has a price, delivery time and number of revisions.

- The order runs entirely in the app: request, accept, private delivery, approval, then payout. Payment is held by the platform until the buyer approves.

- Disputes go to the Founder. The writer chooses whether the buyer receives a licence to use the work or a full transfer.

**13. Gifting a book (from Etsy)**

- Buy a book as a gift for another Voxly user, with a message and an optional delivery date in the recipient's time zone.

- The recipient is notified and the book is added to their Library. A gift can only be redeemed by the recipient's account and cannot be resold.

**14. Editor-curated collections (from Medium)**

- The Founder curates collections on Discover, such as Editor's Picks and themed sets, each with a curator note. Writers can submit work for a collection.

### D. Community and creativity

**15. Line-by-line annotations (from Genius)**

- A reader selects a line in a poem or chapter and adds an annotation explaining or discussing it.

- Annotated lines are underlined with a count. The author can add a verified 'author's note' to their own lines. Annotations can be voted on and reported, and readers can hide them.

**16. Community rules, flairs and AMAs (from Reddit)**

- Each Community has a rules page shown when joining, post flairs such as Feedback, Poem and Prompt, and pinned posts.

- Scheduled AMAs with a question thread and pinned answers.

- Community creators set rules, flairs and pins. Removing posts or members stays with the Founder (to confirm whether creators get limited tools).

**17. Community roles, threads and events (from Discord)**

- Roles inside a Community (Creator, Helper, Member) that are labels and organising tools and carry no moderation power. Threads under posts. Scheduled Community events, such as reading nights, with RSVP and reminders.

**18. Live co-writing with version history (from Google Docs)**

- Collab Posts and Writing Clubs get a shared editor where two or more people edit together in real time, with presence cursors, comments and suggestions.

- Full version history with restore. A Collab Post still needs approval from every author before it publishes.

**19. The Daily Line (from Instagram Stories and BeReal)**

- A short text, quote or voice line that disappears after 24 hours. Followers see a row of avatars at the top of the feed.

- Viewers' replies arrive in the author's DMs. Posting a Daily Line counts toward the writing streak. The author can privately archive each line.

### Release order

| When                         | Features                                                                                                                                                                                  |
|------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| First release (section 17.6) | Shelves, ratings and reviews, scheduled releases; daily goals, streak protection, **leagues**, **Wrapped**, Writing Month, Daily Line; monthly report and full Founder insights; reading diary, public lists, popular highlights; trending sounds, duets, ambient mood; organisation accounts; Legacy Literature Archive |
| With Communities build       | Rules, flairs, AMAs, roles, threads, events                                                                                                                                               |
| With payments (section 17.19)| Supporter tiers and tips, commissions, gifting                                                                                                                                            |
| Later roadmap (section 26)   | Pen Pals; AI Creator Suite; translated app interface; Capacitor stores; audio extras, editor collections, annotations, live co-writing (written parts), other §24 items not listed above |

### Data additions

| Table                                                                | Purpose                                               |
|----------------------------------------------------------------------|-------------------------------------------------------|
| goals, streak_protections, leagues, league_members                   | Daily goals, protections, weekly leagues              |
| wrapped_cards                                                        | Generated yearly and monthly cards                    |
| clubs, club_members, club_challenges                                   | Writing Clubs                                       |
| writing_events, writing_event_progress                               | Writing Month and similar challenges                  |
| shelves, shelf_items, reading_goals                                  | Shelves and reading goals                             |
| reviews, review_votes                                                | Ratings and reviews                                   |
| highlights                                                           | Private highlights, aggregated for popular highlights |
| release_schedules                                                    | Scheduled chapters and series schedules               |
| diary_entries, lists, list_items                                     | Reading diary and public lists                        |
| supporter_tiers, subscriptions, tips                                 | Supporter tiers and tips                              |
| services, service_orders, order_deliveries                           | Commissions                                           |
| gifts                                                                | Book gifts                                            |
| collections, collection_items                                        | Editor-curated collections                            |
| annotations, annotation_votes                                        | Line-by-line annotations                              |
| community_rules, community_flairs, community_events, community_roles | Community tools                                       |
| document_versions                                                    | Live co-writing history                               |
| daily_lines                                                          | Daily Line posts                                      |

## 25. Master capture of earlier discussions

This document is the single source of truth for Voxly. Every idea the Founder has raised, in any earlier discussion, belongs here. Items not yet written down in full are tracked below so the engineering team can request them and nothing is lost.

| Item                                       | Status                                                            |
|--------------------------------------------|-------------------------------------------------------------------|
| Pen Pals                                   | Full spec in section 26; **not first release**                    |
| Country Vibe                               | Section 20; **themed banner + mood palette** (Owner)              |
| Location and time zone                     | Section 20                                                        |
| Duets (Two Hits)                           | Section 9; no separate 'Battles' term                             |
| Build phases                               | `docs/ROADMAP.md`                                                 |
| Any further ideas from earlier discussions | To be added by the Founder to this list                           |

## 26. Later roadmap (not first release)

Features in this section remain part of Voxly but ship **after** the first public launch described in section 17 and `docs/ROADMAP.md`.

### Pen Pals

Voxly revives the pen pal for the writing age. A writer or reader can find someone in another part of the world and build a lasting exchange of letters, poems and voice notes.

- Opt in to Pen Pals from Settings or the profile. Choose what you offer: country, languages, genres, writing interests, how often you want to write.

- Find a Pen Pal by browsing, filters (country, language, genre, interest) or a suggested match based on shared interests and complementary countries.

- A Pen Pal exchange is a private, ongoing thread of letters: long-form written letters, voice letters, poems and attachments, with a letter-style layout rather than chat bubbles.

- Both people must accept a Pen Pal request. Safe Space, block and report apply in full.

- Streaks and badges for sustained exchanges (for example, 'Pen Pal' and 'Global Correspondent').

- Exchanges can be turned into a Collab Post or published as a shared piece if both agree.

- Optional delivery delay for a slow-letter feel, and whether exchanges can be public, remain design choices when Pen Pals are scheduled.

### AI Creator Suite

Opt-in writing-assist tools **after launch**, when the Founder enables them (section 13). Never used for ranking or moderation.

### Translated app interface

The first release keeps the **English interface** (section 5). Localised UI strings may follow on this roadmap.

### Capacitor and app stores

Native packaging for the App Store and Google Play, trademark clearance, and store-specific protections (section 23 screenshots) ship here—not in the first web/PWA launch.

### Data additions (when Pen Pals ship)

| Table or field                     | Purpose                                                    |
|------------------------------------|------------------------------------------------------------|
| pen_pal_profiles                   | Opt-in, offered languages, genres, interests, frequency    |
| pen_pal_requests, pen_pal_threads, pen_pal_letters | Requests, exchanges and letters            |
