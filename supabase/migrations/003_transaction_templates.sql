-- Create transaction_templates table for saving frequently used transactions
CREATE TABLE transaction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_transaction_templates_user_id ON transaction_templates(user_id);

-- Enable Row Level Security
ALTER TABLE transaction_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transaction_templates
CREATE POLICY "Users can view their own templates"
  ON transaction_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
  ON transaction_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON transaction_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON transaction_templates FOR DELETE
  USING (auth.uid() = user_id);
