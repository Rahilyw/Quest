-- Migration 011: add last_week_rank column to profiles
-- Populated weekly by the snapshot-ranks edge function (called every Monday).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_week_rank INTEGER;
