# Voxly interface conventions

These rules apply to every later component. This step only records them.

## Images

Every image has a fallback. Never render a broken-image icon.

- Avatar: the person's initial on a tinted circle.
- Post without a thumbnail: a styled text preview.
- Product or book without a cover: a title-based placeholder.

Lazy-load images and show a skeleton while they load.

## States

Loading, Error, and Empty are mutually exclusive. Render exactly one of:

- a skeleton while loading
- an error with a Retry button
- an empty state with one call-to-action button
- the content

## State components

Use the components in `src/components/states`. Do not invent a second version.

- `Skeleton` is the loading state. `variant="block"` is a large placeholder, `variant="text-lines"` is a short stack of lines, and `variant="circle"` is an avatar-sized circle. The shimmer stops when the visitor prefers reduced motion. Route changes use `PageSkeleton` inside `Suspense`.
- `ErrorState` is the error state. Pass a title, a plain-language message, and `onRetry`. Never pass a raw error, a stack, or a status code.
- `EmptyState` is the empty state. Pass an icon, a title, one sentence, and an optional action. Use it only when there is nothing to show, not while a request is still running.
- `ImageWithFallback` is the image rule. Give it a fixed box so the layout does not jump, lazy-load the file, and let it show a token-coloured letter or icon when the file is missing or fails. Never leave a broken-image icon on screen.

## Data and security

Every table has row-level security. The client uses the anon key only. Never use or expose the service-role key, and never put a secret in a `VITE_` variable.

Profile reads that include city go through the `profiles_public` view, not the base `profiles` table. City is masked in the database when `city_visible` is false, except for the signed-in owner and the founder. Any new column that should be private unless the owner opts in must be exposed only through a view with the same pattern, not by filtering in React alone.

Lists and feeds of **other people's** work (Home, Discover, search, tags) must query `audience = 'public'` in addition to whatever the database RLS allows.

**Profile Posts tab** shows only published **public** work for every viewer, including the owner. `profiles_public.creation_count` matches that grid (public posts only). Non-public work lives on the owner's **Drafts** tab: draft status, private audience (journal and other private entries), and published unlisted.

**Quote card** body is stored as plain `body_text` plus `body_json` `{ version: 1, format: 'quote_card', text, style: { background, color, size } }` with validated `#RRGGBB` colours only in inline styles.

**Rich body** (essays, poems, and other written types except quote cards) uses `body_text` as derived plain text and `body_json` `{ version: 1, format: 'rich', content: [...] }`. Allowed blocks are paragraphs and headings level 2 or 3 only; inline nodes are text (with optional `bold` / `italic` marks) and hard line breaks. Never store or render user content as HTML strings — only validated JSON rendered as React elements (`RichTextView`). Legacy `{ format: 'plain' }` drafts still open; they convert in memory and save as `rich` after the writer edits.

**Modals** (Create sheet, Comments, Publish, Confirm, Preview) share `useModal` / `Modal`: focus moves into the dialog, Tab is trapped, the app root is `inert` while open, background scroll is locked, Escape closes (except Confirm while busy), and focus returns to the opener on close. Stack order follows open order (Preview over editor, Confirm over Comments).

Do not nest interactive elements inside links (for example a Save button inside a post tile link). Keep the link and actions as siblings.

**Create (+)** opens the grouped “What will you share?” sheet from any page; `/create` is the same picker as a full page. Home currently shows newest public work from everyone; the suggestions mix and ranked For You arrive with the ranking prompt.

Home and Following feeds must read published posts from the `feed_creations` and `following_feed` views (never from raw `creations` alone). Those views expose `body_excerpt` and `body_truncated`, not full `body_text`. Direct client reads of other people's work outside the feed must still filter `audience = 'public'`.

Home currently shows newest public work from everyone; the suggestions mix and ranked For You arrive with the ranking prompt.

Never show raw database or PostgREST error text to users. Map provider failures to short, plain messages in the data layer (`saveErrors`, `engagement/errors`, creation write helpers).

## Layout and breakpoints

Layout depends only on viewport width (Tailwind breakpoints and a small SSR-safe `useMediaQuery` hook). Never read `navigator.userAgent`, `navigator.platform`, or similar device sniffing.

Use `PageContainer` variants from `src/components/shell/PageContainer.tsx`:

- **feed** — centred single column, max width 37.5rem (600px); Home, Following, Saved, Messages.
- **wide** — max width 68.75rem (1100px); settings, library, discover, profile shell, grids.
- **reading** — max width 65ch; published creation reading view.
- **editor** — wide shell with a two-column split from `lg` (writing column + ~22rem settings panel).

From **lg** (1024px) the left `SideNav` is sticky (16rem). Below **lg**, primary navigation is the fixed bottom bar with safe-area padding and `dvh`-friendly spacing. From **xl** (1280px), Home and Following may show a **right rail** (~20rem) beside the feed.

The right rail lists public discovery data only: suggested writers to follow and the signed-in user's own recent drafts. It must never show private or unlisted work belonging to other people.

Comments use the shared Modal stack; from **lg** they open as a right-docked panel (~26rem), below **lg** as a bottom sheet. Hover-only affordances must live inside `@media (hover: hover)` and have keyboard/focus equivalents.
