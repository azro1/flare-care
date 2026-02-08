-- Migration: rename title → type (type of appointment)
-- Run this in Supabase Dashboard → SQL Editor if you already have the appointments table with "title"

alter table public.appointments
  rename column title to type;
