# Entrance music (owner-supplied)

Voxly can play one looping **instrumental** on the daily entrance screen only. The app does not ship a track.

## Add a track

1. Place the file under **`public/audio/`** (for example `public/audio/entrance-loop.mp3` or `.ogg`).
2. Keep the file **≤ 1.5 MB**. Prefer a seamless loop edited in your DAW; note the loop point in this file for future edits.
3. Set `entranceMusic` in **`src/config/brand.ts`**:

   ```ts
   export const entranceMusic = {
     src: '/audio/entrance-loop.mp3',
     credit: 'Track title — Artist name',
     licence: 'Short licence text (e.g. © 2026 Artist. Used with permission.)',
   }
   ```

4. Redeploy. The **Licences** page will list the credit and licence automatically. The entrance shows a speaker control; **Settings → Entrance music** toggles playback (default on, stored per device).

## Formats

- **MP3** or **OGG** only (`audio/mpeg`, `audio/ogg`).
- Served from `'self'`; Content-Security-Policy includes `media-src 'self'`.

## Behaviour

- Never autoplays without a gesture on the entrance screen.
- Does not play outside the entrance overlay.
- Off when the member disables the entrance, prefers reduced motion, mutes from the speaker control, or turns off **Entrance music** in Settings.

## Remove a track

Set `entranceMusic` to `null` in `brand.ts`, delete the file from `public/audio/`, and redeploy.
