-- Update symptoms table to include new fields for enhanced tracking

-- Add new columns to the symptoms table
ALTER TABLE symptoms 
ADD COLUMN IF NOT EXISTS stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
ADD COLUMN IF NOT EXISTS breakfast JSONB,
ADD COLUMN IF NOT EXISTS lunch JSONB,
ADD COLUMN IF NOT EXISTS dinner JSONB,
ADD COLUMN IF NOT EXISTS missed_medications_list JSONB,
ADD COLUMN IF NOT EXISTS nsaid_list JSONB,
ADD COLUMN IF NOT EXISTS antibiotic_list JSONB,
ADD COLUMN IF NOT EXISTS smoking BOOLEAN DEFAULT false;

-- Add comments to the columns for documentation
COMMENT ON COLUMN symptoms.stress_level IS 'Stress level from 1-10 scale';
COMMENT ON COLUMN symptoms.breakfast IS 'JSON array of breakfast items with food and quantity';
COMMENT ON COLUMN symptoms.lunch IS 'JSON array of lunch items with food and quantity';
COMMENT ON COLUMN symptoms.dinner IS 'JSON array of dinner items with food and quantity';
COMMENT ON COLUMN symptoms.missed_medications_list IS 'JSON array of missed medications with medication name, time of day, and date';
COMMENT ON COLUMN symptoms.nsaid_list IS 'JSON array of NSAID usage with details and date';
COMMENT ON COLUMN symptoms.antibiotic_list IS 'JSON array of antibiotic usage with details and date';
COMMENT ON COLUMN symptoms.smoking IS 'Whether the user smokes (true/false)';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'symptoms' 
ORDER BY ordinal_position;
