-- Create a table for public profiles
-- Profile id references auth.users - this is the link between Supabase Auth and our app data
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  constraint username_length check (char_length(username) >= 3)
);

-- Set up Storage for avatars
insert into storage.buckets (id, name)
  values ('avatars', 'avatars');

-- Storage access controls
create policy "Avatar images are publicly accessible." on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Anyone can upload an avatar." on storage.objects
  for insert with check (bucket_id = 'avatars');
