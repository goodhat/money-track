-- Seed default categories function
-- This function will be called after user signup to create default categories

CREATE OR REPLACE FUNCTION create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert expense categories
  INSERT INTO categories (user_id, name, type) VALUES
    (NEW.id, '餐飲', 'expense'),
    (NEW.id, '交通', 'expense'),
    (NEW.id, '娛樂', 'expense'),
    (NEW.id, '購物', 'expense'),
    (NEW.id, '居住', 'expense'),
    (NEW.id, '其他', 'expense');

  -- Insert income categories
  INSERT INTO categories (user_id, name, type) VALUES
    (NEW.id, '薪資', 'income'),
    (NEW.id, '投資', 'income'),
    (NEW.id, '其他', 'income');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run after user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_categories();
