-- 0009_saved_views.sql
-- Named filters on list pages (Invoices, Reminder history). Shared by everyone
-- in the organisation. A new table; nothing existing changes.

CREATE TABLE IF NOT EXISTS saved_views (
  id text PRIMARY KEY,
  org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  page text NOT NULL,
  name text NOT NULL,
  query text NOT NULL DEFAULT '',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS saved_views_org_page_name_uniq ON saved_views (org_id, page, name);
