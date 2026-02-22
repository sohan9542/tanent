-- Migration 021: Defect Location Labels
-- Simple text labels for defect locations (Kitchen, Bedroom, Bathroom, etc.)

CREATE TABLE IF NOT EXISTS defect_location_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(100) NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_defect_location_labels_label ON defect_location_labels (label);
CREATE INDEX IF NOT EXISTS idx_defect_location_labels_display_order ON defect_location_labels (display_order);
CREATE INDEX IF NOT EXISTS idx_defect_location_labels_deleted_at ON defect_location_labels (deleted_at) WHERE deleted_at IS NULL;

-- Insert default location labels
INSERT INTO defect_location_labels (label, display_order) VALUES
  ('Kitchen', 1),
  ('Bathroom', 2),
  ('Bedroom', 3),
  ('Living Room', 4),
  ('Hallway', 5),
  ('Balcony', 6),
  ('Basement', 7),
  ('Attic', 8),
  ('Garage', 9),
  ('Other', 99)
ON CONFLICT (label) DO NOTHING;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_defect_location_labels_updated_at ON defect_location_labels;
CREATE TRIGGER update_defect_location_labels_updated_at BEFORE UPDATE ON defect_location_labels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
