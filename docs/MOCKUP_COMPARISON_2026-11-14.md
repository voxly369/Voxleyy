# Mockup vs app comparison — 2026-11-14

**Sources:** `docs/SPEC.md`, uploaded blueprint (`Voxly_Master_Product_Vision_and_Ecosystem_Blueprint-1.docx`), `AUDIT_2026-11-13.md`, `mockup/voxly-mockup.html` (layout intent only), verified routes/components on `main`. **No code or schema was changed for this report.**

---

## Summary

The live PWA already delivers a **credible Home feed, Discover browse, book builder/reader, library, and split mobile/desktop shell** (`AppShell`, `BottomNav`, `NavRail`, `FeedWithRailLayout`). The mockup’s **commercial storefront, paid checkout, media studio, and Creator Hub earnings story** are largely **ahead of the product**: books sell only after roadmap **phase 19 (payments)** and founder **blueprint §22** decisions. The largest **non-blocked** gaps vs mockup are: **no global book Store grid with genre filters**, **thin book product page** (no spec block / buyer Preview / reviews), **writer UI** (plain chapter textarea vs mockup TipTap + desktop properties panel), **no Media screen at all**, and **Creator Hub** routed via Settings not profile tab with **sales/payout UI placeholders** (`AvailableWhenCard`). Desktop layouts exist for shell and some feeds, but **Writer, Reader, Media, and Creator Hub mockup panels are mostly single-column at ≥1024px**. Prioritise upgrades that complete blueprint **§19.2 first commercial journey** up to the payment boundary: **catalog → product page → publish/list → entitlements shell → reader → creator metrics**; treat **checkout, ledger, and payout panels** as **blocked** until §22 is resolved.

---

## Screen-by-screen comparison table

