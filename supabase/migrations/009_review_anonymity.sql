-- Anonymous reviews + a name-masking reader.
-- Apply after 005_community_engagement.sql.

alter table public.content_reviews
  add column if not exists anonymous boolean not null default false;

-- Reviews for one piece of content, with the reviewer name shown only when the
-- review is not anonymous, OR the caller is that reviewer, OR the caller is an
-- admin. Content creators and other users see "" for anonymous reviewers.
create or replace function public.get_content_reviews(p_type text, p_id text)
returns table (
  rating integer,
  body text,
  anonymous boolean,
  created_at timestamptz,
  updated_at timestamptz,
  is_mine boolean,
  display_name text
)
language sql
security definer
set search_path = public
as $$
  select
    r.rating,
    r.body,
    r.anonymous,
    r.created_at,
    r.updated_at,
    (r.user_id = auth.uid()) as is_mine,
    case
      when not r.anonymous
        or r.user_id = auth.uid()
        or exists (select 1 from public.profiles p
                   where p.user_id = auth.uid() and p.role = 'admin')
      then coalesce(pr.username, '')
      else ''
    end as display_name
  from public.content_reviews r
  left join public.profiles pr on pr.user_id = r.user_id
  where r.content_type = p_type
    and r.content_id = p_id
    and (r.status = 'visible' or r.user_id = auth.uid())
  order by r.updated_at desc
$$;

grant execute on function public.get_content_reviews(text, text) to authenticated, anon;
