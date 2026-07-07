-- 023: Self-serve account deletion (App Store Guideline 5.1.1(v))
--
-- Apple requires apps with account creation to offer in-app account deletion.
-- delete_own_account() removes the caller's storage objects, then deletes their
-- auth.users row; the existing cascade chain (auth.users -> profiles ->
-- completions / user_badges / completion_reports / blocked_users) removes all
-- game data, feed posts, and reports in one statement.
--
-- Storage note: deleting storage.objects rows makes the files unreachable
-- through the Storage API immediately. Underlying blobs are garbage-collected
-- by Supabase; at pilot scale no extra cleanup pass is needed.

create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Proof photos + avatar uploaded by this user
  delete from storage.objects
  where bucket_id in ('proof-photos', 'avatars')
    and (owner = v_uid or owner_id = v_uid::text);

  -- Cascades: profiles, completions, user_badges, completion_reports,
  -- blocked_users (both directions), push token — everything keyed to the user.
  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function delete_own_account() from public;
revoke execute on function delete_own_account() from anon;
grant execute on function delete_own_account() to authenticated;

-- ─── REPORT COUNTS MUST SURVIVE CASCADE DELETES ──────────────────────────────
-- 018's sync function already recounts from COALESCE(NEW, OLD), but its trigger
-- only fired on INSERT/UPDATE. Without DELETE, a deleted reporter's open reports
-- would leave phantom open_report_count values — a post could stay hidden on
-- reports that no longer exist. Recreate the trigger with DELETE included.

drop trigger if exists trg_sync_completion_report_counts on completion_reports;
create trigger trg_sync_completion_report_counts
  after insert or update of status or delete on completion_reports
  for each row
  execute function sync_completion_report_counts();
