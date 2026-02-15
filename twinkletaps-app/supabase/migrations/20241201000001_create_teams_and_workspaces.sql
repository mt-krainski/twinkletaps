-- Create workspaces table
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone
);

-- Create teams table
create table teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  name text not null,
  avatar_url text,
  is_private boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone
);

-- Create user-workspace relationships with roles
create table user_workspaces (
  user_id uuid references profiles(id) on delete cascade not null,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone,
  primary key (user_id, workspace_id)
);

-- Create user-team relationships with roles
create table user_teams (
  user_id uuid references profiles(id) on delete cascade not null,
  team_id uuid references teams(id) on delete cascade not null,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone,
  primary key (user_id, team_id)
);

-- Create audit trail table for role changes
create table role_audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,
  user_id uuid references profiles(id) not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_values jsonb,
  new_values jsonb,
  changed_at timestamp with time zone default now()
);

-- Unique constraint: team names unique within workspace (excluding soft-deleted)
create unique index teams_name_workspace_unique on teams (name, workspace_id) where deleted_at is null;

-- Performance indexes
create index workspaces_deleted_at_idx on workspaces (deleted_at);
create index teams_deleted_at_idx on teams (deleted_at);
create index teams_workspace_id_idx on teams (workspace_id);
create index user_workspaces_deleted_at_idx on user_workspaces (deleted_at);
create index user_workspaces_workspace_id_idx on user_workspaces (workspace_id);
create index user_teams_deleted_at_idx on user_teams (deleted_at);
create index user_teams_team_id_idx on user_teams (team_id);
create index role_audit_log_table_record_idx on role_audit_log (table_name, record_id);
create index role_audit_log_user_id_idx on role_audit_log (user_id);

-- Function to log role changes (for audit trail)
create or replace function log_role_changes()
returns trigger
set search_path = ''
as $$
declare
  old_data jsonb;
  new_data jsonb;
  table_name text;
  record_id text;
  actor_id uuid;
begin
  table_name := tg_table_name;
  
  if tg_op = 'INSERT' then
    new_data = to_jsonb(new);

    if table_name = 'user_workspaces' then
      record_id := new.user_id || ':' || new.workspace_id;
      actor_id := new.user_id;
    elsif table_name = 'user_teams' then
      record_id := new.user_id || ':' || new.team_id;
      actor_id := new.user_id;
    else
      record_id := new.id::text;
      actor_id := null;
    end if;

    actor_id := coalesce(auth.uid(), actor_id, '00000000-0000-0000-0000-000000000000'::uuid);

    insert into public.role_audit_log (table_name, record_id, user_id, action, new_values)
    values (table_name,
            record_id,
            actor_id,
            'insert',
            new_data);
    return new;
  elsif tg_op = 'UPDATE' then
    old_data = to_jsonb(old);
    new_data = to_jsonb(new);

    if table_name = 'user_workspaces' then
      record_id := new.user_id || ':' || new.workspace_id;
      actor_id := new.user_id;
    elsif table_name = 'user_teams' then
      record_id := new.user_id || ':' || new.team_id;
      actor_id := new.user_id;
    else
      record_id := new.id::text;
      actor_id := null;
    end if;

    actor_id := coalesce(auth.uid(), actor_id, '00000000-0000-0000-0000-000000000000'::uuid);

    insert into public.role_audit_log (table_name, record_id, user_id, action, old_values, new_values)
    values (table_name,
            record_id,
            actor_id,
            'update',
            old_data,
            new_data);
    return new;
  elsif tg_op = 'DELETE' then
    old_data = to_jsonb(old);

    if table_name = 'user_workspaces' then
      record_id := old.user_id || ':' || old.workspace_id;
      actor_id := old.user_id;
    elsif table_name = 'user_teams' then
      record_id := old.user_id || ':' || old.team_id;
      actor_id := old.user_id;
    else
      record_id := old.id::text;
      actor_id := null;
    end if;

    actor_id := coalesce(auth.uid(), actor_id, '00000000-0000-0000-0000-000000000000'::uuid);

    insert into public.role_audit_log (table_name, record_id, user_id, action, old_values)
    values (table_name,
            record_id,
            actor_id,
            'delete',
            old_data);
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Triggers for role change logging
create trigger log_user_workspaces_changes after insert or update or delete on user_workspaces
  for each row execute function log_role_changes();

create trigger log_user_teams_changes after insert or update or delete on user_teams
  for each row execute function log_role_changes();
