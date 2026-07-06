-- 016: Add 'removed' to completion_status (must commit before use in 017_instant_verification)

ALTER TYPE completion_status ADD VALUE IF NOT EXISTS 'removed';
