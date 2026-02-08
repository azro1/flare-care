-- Add clinician name column to existing appointments table
-- Run in Supabase Dashboard → SQL Editor if the table already exists

alter table public.appointments
  add column if not exists clinician_name text;
