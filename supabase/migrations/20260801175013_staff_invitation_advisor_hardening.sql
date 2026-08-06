-- Explicitly document deny-by-default direct access and cover every invitation FK.
create policy staff_invitations_deny_direct_access
  on public.staff_invitations
  for all
  to anon,authenticated
  using(false)
  with check(false);

create index if not exists staff_invitations_role_id_idx
  on public.staff_invitations(role_id);
create index if not exists staff_invitations_created_by_idx
  on public.staff_invitations(created_by);
create index if not exists staff_invitations_used_by_idx
  on public.staff_invitations(used_by)
  where used_by is not null;
