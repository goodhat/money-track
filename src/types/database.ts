export type TransactionType = "income" | "expense";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  color: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  year_month: string;
  amount: number;
  created_at: string;
}

export type RecurrenceFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "yearly";

export interface TransactionTemplate {
  id: string;
  user_id: string;
  name: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  note: string | null;
  is_recurring: boolean;
  recurrence_frequency: RecurrenceFrequency | null;
  recurrence_day: number | null;
  next_occurrence: string | null;
  last_applied: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RecurringTransactionLog {
  id: string;
  template_id: string;
  transaction_id: string;
  user_id: string;
  applied_at: string;
  scheduled_date: string;
}

export interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  filter_type: "all" | "income" | "expense" | null;
  category_id: string | null;
  search_query: string | null;
  created_at: string;
}

export interface CategoryBudget {
  id: string;
  user_id: string;
  category_id: string;
  year_month: string;
  amount: number;
  created_at: string;
}

export interface TransactionAttachment {
  id: string;
  transaction_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export type StreakType = "daily_logging" | "under_budget" | "savings_goal";

export interface SpendingStreak {
  id: string;
  user_id: string;
  streak_type: StreakType;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  created_at: string;
  updated_at: string;
}

export type WidgetType = "budget" | "summary" | "chart" | "category" | "transactions" | "streaks";

export interface UserPreferences {
  id: string;
  user_id: string;
  dashboard_widgets: WidgetType[];
  theme: "light" | "dark" | "system";
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  color: string;
  icon: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalContribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  note: string | null;
  created_at: string;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: TransactionType;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: TransactionType;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: TransactionType;
          color?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          type: TransactionType;
          amount: number;
          date: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          type: TransactionType;
          amount: number;
          date: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          type?: TransactionType;
          amount?: number;
          date?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          year_month: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          year_month: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          year_month?: string;
          amount?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      transaction_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category_id: string;
          type: TransactionType;
          amount: number;
          note: string | null;
          is_recurring: boolean;
          recurrence_frequency: RecurrenceFrequency | null;
          recurrence_day: number | null;
          next_occurrence: string | null;
          last_applied: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category_id: string;
          type: TransactionType;
          amount: number;
          note?: string | null;
          is_recurring?: boolean;
          recurrence_frequency?: RecurrenceFrequency | null;
          recurrence_day?: number | null;
          next_occurrence?: string | null;
          last_applied?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          category_id?: string;
          type?: TransactionType;
          amount?: number;
          note?: string | null;
          is_recurring?: boolean;
          recurrence_frequency?: RecurrenceFrequency | null;
          recurrence_day?: number | null;
          next_occurrence?: string | null;
          last_applied?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_templates_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      recurring_transaction_log: {
        Row: {
          id: string;
          template_id: string;
          transaction_id: string;
          user_id: string;
          applied_at: string;
          scheduled_date: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          transaction_id: string;
          user_id: string;
          applied_at?: string;
          scheduled_date: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          transaction_id?: string;
          user_id?: string;
          applied_at?: string;
          scheduled_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_transaction_log_template_id_fkey";
            columns: ["template_id"];
            referencedRelation: "transaction_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recurring_transaction_log_transaction_id_fkey";
            columns: ["transaction_id"];
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          }
        ];
      };
      saved_filters: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          filter_type: string | null;
          category_id: string | null;
          search_query: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          filter_type?: string | null;
          category_id?: string | null;
          search_query?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          filter_type?: string | null;
          category_id?: string | null;
          search_query?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_filters_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      category_budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          year_month: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          year_month: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          year_month?: string;
          amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_budgets_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "categories";
            referencedColumns: ["id"];
          }
        ];
      };
      transaction_attachments: {
        Row: {
          id: string;
          transaction_id: string;
          user_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          mime_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          user_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          mime_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          user_id?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number;
          mime_type?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transaction_attachments_transaction_id_fkey";
            columns: ["transaction_id"];
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          }
        ];
      };
      spending_streaks: {
        Row: {
          id: string;
          user_id: string;
          streak_type: StreakType;
          current_streak: number;
          longest_streak: number;
          last_activity_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          streak_type: StreakType;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          streak_type?: StreakType;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          dashboard_widgets: WidgetType[];
          theme: "light" | "dark" | "system";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          dashboard_widgets?: WidgetType[];
          theme?: "light" | "dark" | "system";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          dashboard_widgets?: WidgetType[];
          theme?: "light" | "dark" | "system";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount: number;
          target_date: string | null;
          color: string;
          icon: string;
          is_completed: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount?: number;
          target_date?: string | null;
          color?: string;
          icon?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          target_amount?: number;
          current_amount?: number;
          target_date?: string | null;
          color?: string;
          icon?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      goal_contributions: {
        Row: {
          id: string;
          goal_id: string;
          user_id: string;
          amount: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          goal_id: string;
          user_id: string;
          amount: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          goal_id?: string;
          user_id?: string;
          amount?: number;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey";
            columns: ["goal_id"];
            referencedRelation: "savings_goals";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      transaction_type: TransactionType;
    };
    CompositeTypes: Record<string, never>;
  };
}
