-- Create category_budgets table for per-category spending limits
CREATE TABLE category_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_id, year_month)
);

-- Create indexes
CREATE INDEX idx_category_budgets_user_id ON category_budgets(user_id);
CREATE INDEX idx_category_budgets_category_id ON category_budgets(category_id);
CREATE INDEX idx_category_budgets_year_month ON category_budgets(year_month);

-- Enable Row Level Security
ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for category_budgets
CREATE POLICY "Users can view their own category budgets"
  ON category_budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own category budgets"
  ON category_budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category budgets"
  ON category_budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own category budgets"
  ON category_budgets FOR DELETE
  USING (auth.uid() = user_id);
