-- Add recurring transaction support to templates
-- This allows templates to be scheduled for automatic transaction creation

-- Add scheduling columns to transaction_templates
ALTER TABLE transaction_templates
ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN recurrence_frequency TEXT CHECK (recurrence_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
ADD COLUMN recurrence_day INTEGER CHECK (recurrence_day >= 1 AND recurrence_day <= 31),
ADD COLUMN next_occurrence DATE,
ADD COLUMN last_applied DATE,
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Create index for efficient querying of due recurring transactions
CREATE INDEX idx_recurring_templates_next_occurrence
ON transaction_templates(next_occurrence)
WHERE is_recurring = TRUE AND is_active = TRUE;

-- Create a table to track recurring transaction history
CREATE TABLE recurring_transaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES transaction_templates(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_date DATE NOT NULL
);

-- Create indexes for the log table
CREATE INDEX idx_recurring_log_template_id ON recurring_transaction_log(template_id);
CREATE INDEX idx_recurring_log_user_id ON recurring_transaction_log(user_id);

-- Enable Row Level Security for the log table
ALTER TABLE recurring_transaction_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring_transaction_log
CREATE POLICY "Users can view their own recurring logs"
  ON recurring_transaction_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring logs"
  ON recurring_transaction_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring logs"
  ON recurring_transaction_log FOR DELETE
  USING (auth.uid() = user_id);
