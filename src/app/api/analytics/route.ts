import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface MonthlyData {
  yearMonth: string;
  income: number;
  expense: number;
  savings: number;
}

interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  type: "income" | "expense";
  total: number;
  percentage: number;
}

interface TransactionAmount {
  type: "income" | "expense";
  amount: number;
}

interface AnalyticsResponse {
  monthlyTrends: MonthlyData[];
  yearOverYear: {
    currentYear: MonthlyData[];
    previousYear: MonthlyData[];
  };
  categoryBreakdown: CategoryBreakdown[];
  averages: {
    monthlyIncome: number;
    monthlyExpense: number;
    savingsRate: number;
  };
  transactionAmounts: TransactionAmount[];
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const months = parseInt(searchParams.get("months") || "12");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Calculate date range
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Get start date for the analysis (including previous year for YoY)
  const startDate = `${currentYear - 1}-01-01`;
  const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${new Date(currentYear, currentMonth, 0).getDate()}`;

  // Fetch all transactions in the range
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select(`
      id,
      type,
      amount,
      date,
      category_id,
      categories(id, name, type)
    `)
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate monthly data
  const monthlyMap = new Map<string, { income: number; expense: number }>();
  const categoryMap = new Map<string, { name: string; type: string; total: number }>();

  // Initialize all months for the last N months
  for (let i = 0; i < months; i++) {
    const date = new Date(currentYear, currentMonth - 1 - i, 1);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(yearMonth, { income: 0, expense: 0 });
  }

  // Also initialize previous year months for YoY comparison
  for (let i = 1; i <= 12; i++) {
    const yearMonth = `${currentYear - 1}-${String(i).padStart(2, "0")}`;
    if (!monthlyMap.has(yearMonth)) {
      monthlyMap.set(yearMonth, { income: 0, expense: 0 });
    }
  }

  // Process transactions
  for (const tx of transactions || []) {
    const yearMonth = tx.date.substring(0, 7);
    const existing = monthlyMap.get(yearMonth) || { income: 0, expense: 0 };

    if (tx.type === "income") {
      existing.income += tx.amount;
    } else {
      existing.expense += tx.amount;
    }
    monthlyMap.set(yearMonth, existing);

    // Category aggregation (only for recent months)
    const txDate = new Date(tx.date);
    const monthsAgo = (currentYear - txDate.getFullYear()) * 12 + (currentMonth - (txDate.getMonth() + 1));
    if (monthsAgo < months) {
      const cat = tx.categories as { id: string; name: string; type: string } | null;
      if (cat) {
        const existing = categoryMap.get(cat.id) || { name: cat.name, type: cat.type, total: 0 };
        existing.total += tx.amount;
        categoryMap.set(cat.id, existing);
      }
    }
  }

  // Convert monthly map to sorted array
  const allMonthlyData: MonthlyData[] = Array.from(monthlyMap.entries())
    .map(([yearMonth, data]) => ({
      yearMonth,
      income: data.income,
      expense: data.expense,
      savings: data.income - data.expense,
    }))
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

  // Separate into current year and previous year for YoY
  const currentYearData = allMonthlyData.filter((d) => d.yearMonth.startsWith(String(currentYear)));
  const previousYearData = allMonthlyData.filter((d) => d.yearMonth.startsWith(String(currentYear - 1)));

  // Get only the last N months for trends
  const monthlyTrends = allMonthlyData
    .filter((d) => {
      const [year, month] = d.yearMonth.split("-").map(Number);
      const monthsAgo = (currentYear - year) * 12 + (currentMonth - month);
      return monthsAgo >= 0 && monthsAgo < months;
    })
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

  // Calculate category breakdown with percentages
  const totalExpense = Array.from(categoryMap.values())
    .filter((c) => c.type === "expense")
    .reduce((sum, c) => sum + c.total, 0);

  const totalIncome = Array.from(categoryMap.values())
    .filter((c) => c.type === "income")
    .reduce((sum, c) => sum + c.total, 0);

  const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([id, data]) => ({
      category_id: id,
      category_name: data.name,
      type: data.type as "income" | "expense",
      total: data.total,
      percentage: data.type === "expense"
        ? (totalExpense > 0 ? (data.total / totalExpense) * 100 : 0)
        : (totalIncome > 0 ? (data.total / totalIncome) * 100 : 0),
    }))
    .sort((a, b) => b.total - a.total);

  // Calculate averages
  const activeMonths = monthlyTrends.filter((m) => m.income > 0 || m.expense > 0).length || 1;
  const totalIncomeSum = monthlyTrends.reduce((sum, m) => sum + m.income, 0);
  const totalExpenseSum = monthlyTrends.reduce((sum, m) => sum + m.expense, 0);

  // Extract transaction amounts for distribution chart (only from recent months)
  const transactionAmounts: TransactionAmount[] = (transactions || [])
    .filter((tx) => {
      const txDate = new Date(tx.date);
      const monthsAgo = (currentYear - txDate.getFullYear()) * 12 + (currentMonth - (txDate.getMonth() + 1));
      return monthsAgo >= 0 && monthsAgo < months;
    })
    .map((tx) => ({
      type: tx.type as "income" | "expense",
      amount: tx.amount,
    }));

  const response: AnalyticsResponse = {
    monthlyTrends,
    yearOverYear: {
      currentYear: currentYearData,
      previousYear: previousYearData,
    },
    categoryBreakdown,
    averages: {
      monthlyIncome: totalIncomeSum / activeMonths,
      monthlyExpense: totalExpenseSum / activeMonths,
      savingsRate: totalIncomeSum > 0
        ? ((totalIncomeSum - totalExpenseSum) / totalIncomeSum) * 100
        : 0,
    },
    transactionAmounts,
  };

  return NextResponse.json({ data: response });
}
