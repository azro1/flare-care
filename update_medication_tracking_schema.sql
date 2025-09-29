-- Update database schema for medication tracking reorganization
-- This moves medication-related fields from symptoms to medications table
-- and adds smoking details to symptoms table

-- 1. Add medication tracking columns to medications table
ALTER TABLE medications
ADD COLUMN IF NOT EXISTS missed_medications_list JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS nsaid_list JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS antibiotic_list JSONB DEFAULT '[]'::jsonb;

-- 2. Add smoking details column to symptoms table
ALTER TABLE symptoms
ADD COLUMN IF NOT EXISTS smoking_details TEXT;

-- 3. Add comments for documentation
COMMENT ON COLUMN medications.missed_medications_list IS 'List of missed medications with details, time of day, and date';
COMMENT ON COLUMN medications.nsaid_list IS 'List of NSAID usage with details, date, and time of day';
COMMENT ON COLUMN medications.antibiotic_list IS 'List of antibiotic usage with details, date, and time of day';
COMMENT ON COLUMN symptoms.smoking_details IS 'Detailed description of smoking habits (frequency, type, amount)';

-- 4. Remove old medication columns from symptoms table (now moved to medications table)
ALTER TABLE symptoms DROP COLUMN IF EXISTS missed_medications_list;
ALTER TABLE symptoms DROP COLUMN IF EXISTS nsaid_list;
ALTER TABLE symptoms DROP COLUMN IF EXISTS antibiotic_list;
ALTER TABLE symptoms DROP COLUMN IF EXISTS missed_medications;
ALTER TABLE symptoms DROP COLUMN IF EXISTS nsaid_usage;
ALTER TABLE symptoms DROP COLUMN IF EXISTS antibiotic_usage;

-- 5. Update updated_at timestamp on changes for medications table
CREATE OR REPLACE FUNCTION update_medications_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_medications_updated_at ON medications;
CREATE TRIGGER update_medications_updated_at
BEFORE UPDATE ON medications
FOR EACH ROW
EXECUTE FUNCTION update_medications_updated_at_column();
