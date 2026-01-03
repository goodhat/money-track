import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // format: YYYY-MM

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Default to current month
  const targetMonth = month || (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();

  const startDate = `${targetMonth}-01`;
  const [year, monthNum] = targetMonth.split("-").map(Number);
  const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
  const nextYear = monthNum === 12 ? year + 1 : year;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  // Get transactions for the month
  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select(`
      id,
      type,
      amount,
      date,
      note,
      category:categories(id, name, type)
    `)
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lt("date", endDate)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  // Get budget for the month
  const { data: budget } = await supabase
    .from("budgets")
    .select("amount")
    .eq("user_id", user.id)
    .eq("year_month", targetMonth)
    .single();

  // Calculate totals
  const totalIncome = transactions
    ?.filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

  const totalExpense = transactions
    ?.filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

  const netIncome = totalIncome - totalExpense;

  // Calculate expense by category
  const expenseByCategory = transactions
    ?.filter((tx) => tx.type === "expense")
    .reduce((acc, tx) => {
      const categoryName = tx.category?.name || "未分類";
      acc[categoryName] = (acc[categoryName] || 0) + Number(tx.amount);
      return acc;
    }, {} as Record<string, number>) || {};

  // Recent transactions (last 5)
  const recentTransactions = transactions?.slice(0, 5) || [];

  return NextResponse.json({
    data: {
      month: targetMonth,
      totalIncome,
      totalExpense,
      netIncome,
      budget: budget?.amount || null,
      expenseByCategory,
      recentTransactions,
    },
  });
}
