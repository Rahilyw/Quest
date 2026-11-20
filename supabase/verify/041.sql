-- Verifying migration 041 (push draining and Sunday recap).
-- Pass: four outbox columns present (attempts default 0); one CHECK listing weekly_drop,
--       suggestion_live, week_recap, win_back; three cron jobs on the expected schedules;
--       client roles cannot EXECUTE claim/finish/release/invoke/enqueue_week_recap;
--       invoke_push_outbox_drain() returns idle / not configured / requested as documented;
--       enqueue_week_recap() is 0 outside Sunday 18:00 Victoria; outbox health queries run.
-- Read-only pack: enqueue may write week_recap_sends / outbox rows — wrap that call in
-- BEGIN ... ROLLBACK. invoke_push_outbox_drain() only fires pg_net when rows are claimable
-- and is safe to call; Vault setup SQL is NOT in this file (run from OWNER-RUNSHEET / runbook).
-- Paste into the Supabase SQL editor after applying 041.

-- Columns and kinds
SELECT column_name, data_type, column_default FROM information_schema.columns
 WHERE table_name = 'push_outbox'
   AND column_name IN ('attempts', 'last_error', 'claimed_at', 'next_attempt_at');
-- expect: 4 rows, attempts default 0
SELECT pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid = 'public.push_outbox'::regclass AND contype = 'c';
-- expect: exactly one CHECK, listing weekly_drop, suggestion_live, week_recap, win_back

-- Schedules
SELECT jobname, schedule, command FROM cron.job
 WHERE jobname IN ('drain-push-outbox', 'enqueue-week-recap-0100', 'enqueue-week-recap-0200');
-- expect: */5 * * * *, 0 1 * * 1, 0 2 * * 1

-- Client roles cannot call the outbox RPCs
SELECT p.proname, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authed,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon
  FROM pg_proc p
 WHERE p.proname IN ('claim_push_outbox', 'finish_push_outbox', 'release_push_outbox',
                     'invoke_push_outbox_drain', 'enqueue_week_recap');
-- expect: false / false on every row

-- Drain trigger
SELECT invoke_push_outbox_drain();
-- expect: 'idle' with nothing queued; 'not configured: ...' before the Vault secrets exist;
-- 'requested <id>' when rows are queued. Then:
SELECT id, status_code, error_msg, created FROM net._http_response ORDER BY created DESC LIMIT 5;

-- Recap guard: outside Sunday 18:00–23:59 Victoria this returns 0 and writes nothing.
BEGIN;
SELECT enqueue_week_recap();
SELECT * FROM week_recap_sends ORDER BY week_start DESC LIMIT 3;
ROLLBACK;

-- Outbox health
SELECT kind,
       count(*) FILTER (WHERE sent_at IS NULL AND attempts < 5)  AS waiting,
       count(*) FILTER (WHERE claimed_at IS NOT NULL AND sent_at IS NULL) AS claimed,
       count(*) FILTER (WHERE sent_at IS NULL AND attempts >= 5) AS dead,
       count(*) FILTER (WHERE sent_at IS NOT NULL AND last_error IS NULL) AS delivered_to_expo,
       count(*) FILTER (WHERE sent_at IS NOT NULL AND last_error IS NOT NULL) AS skipped
  FROM push_outbox GROUP BY kind;

-- Dead letters and why
SELECT id, kind, attempts, last_error, created_at FROM push_outbox
 WHERE sent_at IS NULL AND attempts >= 5 ORDER BY created_at DESC LIMIT 20;
