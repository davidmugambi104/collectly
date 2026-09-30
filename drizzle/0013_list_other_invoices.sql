-- 0013_list_other_invoices.sql
-- A reminder also lists the customer's other overdue invoices. On by default;
-- an organisation can switch it off in Send settings.

ALTER TABLE dunning_settings ADD COLUMN IF NOT EXISTS list_other_invoices boolean NOT NULL DEFAULT true;
