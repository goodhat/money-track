import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { TransactionTemplate, Category, RecurrenceFrequency } from "@/types/database";

interface TemplateWithCategory extends Omit<TransactionTemplate, "category_id"> {
  category_id: string;
  category: Pick<Category, "id" | "name" | "type"> | null;
}

function calculateNextOccurrence(
  frequency: RecurrenceFrequency,
  day: number | null,
  fromDate: Date = new Date()
): string {
  const next = new Date(fromDate);
  next.setHours(0, 0, 0, 0);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      if (day) {
        const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(day, maxDay));
      }
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      if (day) {
        next.setDate(Math.min(day, 28));
      }
      break;
  }

  return next.toISOString().split("T")[0];
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("transaction_templates")
    .select(`
      *,
      category:categories(id, name, type)
    `)
    .eq("user_id", user.id)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data as TemplateWithCategory[] });
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
  const {
    name,
    category_id,
    type,
    amount,
    note,
    is_recurring,
    recurrence_frequency,
    recurrence_day,
  } = body;

  if (!name || !category_id || !type || !amount) {
    return NextResponse.json(
      { error: "name, category_id, type, and amount are required" },
      { status: 400 }
    );
  }

  if (!["income", "expense"].includes(type)) {
    return NextResponse.json(
      { error: "Type must be 'income' or 'expense'" },
      { status: 400 }
    );
  }

  if (amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be positive" },
      { status: 400 }
    );
  }

  const validFrequencies = ["daily", "weekly", "biweekly", "monthly", "yearly"];
  if (is_recurring && (!recurrence_frequency || !validFrequencies.includes(recurrence_frequency))) {
    return NextResponse.json(
      { error: "Valid recurrence_frequency is required for recurring templates" },
      { status: 400 }
    );
  }

  const insertData = {
    user_id: user.id,
    name: name as string,
    category_id: category_id as string,
    type: type as "income" | "expense",
    amount: amount as number,
    note: (note as string) || null,
    is_recurring: (is_recurring as boolean) || false,
    is_active: true,
    recurrence_frequency: is_recurring ? (recurrence_frequency as RecurrenceFrequency) : null,
    recurrence_day: is_recurring ? (recurrence_day as number | null) || null : null,
    next_occurrence: is_recurring
      ? calculateNextOccurrence(
          recurrence_frequency as RecurrenceFrequency,
          (recurrence_day as number | null) || null
        )
      : null,
  };

  const { data, error } = await supabase
    .from("transaction_templates")
    .insert(insertData)
    .select(`
      *,
      category:categories(id, name, type)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
