-- Create issues table for Monthly Issue PDF Upload System
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  pdf_url TEXT NOT NULL,
  pdf_public_id VARCHAR(255),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year, month) -- Only one issue per month
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_issues_year_month ON issues(year, month);
CREATE INDEX IF NOT EXISTS idx_issues_created_by ON issues(created_by);

-- Enable Row Level Security
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view issues
CREATE POLICY "Issues are viewable by everyone"
ON issues FOR SELECT
USING (true);

-- Policy: Only admins can insert issues
CREATE POLICY "Only admins can insert issues"
ON issues FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Policy: Only admins can update their own issues
CREATE POLICY "Only admins can update issues"
ON issues FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Policy: Only admins can delete issues
CREATE POLICY "Only admins can delete issues"
ON issues FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);
