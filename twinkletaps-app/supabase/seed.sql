-- Test MQTT credentials for local development and CI.
-- Provides a pool of unclaimed credentials for device registration tests.
-- These are not real broker credentials — they are placeholders only.
INSERT INTO public.mqtt_credentials (username, password, allocated_uuid)
VALUES
  ('test-device-01', 'test-password', '10000000-0000-4000-8000-000000000001'),
  ('test-device-02', 'test-password', '10000000-0000-4000-8000-000000000002'),
  ('test-device-03', 'test-password', '10000000-0000-4000-8000-000000000003'),
  ('test-device-04', 'test-password', '10000000-0000-4000-8000-000000000004'),
  ('test-device-05', 'test-password', '10000000-0000-4000-8000-000000000005'),
  ('test-device-06', 'test-password', '10000000-0000-4000-8000-000000000006'),
  ('test-device-07', 'test-password', '10000000-0000-4000-8000-000000000007'),
  ('test-device-08', 'test-password', '10000000-0000-4000-8000-000000000008'),
  ('test-device-09', 'test-password', '10000000-0000-4000-8000-000000000009'),
  ('test-device-10', 'test-password', '10000000-0000-4000-8000-000000000010'),
  ('test-device-11', 'test-password', '10000000-0000-4000-8000-000000000011'),
  ('test-device-12', 'test-password', '10000000-0000-4000-8000-000000000012'),
  ('test-device-13', 'test-password', '10000000-0000-4000-8000-000000000013'),
  ('test-device-14', 'test-password', '10000000-0000-4000-8000-000000000014'),
  ('test-device-15', 'test-password', '10000000-0000-4000-8000-000000000015'),
  ('test-device-16', 'test-password', '10000000-0000-4000-8000-000000000016'),
  ('test-device-17', 'test-password', '10000000-0000-4000-8000-000000000017'),
  ('test-device-18', 'test-password', '10000000-0000-4000-8000-000000000018'),
  ('test-device-19', 'test-password', '10000000-0000-4000-8000-000000000019'),
  ('test-device-20', 'test-password', '10000000-0000-4000-8000-000000000020')
ON CONFLICT DO NOTHING;
