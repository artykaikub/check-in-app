-- Allow multiple check-in/check-out cycles per day.
--
-- The original schema enforced exactly one CHECK_IN and one CHECK_OUT per day via
-- a unique index on (attendance_day_id, event_type). Staff may now check in and
-- out repeatedly during a day, so drop the uniqueness and keep a plain lookup
-- index for the per-day event queries. Alternation (no two check-ins in a row) is
-- enforced in the service layer (assertAttendanceActionAllowed).

drop index if exists public.attendance_events_one_type_per_day;

create index if not exists attendance_events_day_type_idx
  on public.attendance_events(attendance_day_id, event_type);
