import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface CategoryBudgetWithSpent {
  category_id: string;
  category_name: string;
  category_color: string | null;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ year_month: string }> }
) {
  const { year_month } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all expense categories with their budgets for this month
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, name, color")
    .eq("user_id", user.id)
    .eq("type", "expense")
    .order("name");

  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 });
  }

  // Get category budgets for this month
  const { data: budgets, error: budgetError } = await supabase
    .from("category_budgets")
    .select("category_id, amount")
    .eq("user_id", user.id)
    .eq("year_month", year_month);

  if (budgetError) {
    return NextResponse.json({ error: budgetError.message }, { status: 500 });
  }

  // Get spending per category for this month
  const startDate = `${year_month}-01`;
  const [year, monthNum] = year_month.split("-").map(Number);
  const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
  const nextYear = monthNum === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("category_id, amount")
    .eq("user_id", user.id)
    .eq("type", "expense")
    .gte("date", startDate)
    .lt("date", endDate);

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  // Calculate spending per category
  const spendingMap = new Map<string, number>();
  for (const tx of transactions || []) {
    const current = spendingMap.get(tx.category_id) || 0;
    spendingMap.set(tx.category_id, current + tx.amount);
  }

  // Build budget map
  const budgetMap = new Map<string, number>();
  for (const budget of budgets || []) {
    budgetMap.set(budget.category_id, budget.amount);
  }

  // Combine data
  const result: CategoryBudgetWithSpent[] = (categories || []).map((cat) => {
    const budget = budgetMap.get(cat.id) || 0;
    const spent = spendingMap.get(cat.id) || 0;
    const remaining = budget - spent;
    const percentage = budget > 0 ? (spent / budget) * 100 : (spent > 0 ? 100 : 0);

    return {
      category_id: cat.id,
      category_name: cat.name,
      category_color: cat.color,
      budget,
      spent,
      remaining,
      percentage,
    };
  });

  return NextResponse.json({ data: result });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ year_month: string }> }
) {
  const { year_month } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { category_id, amount } = body;

  if (!category_id) {
    return NextResponse.json(
      { error: "category_id is required" },
      { status: 400 }
    );
  }

  if (amount === undefined || amount < 0) {
    return NextResponse.json(
      { error: "amount must be a non-negative number" },
      { status: 400 }
    );
  }

  // Upsert the category budget
  const { data, error } = await supabase
    .from("category_budgets")
    .upsert(
      {
        user_id: user.id,
        category_id,
        year_month,
        amount,
      },
      { onConflict: "user_id,category_id,year_month" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
