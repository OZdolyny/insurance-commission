-- Insurance Commission Tracker Database Schema
-- Enhanced version with Insurance Companies and Policy Types
-- Run this in your Supabase SQL Editor

-- Table 1: Insurance Companies
CREATE TABLE insurance_companies (
  code VARCHAR(3) PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  manager_name TEXT,
  manager_email TEXT,
  manager_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: Insurance Policy Types
CREATE TABLE insurance_policy_types (
  type VARCHAR(3) PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: Insurance Policy Rates (Commission rates per company per policy type)
CREATE TABLE insurance_policy_rates (
  id SERIAL PRIMARY KEY,
  insurance_company_code VARCHAR(3) REFERENCES insurance_companies(code) ON DELETE CASCADE,
  insurance_policy_type VARCHAR(3) REFERENCES insurance_policy_types(type) ON DELETE CASCADE,
  commission_rate DECIMAL(5, 4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(insurance_company_code, insurance_policy_type)
);

-- Table 4: Clients
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  father_name TEXT,
  phone_number TEXT,
  email TEXT,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 5: Client Policies
CREATE TABLE client_policies (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  insurance_company_code VARCHAR(3) REFERENCES insurance_companies(code),
  insurance_policy_type VARCHAR(3) REFERENCES insurance_policy_types(type),
  amount DECIMAL(12, 2) NOT NULL, -- Policy Amount
  paid_amount DECIMAL(12, 2) NOT NULL, -- Amount actually paid by client
  discount DECIMAL(12, 2) GENERATED ALWAYS AS (amount - paid_amount) STORED, -- Auto-calculated
  start_date DATE NOT NULL,
  end_date DATE,
  policy_date DATE, -- contract date ("Дата укладення Договору")
  -- Stored policy file (Supabase Storage bucket "policy-files"; see migration-policy-files.sql for the bucket and its access rules)
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_uploaded_at TIMESTAMP WITH TIME ZONE,
  commission_rate DECIMAL(5, 4) NOT NULL,
  no_commission BOOLEAN DEFAULT FALSE, -- If true, commission_amount = 0
  commission_amount DECIMAL(12, 2) NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  payment_date DATE,
  policy_number TEXT,
  comment TEXT,
  renewal_status TEXT CHECK (renewal_status IN ('renewed', 'not_renewing')), -- reminders stop when set
  reminders_snoozed_until DATE, -- no reminders until after this date
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 6: Notifications (renewal reminders sent by the daily job)
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  policy_id INTEGER NOT NULL REFERENCES client_policies(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'renewal'
  days_before INTEGER NOT NULL, -- 30, 7, 1, 0, -1 (= ended, not renewed)
  channel TEXT NOT NULL DEFAULT 'telegram',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (policy_id, kind, days_before, channel)
);

-- Create indexes for better performance
CREATE INDEX idx_client_policies_client_id ON client_policies(client_id);
CREATE INDEX idx_client_policies_company ON client_policies(insurance_company_code);
CREATE INDEX idx_client_policies_type ON client_policies(insurance_policy_type);
CREATE INDEX idx_client_policies_status ON client_policies(payment_status);
CREATE INDEX idx_client_policies_policy_date ON client_policies(policy_date);
CREATE INDEX idx_client_policies_end_date ON client_policies(end_date);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_policy_rates_company ON insurance_policy_rates(insurance_company_code);
CREATE INDEX idx_policy_rates_type ON insurance_policy_rates(insurance_policy_type);

-- Enable Row Level Security (RLS)
ALTER TABLE insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policy_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policy_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- No policies on notifications: only the server-side job (service-role key) can use it
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_policies ENABLE ROW LEVEL SECURITY;

-- App users and roles (see migration-auth-1-roles.sql for comments)
CREATE TABLE app_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('super_admin', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.app_role() RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT role FROM public.app_users WHERE user_id = (SELECT auth.uid()) $$;

CREATE FUNCTION public.is_app_user() RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.app_users WHERE user_id = (SELECT auth.uid())) $$;

CREATE POLICY "Users read their own role" ON app_users FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.app_role()) = 'super_admin');
CREATE POLICY "Super admins manage roles" ON app_users FOR ALL TO authenticated
  USING ((SELECT public.app_role()) = 'super_admin') WITH CHECK ((SELECT public.app_role()) = 'super_admin');

-- Data: only signed-in users listed in app_users (see migration-auth-2-lock-tables.sql)
CREATE POLICY "App users have full access" ON insurance_companies FOR ALL TO authenticated
  USING ((SELECT public.is_app_user())) WITH CHECK ((SELECT public.is_app_user()));
CREATE POLICY "App users have full access" ON insurance_policy_types FOR ALL TO authenticated
  USING ((SELECT public.is_app_user())) WITH CHECK ((SELECT public.is_app_user()));
CREATE POLICY "App users have full access" ON insurance_policy_rates FOR ALL TO authenticated
  USING ((SELECT public.is_app_user())) WITH CHECK ((SELECT public.is_app_user()));
CREATE POLICY "App users have full access" ON clients FOR ALL TO authenticated
  USING ((SELECT public.is_app_user())) WITH CHECK ((SELECT public.is_app_user()));
CREATE POLICY "App users have full access" ON client_policies FOR ALL TO authenticated
  USING ((SELECT public.is_app_user())) WITH CHECK ((SELECT public.is_app_user()));

-- Hide everything from anonymous visitors (the app always signs in; see migrations 3 and 4)
REVOKE EXECUTE ON FUNCTION public.app_role(), public.is_app_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_role(), public.is_app_user() TO authenticated, service_role;
REVOKE ALL ON TABLE app_users, notifications, clients, client_policies, insurance_companies, insurance_policy_types, insurance_policy_rates FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- After creating your account in Authentication → Users, make it the super admin:
--   INSERT INTO app_users (user_id, role) SELECT id, 'super_admin' FROM auth.users WHERE email = '<your email>';

-- Sample data to get you started (optional - you can delete this section)

-- Sample Insurance Companies
INSERT INTO insurance_companies (code, name, address, manager_name, manager_email, manager_phone) VALUES
('AXA', 'AXA Insurance', '123 Main St, City', 'John Smith', 'john@axa.com', '+1234567890'),
('PRU', 'Prudential Insurance', '456 Oak Ave, City', 'Jane Doe', 'jane@prudential.com', '+0987654321');

-- Sample Policy Types
INSERT INTO insurance_policy_types (type, name) VALUES
('LIF', 'Life Insurance'),
('HLT', 'Health Insurance'),
('AUT', 'Auto Insurance'),
('HOM', 'Home Insurance');

-- Sample Policy Rates
INSERT INTO insurance_policy_rates (insurance_company_code, insurance_policy_type, commission_rate) VALUES
('AXA', 'LIF', 0.15),
('AXA', 'HLT', 0.10),
('AXA', 'AUT', 0.08),
('PRU', 'LIF', 0.18),
('PRU', 'HLT', 0.12);
