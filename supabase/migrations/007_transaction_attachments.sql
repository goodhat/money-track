-- Transaction attachments table for receipt storage
CREATE TABLE transaction_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries by transaction
CREATE INDEX idx_transaction_attachments_transaction ON transaction_attachments(transaction_id);

-- RLS policies
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attachments"
  ON transaction_attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attachments"
  ON transaction_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments"
  ON transaction_attachments FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for receipts (run this in Supabase dashboard or via CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Storage policies for receipts bucket
-- CREATE POLICY "Users can upload receipts" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
-- CREATE POLICY "Users can view own receipts" ON storage.objects
--   FOR SELECT USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can delete own receipts" ON storage.objects
--   FOR DELETE USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
