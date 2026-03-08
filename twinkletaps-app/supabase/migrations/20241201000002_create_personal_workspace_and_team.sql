-- Trigger function that creates profile, personal workspace, and team when a new user signs up
-- This runs automatically when a user is created in Supabase Auth
create function public.handle_new_user()
returns trigger
set search_path = ''
as $$
declare
  personal_workspace_id uuid;
  personal_team_id uuid;
begin
  -- Create profile
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  -- Create personal workspace
  insert into public.workspaces (name, avatar_url)
  values (
    'Personal Workspace',
    null
  )
  returning id into personal_workspace_id;
  
  -- Create personal team
  insert into public.teams (workspace_id, name, is_private)
  values (
    personal_workspace_id,
    'Personal',
    true
  )
  returning id into personal_team_id;
  
  -- Add user to workspace as admin
  insert into public.user_workspaces (user_id, workspace_id, role)
  values (new.id, personal_workspace_id, 'admin');
  
  -- Add user to team as admin
  insert into public.user_teams (user_id, team_id, role)
  values (new.id, personal_team_id, 'admin');
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger that fires after a new user is created in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
