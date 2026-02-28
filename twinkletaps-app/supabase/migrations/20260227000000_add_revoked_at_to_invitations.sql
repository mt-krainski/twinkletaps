-- T-014: Add revoked_at to invitations for admin revocation support.
alter table public.invitations add column revoked_at timestamptz;
