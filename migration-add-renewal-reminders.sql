-- Migration: Telegram renewal reminders
-- Run in the Supabase SQL Editor. Safe to run more than once.
--
-- 1. client_policies.renewal_status: set when a policy has been renewed or the client will not renew.
--    Reminders stop for policies that have a status.
-- 2. client_policies.reminders_snoozed_until: no reminders for this policy until after this date.
-- 3. notifications: one row per reminder that was planned or sent. The unique constraint makes
--    duplicate reminders impossible, even if the daily job runs twice.

ALTER TABLE client_policies
  ADD COLUMN IF NOT EXISTS renewal_status TEXT
    CHECK (renewal_status IN ('renewed', 'not_renewing')),
  ADD COLUMN IF NOT EXISTS reminders_snoozed_until DATE;

-- The daily job looks up policies by end date
CREATE INDEX IF NOT EXISTS idx_client_policies_end_date ON client_policies(end_date);

CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  policy_id   INTEGER NOT NULL REFERENCES client_policies(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,                     -- 'renewal' (later: other reminder types)
  days_before INTEGER NOT NULL,                  -- 30, 7, 1, 0, or -1 (= ended, not renewed)
  channel     TEXT NOT NULL DEFAULT 'telegram',
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'sent', 'failed')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  sent_at     TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (policy_id, kind, days_before, channel)
);

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- Row Level Security ON with no policies: the browser app (public anon key) cannot read or
-- change this table. Only the server-side reminder job can, using the service-role key.
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
