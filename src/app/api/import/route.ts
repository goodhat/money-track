import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { TransactionType } from "@/types/database";

interface ImportRow {
  date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note?: string;
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
  const { transactions } = body as { transactions: ImportRow[] };

  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json(
      { error: "transactions array is required" },
      { status: 400 }
    );
  }

  // Get user's categories
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, name, type")
    .eq("user_id", user.id);

  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 });
  }

  // Create category name to ID map
  const categoryMap = new Map<string, { id: string; type: string }>();
  for (const cat of categories || []) {
    categoryMap.set(cat.name.toLowerCase(), { id: cat.id, type: cat.type });
  }

  // Process transactions
  const errors: string[] = [];
  const toInsert: Array<{
    user_id: string;
    category_id: string;
    type: TransactionType;
    amount: number;
    date: string;
    note: string | null;
  }> = [];

  for (let i = 0; i < transactions.length; i++) {
    const row = transactions[i];
    const rowNum = i + 1;

    // Validate date
    if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      errors.push(`Row ${rowNum}: Invalid date format. Use YYYY-MM-DD.`);
      continue;
    }

    // Validate type
    if (!row.type || !["income", "expense"].includes(row.type)) {
      errors.push(`Row ${rowNum}: Type must be 'income' or 'expense'.`);
      continue;
    }

    // Validate amount
    if (!row.amount || row.amount <= 0) {
      errors.push(`Row ${rowNum}: Amount must be a positive number.`);
      continue;
    }

    // Find matching category
    const categoryKey = row.category?.toLowerCase();
    const category = categoryMap.get(categoryKey || "");

    if (!category) {
      errors.push(`Row ${rowNum}: Category '${row.category}' not found.`);
      continue;
    }

    if (category.type !== row.type) {
      errors.push(`Row ${rowNum}: Category '${row.category}' is not a ${row.type} category.`);
      continue;
    }

    toInsert.push({
      user_id: user.id,
      category_id: category.id,
      type: row.type,
      amount: row.amount,
      date: row.date,
      note: row.note || null,
    });
  }

  // Insert valid transactions
  let inserted = 0;
  if (toInsert.length > 0) {
    const { error: insertError, count } = await supabase
      .from("transactions")
      .insert(toInsert);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    inserted = count || toInsert.length;
  }

  return NextResponse.json({
    data: {
      total: transactions.length,
      imported: inserted,
      errors: errors.length,
      errorDetails: errors.slice(0, 10), // Return first 10 errors
    },
  });
}
