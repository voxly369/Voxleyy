-- Prompt 10B: in-paragraph reading offset (0–1) for resume across typography changes.

alter table public.post_reading_progress
  add column if not exists position_offset numeric(5, 4) not null default 0
  check (position_offset >= 0 and position_offset <= 1);

grant update (percent, position, position_offset, completed) on public.post_reading_progress to authenticated;
