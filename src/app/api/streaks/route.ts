import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SpendingStreak, StreakType } from "@/types/database";

// Get today's date in YYYY-MM-DD format
function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

// Get yesterday's date in YYYY-MM-DD format
function getYesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

// Calculate the difference in days between two dates
function daysDiff(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getToday();
  const yearMonth = today.substring(0, 7);

  // Get all streaks for the user
  const { data: streaks, error } = await supabase
    .from("spending_streaks")
    .select("*")
    .eq("user_id", user.id) as unknown as { data: SpendingStreak[] | null; error: Error | null };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get today's transactions count
  const { count: todayTransactions } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("date", today);

  // Get this month's expense total
  const { data: monthlyData } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", user.id)
    .eq("type", "expense")
    .gte("date", `${yearMonth}-01`)
    .lte("date", today);

  const monthlyExpense = (monthlyData || []).reduce((sum, t) => sum + (t.amount as number), 0);

  // Get this month's budget
  const { data: budget } = await supabase
    .from("budgets")
    .select("amount")
    .eq("user_id", user.id)
    .eq("year_month", yearMonth)
    .single();

  const monthlyBudget = budget?.amount || 0;

  // Check daily logging streak
  const dailyLoggingActive = (todayTransactions || 0) > 0;

  // Check under budget streak (only if budget is set)
  const underBudgetActive = monthlyBudget > 0 && monthlyExpense <= monthlyBudget;

  // Check savings goal (income > expense this month)
  const { data: monthlyIncomeData } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", user.id)
    .eq("type", "income")
    .gte("date", `${yearMonth}-01`)
    .lte("date", today);

  const monthlyIncome = (monthlyIncomeData || []).reduce((sum, t) => sum + (t.amount as number), 0);
  const savingsGoalActive = monthlyIncome > monthlyExpense;

  // Build response with streak info
  const streakMap = new Map<StreakType, SpendingStreak>();
  for (const streak of streaks || []) {
    streakMap.set(streak.streak_type, streak);
  }

  const response = {
    daily_logging: {
      current: streakMap.get("daily_logging")?.current_streak || 0,
      longest: streakMap.get("daily_logging")?.longest_streak || 0,
      active_today: dailyLoggingActive,
      last_activity: streakMap.get("daily_logging")?.last_activity_date || null,
    },
    under_budget: {
      current: streakMap.get("under_budget")?.current_streak || 0,
      longest: streakMap.get("under_budget")?.longest_streak || 0,
      active_today: underBudgetActive,
      last_activity: streakMap.get("under_budget")?.last_activity_date || null,
      budget: monthlyBudget,
      spent: monthlyExpense,
    },
    savings_goal: {
      current: streakMap.get("savings_goal")?.current_streak || 0,
      longest: streakMap.get("savings_goal")?.longest_streak || 0,
      active_today: savingsGoalActive,
      last_activity: streakMap.get("savings_goal")?.last_activity_date || null,
      income: monthlyIncome,
      expense: monthlyExpense,
    },
  };

  return NextResponse.json({ data: response });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { streak_type } = body as { streak_type: StreakType };

  if (!streak_type || !["daily_logging", "under_budget", "savings_goal"].includes(streak_type)) {
    return NextResponse.json({ error: "Invalid streak type" }, { status: 400 });
  }

  const today = getToday();
  const yesterday = getYesterday();

  // Get existing streak
  const { data: existing } = await supabase
    .from("spending_streaks")
    .select("*")
    .eq("user_id", user.id)
    .eq("streak_type", streak_type)
    .single() as unknown as { data: SpendingStreak | null };

  if (!existing) {
    // Create new streak
    const { data: newStreak, error } = await supabase
      .from("spending_streaks")
      .insert({
        user_id: user.id,
        streak_type,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: newStreak }, { status: 201 });
  }

  // Already logged today
  if (existing.last_activity_date === today) {
    return NextResponse.json({ data: existing });
  }

  // Calculate new streak
  let newCurrentStreak = 1;

  // If last activity was yesterday, continue the streak
  if (existing.last_activity_date === yesterday) {
    newCurrentStreak = existing.current_streak + 1;
  } else if (daysDiff(existing.last_activity_date, today) <= 1) {
    // Same day or yesterday
    newCurrentStreak = existing.current_streak + 1;
  }
  // Otherwise, streak resets to 1

  const newLongestStreak = Math.max(existing.longest_streak, newCurrentStreak);

  // Update streak
  const { data: updated, error } = await supabase
    .from("spending_streaks")
    .update({
      current_streak: newCurrentStreak,
      longest_streak: newLongestStreak,
      last_activity_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: updated });
}
