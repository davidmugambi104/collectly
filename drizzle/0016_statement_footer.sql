-- 0016_statement_footer.sql
-- Payment details or terms shown at the bottom of every statement.

ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS statement_footer text;
