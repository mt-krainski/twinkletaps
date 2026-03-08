-- T-004: MQTT credential pool for device registration (claimed_at null = available).
create table public.mqtt_credentials (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,
  allocated_uuid uuid not null unique,
  claimed_at timestamptz
);

create index mqtt_credentials_claimed_at_idx on public.mqtt_credentials (claimed_at);
