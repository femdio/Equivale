BEGIN;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_preference_id text;
CREATE UNIQUE INDEX IF NOT EXISTS payments_preference_unique ON payments(provider_preference_id) WHERE provider_preference_id IS NOT NULL;
COMMIT;