| Screen | Feature | Status | Evidence | Notes |
|--------|---------|--------|----------|-------|
| Home | Continue-reading card (cover, bar, %) | PARTIAL | `LibraryPage.tsx`, `ContinueReadingRow.tsx`; Home: `HomeGreeting.tsx` | Mockup card on Home; app uses Library tab + text link only. |
| Home | Social feed posts | EXISTS | `HomePage.tsx`, `PostCard.tsx`, `listFeed.ts`, `e2e/layout.spec.ts` | Real feed data; engagement wired. |
| Home | Like / save / comment actions | EXISTS | `EngagementBar.tsx`, `PostCard.tsx` | Matches mockup intent (no public share). |
| Home | Share action | EXISTS, DIFFERENT | `PostCard.tsx` (`share-to-message`) | In-app DM share only (per SPEC); mockup label “Share”. |
| Home | Desktop trending-poetry aside | MISSING | `RightRail.tsx` | Rail shows suggested writers/drafts, not trending books/poetry. |
| Home | Desktop writers-to-follow aside | PARTIAL | `RightRail.tsx`, `rightRailData.ts` | Suggested writers exist; not mockup copy/layout. |
| Home | Time-aware greeting / prompt | EXISTS | `HomeGreeting.tsx`, `HomePage.tsx` | Aligns with mockup header region. |
| Discover / Store | Store as primary Discover mode | EXISTS, DIFFERENT | `DiscoverPage.tsx` route `/discover` | Explore-first; mockup “Store” is book grid. |
| Discover / Store | Search titles/authors | PARTIAL | `DiscoverSearchField.tsx` | Search targets posts/writers, not book catalog. |
| Discover / Store | Genre filter chips (Poetry, Novels, …) | EXISTS, DIFFERENT | `DiscoverExploreTab.tsx`, `moodsAndGenres.ts`, `DiscoverBrowsePage.tsx` | Filters **posts** by genre slug; mockup filters **ebooks**. |
| Discover / Store | 2-column book cover grid + price | MISSING | `ProfileStorefrontTab.tsx`, `listAuthorBooks` | Books per profile; no platform-wide store grid. |
| Discover / Store | Desktop 4-column book grid | MISSING | `DiscoverBrowsePage.tsx` (`DiscoverPostStrip` grid) | Browse grid is posts, not books. |
| Discover / Store | Tap book → book page | PARTIAL | `BookPage.tsx` route `/books/:id` | Reached from profile/storefront/links, not store grid. |
| Book page | Two-column layout (cover + detail) | EXISTS, DIFFERENT | `BookPage.tsx` | Responsive row; mockup adds spec column. |
| Book page | Preview button (buyer) | PARTIAL | `BookPage.tsx` TOC sample chapters; `BookPreviewPage.tsx` | Author preview route; no buyer “Preview” CTA like mockup. |
| Book page | Buy ebook CTA | PARTIAL | `BookPageActions.tsx` | Paid buy disabled until `fetchPaymentsEnabled()`. |
| Book page | Post-purchase library copy | EXISTS, DIFFERENT | `BookPageActions.tsx`, `claimFreeBook` | Free/add works; paid path blocked. |
| Book page | Description + author + rating | PARTIAL | `BookPage.tsx` | Description/author yes; **book ratings** not on page. |
| Book page | Spec list (format, pages, VBID, preview extent) | MISSING | `BookBuilderForm.tsx` (VBID edit); `booksApi.ts` | Public page lacks `<dl>` spec; page count needs verification. |
| Book page | Reviews section | MISSING | needs verification | Mockup placeholder only. |
| Writer | Manuscript title + chapter body | EXISTS, DIFFERENT | `BookChapterEditPage.tsx` | Plain title/textarea vs mockup Fraunces page. |
| Writer | Chapter list sidebar (desktop) | PARTIAL | `ChapterManager.tsx` on `BookBuilderPage.tsx` | Chapters on builder, not beside editor. |
| Writer | Rich toolbar (Bold, Heading, Notes, Export) | EXISTS, DIFFERENT | `CreationEditor.tsx` (posts); chapters: none | Posts use TipTap; book chapters do not. |
| Writer | Desktop properties panel (word count, status, version) | PARTIAL | `ChapterManager.tsx` word counts; builder status | No unified properties rail like mockup. |
| Writer | Mobile chapter picker in toolbar | PARTIAL | `ChapterManager.tsx` links | Navigate to edit routes, not mockup ▾ chip. |
| Writer | Autosaved indicator | PARTIAL | `useCreationEditor.ts` (posts) | Chapter save is manual button on `BookChapterEditPage.tsx`. |
| Reader | Page / Scroll modes | EXISTS | `ReaderPage.tsx`, `readerPreferencesSchema.ts`, `e2e/library-reading.spec.ts` | Both modes implemented. |
| Reader | Focus mode | MISSING | `readerModeSchema` (`scroll` \| `page` only) | Mockup third mode absent. |
| Reader | Text size controls | EXISTS | `ReaderSettingsSheet.tsx` | Slider vs mockup A+/A−. |
| Reader | Background themes | EXISTS, DIFFERENT | `readerThemeSchema` | paper/sepia/dark/black vs mockup light theme. |
| Reader | Desktop reader + side settings column | EXISTS, DIFFERENT | `ReaderPage.tsx`, `ReaderSettingsSheet.tsx` | Settings in modal/sheet, not persistent aside. |
| Reader | Progress/bookmarks sync note | EXISTS | `ReaderSettingsSheet.tsx`, reading progress APIs | Copy differs; behaviour largely built. |
| Media | Camera / record control | MISSING | `productFlags.ts`, `CreateTypePicker.tsx` | `recitation_video` hidden; no Media route. |
| Media | 9:16 vertical toggle | MISSING | needs verification | No recording UI. |
| Media | Teleprompter overlay | MISSING | needs verification | Blueprint phase 8. |
| Media | Desktop multi-track timeline | MISSING | needs verification | Mockup desktop-only timeline. |
| Media | Audio/text/captions/filters row | MISSING | `CreatorDashboardPage.tsx` video placeholder | Not built. |
| Creator Hub | Stats cards (followers, reads, earnings) | PARTIAL | `CreatorDashboardPage.tsx`, `dashboardApi.ts` | Real follower/views metrics; earnings cards missing. |
| Creator Hub | Recent sales table | MISSING | `AvailableWhenCard.tsx` on dashboard | No sales rows. |
| Creator Hub | Payouts verification panel | PARTIAL | `AvailableWhenCard.tsx` “Wallet” | Placeholder until payments. |
| Creator Hub | Entry via profile tab | EXISTS, DIFFERENT | `navItems.ts` → Profile; hub at `/creator` via `SettingsPage.tsx` | Mockup tab opens Hub; app opens profile. |
| Creator Hub | Desktop hub + payout side panel | MISSING | `CreatorDashboardPage.tsx` single column | No 2-column hub layout. |
| Navigation | Mobile 5-tab bar + centered Create | EXISTS | `BottomNav.tsx`, `e2e/layout.spec.ts` | Matches pattern; labels/routes differ slightly. |
| Navigation | Desktop sidebar (logo + screen links) | EXISTS, DIFFERENT | `NavRail.tsx`, `AppShell.tsx` | Icon rail (244px xl); not mockup’s Writer/Reader/Media/Hub list. |
| Navigation | Messages in primary nav | EXISTS | `navItems.ts` | Mockup phone tab includes Messages (mockup noop on desk). |

---

## Upgrade options

