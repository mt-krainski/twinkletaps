-- T-002: Replace teams/user_teams with devices/user_devices; update role constraints and triggers.

-- Drop trigger that references user_teams (must drop before table rename)
drop trigger if exists log_user_teams_changes on user_teams;

-- Update user_workspaces role constraint: admin, editor, viewer -> admin, member, guest
alter table user_workspaces drop constraint if exists user_workspaces_role_check;
alter table user_workspaces add constraint user_workspaces_role_check check (role in ('admin', 'member', 'guest'));

-- Rename teams -> devices
alter table teams rename to devices;

-- Add device_uuid, mqtt_topic, mqtt_username; drop is_private
alter table devices add column device_uuid uuid default gen_random_uuid() unique;
alter table devices add column mqtt_topic text;
alter table devices add column mqtt_username text;
update devices set mqtt_topic = device_uuid::text where mqtt_topic is null;
alter table devices alter column mqtt_topic set not null;
alter table devices drop column is_private;

-- Recreate unique constraint: device names unique within workspace (excluding soft-deleted)
drop index if exists teams_name_workspace_unique;
create unique index devices_name_workspace_unique on devices (name, workspace_id) where deleted_at is null;

-- Rename indexes for devices
drop index if exists teams_deleted_at_idx;
drop index if exists teams_workspace_id_idx;
create index devices_deleted_at_idx on devices (deleted_at);
create index devices_workspace_id_idx on devices (workspace_id);

-- Rename user_teams -> user_devices and team_id -> device_id
alter table user_teams rename to user_devices;
alter table user_devices rename column team_id to device_id;

-- user_devices.role: only 'user'
alter table user_devices drop constraint if exists user_teams_role_check;
alter table user_devices add constraint user_devices_role_check check (role in ('user'));

-- Rename indexes for user_devices
drop index if exists user_teams_deleted_at_idx;
drop index if exists user_teams_team_id_idx;
create index user_devices_deleted_at_idx on user_devices (deleted_at);
create index user_devices_device_id_idx on user_devices (device_id);

-- Update handle_new_user(): no longer create personal team or user_teams row
create or replace function public.handle_new_user()
returns trigger
set search_path = ''
as $$
declare
  personal_workspace_id uuid;
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');

  insert into public.workspaces (name, avatar_url)
  values ('Personal Workspace', null)
  returning id into personal_workspace_id;

  insert into public.user_workspaces (user_id, workspace_id, role)
  values (new.id, personal_workspace_id, 'admin');

  return new;
end;
$$ language plpgsql security definer;

-- Update log_role_changes(): user_teams -> user_devices, team_id -> device_id
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
    elsif table_name = 'user_devices' then
      record_id := new.user_id || ':' || new.device_id;
      actor_id := new.user_id;
    else
      record_id := new.id::text;
      actor_id := null;
    end if;

    actor_id := coalesce(auth.uid(), actor_id, '00000000-0000-0000-0000-000000000000'::uuid);

    insert into public.role_audit_log (table_name, record_id, user_id, action, new_values)
    values (table_name, record_id, actor_id, 'insert', new_data);
    return new;
  elsif tg_op = 'UPDATE' then
    old_data = to_jsonb(old);
    new_data = to_jsonb(new);

    if table_name = 'user_workspaces' then
      record_id := new.user_id || ':' || new.workspace_id;
      actor_id := new.user_id;
    elsif table_name = 'user_devices' then
      record_id := new.user_id || ':' || new.device_id;
      actor_id := new.user_id;
    else
      record_id := new.id::text;
      actor_id := null;
    end if;

    actor_id := coalesce(auth.uid(), actor_id, '00000000-0000-0000-0000-000000000000'::uuid);

    insert into public.role_audit_log (table_name, record_id, user_id, action, old_values, new_values)
    values (table_name, record_id, actor_id, 'update', old_data, new_data);
    return new;
  elsif tg_op = 'DELETE' then
    old_data = to_jsonb(old);

    if table_name = 'user_workspaces' then
      record_id := old.user_id || ':' || old.workspace_id;
      actor_id := old.user_id;
    elsif table_name = 'user_devices' then
      record_id := old.user_id || ':' || old.device_id;
      actor_id := old.user_id;
    else
      record_id := old.id::text;
      actor_id := null;
    end if;

    actor_id := coalesce(auth.uid(), actor_id, '00000000-0000-0000-0000-000000000000'::uuid);

    insert into public.role_audit_log (table_name, record_id, user_id, action, old_values)
    values (table_name, record_id, actor_id, 'delete', old_data);
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Audit trigger for user_devices
create trigger log_user_devices_changes after insert or update or delete on user_devices
  for each row execute function log_role_changes();
