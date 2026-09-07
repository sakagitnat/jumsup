-- Lets a user reset their own mastered-word progress for one of their own
-- vocab sets, mirroring mark_word_mastered's auth/ownership checks. Needed
-- for the "รีเซ็ตความจำ Flash การ์ด" button in flashcard settings -- until now
-- there was no way to un-master words short of deleting and recreating the
-- set; sync_learning_progress only ever grows the mastered list (a union),
-- never shrinks it.
create or replace function public.reset_word_mastery(p_set_id text)
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if not exists(select 1 from vocab_sets where id=p_set_id and user_id=uid) then raise exception 'FORBIDDEN'; end if;
 update learning_progress set mastered_indices='{}'::integer[], updated_at=now()
   where user_id=uid and set_id=p_set_id;
end $$;

grant execute on function public.reset_word_mastery(text) to authenticated;
