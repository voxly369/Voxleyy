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

## Data and security

Every table has row-level security. The client uses the anon key only. Never use or expose the service-role key, and never put a secret in a `VITE_` variable.
