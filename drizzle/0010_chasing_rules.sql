-- 0010_chasing_rules.sql
-- Two owner-set chasing rules on the existing per-org settings row:
--   min_gap_days  at most one new reminder per customer in this many days (0 = off)
--   min_balance   do not chase an invoice whose balance is below this (0 = off)
-- Existing rows take the defaults, so every org starts with a 7-day gap.

ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS min_gap_days smallint NOT NULL DEFAULT 7;
ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS min_balance numeric(14,2) NOT NULL DEFAULT 0;
