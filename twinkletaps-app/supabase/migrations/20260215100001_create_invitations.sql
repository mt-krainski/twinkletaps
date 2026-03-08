-- T-011: Invitation schema — one-time tokens, workspace|device, 48h expiry.
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('workspace', 'device')),
  token text not null unique,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  device_id uuid references public.devices(id) on delete cascade,
  role text not null check (role in ('admin', 'member', 'guest', 'user')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null
);

create index invitations_workspace_id_type_idx on public.invitations (workspace_id, type);
