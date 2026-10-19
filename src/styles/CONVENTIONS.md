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

Lists and feeds of **other people's** work (Home, Discover, search, tags, and another user's profile Works tab) must query `audience = 'public'` in addition to whatever the database RLS allows. The signed-in owner's own profile may show every audience and label each item.
