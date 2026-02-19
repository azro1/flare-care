-- Add reminder columns to appointments for push notifications
alter table public.appointments
  add column if not exists reminder_minutes_before integer,
  add column if not exists reminder_sent_at timestamptz;

comment on column public.appointments.reminder_minutes_before is 'Minutes before appointment to send reminder (e.g. 15, 60, 1440). NULL = no reminder.';
comment on column public.appointments.reminder_sent_at is 'When the reminder was sent; NULL until sent. Reset to NULL when user edits date/time/reminder so a new reminder is sent.';
