-- 024: Add 'multi' geofence type (multiple completion areas per quest)
-- Kept as its own migration: a new enum value cannot be USED in the same
-- transaction that adds it, so migration 025 does the schema work.

ALTER TYPE geofence_type ADD VALUE IF NOT EXISTS 'multi';
