-- Run this SQL in your Supabase SQL Editor to set up the database
-- NOTE: If you already ran the old version, run the migration at the bottom instead

-- Create suggestions table
CREATE TABLE suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'hidden' CHECK (status IN ('hidden', 'pending', 'in_progress', 'published')),
  video_url TEXT,
  votes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  voter_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(suggestion_id, voter_email)
);

-- Enable Row Level Security
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Policies for suggestions table
-- Anyone can read suggestions
CREATE POLICY "Anyone can read suggestions" ON suggestions
  FOR SELECT USING (true);

-- Anyone can insert suggestions
CREATE POLICY "Anyone can insert suggestions" ON suggestions
  FOR INSERT WITH CHECK (true);

-- Only authenticated users can update suggestions (admin)
CREATE POLICY "Authenticated users can update suggestions" ON suggestions
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Only authenticated users can delete suggestions (admin)
CREATE POLICY "Authenticated users can delete suggestions" ON suggestions
  FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for votes table
-- Anyone can read votes
CREATE POLICY "Anyone can read votes" ON votes
  FOR SELECT USING (true);

-- Anyone can insert votes
CREATE POLICY "Anyone can insert votes" ON votes
  FOR INSERT WITH CHECK (true);

-- Only authenticated users can delete votes (admin)
CREATE POLICY "Authenticated users can delete votes" ON votes
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create index for faster searches
CREATE INDEX idx_suggestions_title ON suggestions USING gin(to_tsvector('english', title));
CREATE INDEX idx_suggestions_status ON suggestions(status);
CREATE INDEX idx_votes_suggestion_id ON votes(suggestion_id);


-- ============================================
-- MIGRATION: If you already have the old schema, run this instead:
-- ============================================
-- ALTER TABLE suggestions DROP CONSTRAINT suggestions_status_check;
-- ALTER TABLE suggestions ADD CONSTRAINT suggestions_status_check CHECK (status IN ('hidden', 'pending', 'in_progress', 'published'));
-- UPDATE suggestions SET status = 'hidden' WHERE status = 'pending';
