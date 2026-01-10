-- Create saved_filters table for storing user's filter presets
CREATE TABLE saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filter_type TEXT, -- 'all', 'income', 'expense'
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  search_query TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_saved_filters_user_id ON saved_filters(user_id);

-- Enable Row Level Security
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_filters
CREATE POLICY "Users can view their own saved filters"
  ON saved_filters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved filters"
  ON saved_filters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved filters"
  ON saved_filters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved filters"
  ON saved_filters FOR DELETE
  USING (auth.uid() = user_id);
