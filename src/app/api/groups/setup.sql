-- Create groups table for proper group management
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);

-- Insert any existing groups from posts table
INSERT INTO groups (name)
SELECT DISTINCT group_name 
FROM posts 
WHERE group_name IS NOT NULL AND group_name != ''
ON CONFLICT (name) DO NOTHING;
