-- 014: Add 'polygon' geofence type (Spec 01 — geofence drawing)
-- Kept as its own migration: a new enum value cannot be USED in the same
-- transaction that adds it, so migration 015 does the schema work.

ALTER TYPE geofence_type ADD VALUE IF NOT EXISTS 'polygon';
