-- Add new fields to objects table: object_id, street, zip, city
ALTER TABLE objects
  ADD COLUMN IF NOT EXISTS object_id VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS street VARCHAR(255),
  ADD COLUMN IF NOT EXISTS zip VARCHAR(20),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Create index on object_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_objects_object_id ON objects(object_id);
