-- 0022_integration_providers.sql
-- Widens the integration_provider enum for the new accounting providers and CSV import.
-- The app also does this itself at runtime (src/lib/integrations/provider-enum.ts).
-- Safe to run twice; does nothing when integrations.provider is plain text.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_provider' AND typtype = 'e') THEN
    ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'freshbooks';
    ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'zoho_books';
    ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'sage';
    ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'wave';
    ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'csv';
  END IF;
END $$;