| Feature | Involves | Effort | Dependencies | Blocked by |
|---------|----------|--------|--------------|------------|
| Global Digital Store grid + genre filters for **books** | UI, data (discover RPC/view), database index | L | Blueprint phase 4; ROADMAP before phase 19 listing UX | Launch market (§22) for pricing display only — **not** blocked for browse UI |
| Book product page: Preview CTA, spec `<dl>`, VBID, sample page count | UI, data | M | Phase 4 storefront; `voxly_book_ids`, TOC sample flags | Refunds/preview policy (§22) light touch |
| Buyer book reviews after purchase | UI, data, database | M | ROADMAP phase 6 ratings/reviews | Payments for “bought” gate — **blocked** for paid reviews |
| Checkout + entitlements + order ledger | New system, database, integration | L | ROADMAP **phase 19**; blueprint phase 4 | **Yes — §22** payment provider, commission, currency, payout geography |
| Creator Hub: recent sales + earnings stats (live) | UI, data, database | L | Phase 19 + ledger RPCs | **Yes — §22** commission + payouts |
| Creator Hub: payout verification panel (live) | New system, integration | L | Phase 19 PayFast/Stripe/Stitch | **Yes — §22** payout geography + KYC |
| Home continue-reading hero card w/ progress | UI, data | S | `listContinueReading` | None |
| Home desktop rail: trending books/poetry | UI, data | M | Discover ranking; optional phase 9 | None |
| Writer: TipTap chapter editor + desktop 3-panel layout | UI, data | L | ROADMAP phase 1 book tools | None |
| Writer: chapter autosave + version line | UI, data | M | Phase 2 publishing | None |
| Reader: Focus mode + desktop settings column | UI | M | ROADMAP phase 1 reader modes | None |
| Reader theme parity (optional light) | UI | S | Reader prefs schema | None |
| Media studio (record, 9:16, teleprompter, timeline) | New system, UI, storage, workers | L | Blueprint phase 8; ROADMAP phase 11 | **Yes — §22** media limits |
| Navigation: Store + Creator Hub in desktop sidebar | UI, routing | M | Product IA decision | None |
| Profile tab → Creator Hub for own writer | UI | S | Settings link today | None |

---

## Mobile vs desktop findings

| Screen | Mockup desktop intent | App at ≥1024px | Stretched phone? |
|--------|----------------------|----------------|------------------|
| Shell | Full sidebar with screen names | `NavRail.tsx` fixed rail + `md:pl-[var(--rail-width)]` | No — distinct nav pattern. |
| Home | Feed + right aside | `FeedWithRailLayout` + `RightRail` from `xl` | No — aside is real. |
| Store | 4-col book grid | Discover posts/lists; no book grid | N/A — store screen missing. |
| Book page | Cover column + detail column | `md:flex-row` on `BookPage.tsx` | No — modest 2-col. |
| Writer | Chapters \| editor \| properties | Single-column builder + separate edit page | **Yes** — no workspace panels. |
| Reader | Text \| settings column | Full-width reader; settings sheet | **Yes** — no side panel. |
| Media | Preview \| controls+timeline | Not implemented | N/A |
| Creator Hub | Stats+table \| payouts | Single column `PageContainer` | **Yes** — placeholders stack. |

**Evidence:** `e2e/layout.spec.ts` (375–1440), `AppShell.tsx`, `PageContainer` variants, mockup `.v-desktop` grid rules in uploaded HTML.

---

## Ranked top five

Ranked by **user value** and progress toward blueprint **§19.2** (*import/create book → list → purchase → entitlement → Reader → reconciled creator sale*). Payment-blocked work is excluded from recommendations per brief.

| Rank | Upgrade | Why |
|------|---------|-----|
| 1 | **Book product page + buyer Preview path** (spec list, VBID, sample chapters as “Preview”) | Directly bridges Discover/profile links to the purchase intent surface; uses existing `BookPage`, entitlements, sample flags — last mile before checkout. |
| 2 | **Platform Store browse** (book grid, genre chips, search) | Mockup’s Discover/Store screen; unlocks discovery leg of §19.2 without payments; reuse `BookRecord` + new list RPC. |
| 3 | **Writer publishing workspace** (rich chapter editor, desktop chapter list + metadata panel) | Completes author leg of §19.2; today `BookChapterEditPage.tsx` blocks “formats and validates” UX from mockup. |
| 4 | **Home continue-reading card** with cover/progress | High daily reader value; data exists in `listContinueReading`; aligns Home with mockup without new backend. |
| 5 | **Creator Hub commerce section layout** (sales table UI wired to empty state + book metrics until pay) | Prepares creator “sees sale” step; pair real `dashboardApi` book stats now; slot ledger later (blocked). |

**Blocked but critical for §19.2 completion (not ranked as “do now”):** ROADMAP **phase 19** payments/checkout — requires **§22** provider, commission, currency, and payout decisions first.

---

## Decisions for the founder

- **Payment provider order** (PayFast vs Stripe Connect vs Stitch) and which supports SA writer payouts at launch (**blueprint §22**).
- **Platform commission / creator royalty** percentages and fee-bearing party (**§22**).
- **Launch market**: South Africa first vs multi-country day one (**§22**).
- **Currency and territory pricing** for ebooks (**§22**).
- **Refund rules** and when entitlements revoke (**§22**).
- **Subscriptions in v1** (publication vs membership) vs ebooks-only (**§22**).
- **Whether Discover “Store” is books-only** or mixed with posts (product IA vs mockup).
- **Media studio scope for v1** (recitation 9:16, teleprompter, render quotas) (**§22** media limits).
- **Book reviews**: launch with paid purchases only or allow free-book ratings (**§22** refunds/access).

---

*Report generated 2026-11-14. Mockup treated as layout intent only; `docs/SPEC.md` wins on conflicts.*
