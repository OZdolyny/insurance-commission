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
  amount DECIMAL(12, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  discount DECIMAL(12, 2) DEFAULT 0,
  commission_rate DECIMAL(5, 4) NOT NULL,
  commission_amount DECIMAL(12, 2) NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  payment_date DATE,
  policy_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_client_policies_client_id ON client_policies(client_id);
CREATE INDEX idx_client_policies_company ON client_policies(insurance_company_code);
CREATE INDEX idx_client_policies_type ON client_policies(insurance_policy_type);
CREATE INDEX idx_client_policies_status ON client_policies(payment_status);
CREATE INDEX idx_policy_rates_company ON insurance_policy_rates(insurance_company_code);
CREATE INDEX idx_policy_rates_type ON insurance_policy_rates(insurance_policy_type);

-- Enable Row Level Security (RLS)
ALTER TABLE insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policy_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policy_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_policies ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for authenticated users)
CREATE POLICY "Enable all operations for authenticated users" ON insurance_companies
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON insurance_policy_types
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON insurance_policy_rates
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON clients
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON client_policies
  FOR ALL USING (auth.role() = 'authenticated');

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
