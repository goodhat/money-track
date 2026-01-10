-- Add color column to categories table
ALTER TABLE categories ADD COLUMN color TEXT DEFAULT NULL;

-- Note: Users can customize colors for their categories
-- Colors are stored as hex values (e.g., '#10b981')
