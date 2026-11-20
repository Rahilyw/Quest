-- Verifying migration 039 (profile token privacy).
-- Pass: push_token SELECT denied for clients; column SELECT of public columns works;
--       own_push_enabled() returns boolean; own-row push_token UPDATE works and does not
--       RETURN push_token; other-row UPDATE affects 0 rows; no anon/authenticated SELECT
--       grant on push_token.
-- Read-only pack: writing checks run inside BEGIN ... ROLLBACK so nothing is left behind.
-- Paste into the Supabase SQL editor after 039 is applied (already on production).

-- As an authenticated client (PostgREST, or SET ROLE authenticated with the JWT claims set):
SELECT push_token FROM profiles LIMIT 1;          -- expect: permission denied (42501)
SELECT * FROM profiles LIMIT 1;                   -- expect: permission denied (42501)
SELECT id, username, level FROM profiles LIMIT 1; -- expect: rows
SELECT own_push_enabled();                        -- expect: true or false for the caller

BEGIN;
UPDATE profiles SET push_token = NULL WHERE id = auth.uid();   -- expect: 1 row
UPDATE profiles SET push_token = 'x' WHERE id <> auth.uid();   -- expect: 0 rows
UPDATE profiles SET push_token = NULL WHERE id = auth.uid() RETURNING push_token; -- expect: 42501
ROLLBACK;

-- As an admin:
SELECT grantee, column_name FROM information_schema.column_privileges
 WHERE table_name = 'profiles' AND privilege_type = 'SELECT' AND column_name = 'push_token';
-- expect: no anon or authenticated rows
