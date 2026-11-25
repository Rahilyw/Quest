-- Verifying migration 045 (duo quests).
-- Pass: min_party_size granted; party tables readable by authenticated only for
--       SELECT (no client INSERT); party RPCs authenticated-only; internal
--       helpers not client-callable; alphabet matches Spec 06.
-- Read-only pack for CI verify.sh. Behaviour is covered by
-- supabase/tests/045_duo.test.sql (pgTAP).
-- Requires 043 and 044 applied. Paste into the Supabase SQL editor after
-- applying 045 (OWNER-RUNSHEET / build-3 O13).

-- Structure and grants

SELECT has_column_privilege('authenticated', 'quests', 'min_party_size', 'SELECT') AS party_authed,
       has_column_privilege('anon',          'quests', 'min_party_size', 'SELECT') AS party_anon;
-- expect: true / true

SELECT has_table_privilege('authenticated', 'quest_parties', 'SELECT') AS parties_read,
       has_table_privilege('authenticated', 'quest_party_members', 'SELECT') AS members_read,
       has_table_privilege('authenticated', 'quest_parties', 'INSERT') AS parties_insert;
-- expect: true / true / false

SELECT p.oid::regprocedure,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authed,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon
  FROM pg_proc p
 WHERE p.proname IN (
   'create_party', 'join_party', 'leave_party', 'own_party',
   'normalize_completion_on_insert', 'apply_duo_party_on_completion',
   'generate_party_code', 'enforce_party_member_cap'
 );
-- expect: create/join/leave/own true/false; normalize/apply/generate/enforce false/false

-- Alphabet and length
SELECT party_code_alphabet() AS alphabet;
-- expect: ABCDEFGHJKMNPQRSTUVWXYZ23456789
