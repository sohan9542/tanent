-- Add new fields to tenants table: contract dates, floor, additional notes
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS contract_start_date DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE,
  ADD COLUMN IF NOT EXISTS floor VARCHAR(50),
  ADD COLUMN IF NOT EXISTS additional_notes TEXT;

-- Create indexes for contract dates for filtering
CREATE INDEX IF NOT EXISTS idx_tenants_contract_start ON tenants(contract_start_date);
CREATE INDEX IF NOT EXISTS idx_tenants_contract_end ON tenants(contract_end_date);
