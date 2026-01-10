import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { RecurrenceFrequency, TransactionTemplate, Transaction } from "@/types/database";

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

// GET: Fetch all due recurring transactions for the current user
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Get all recurring templates that are due
  const { data, error } = await supabase
    .from("transaction_templates")
    .select(`
      *,
      category:categories(id, name, type)
    `)
    .eq("user_id", user.id)
    .eq("is_recurring", true)
    .eq("is_active", true)
    .lte("next_occurrence", today)
    .order("next_occurrence");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, due_count: data?.length || 0 });
}

// POST: Apply all due recurring transactions
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Get all recurring templates that are due
  const { data: dueTemplates, error: fetchError } = await supabase
    .from("transaction_templates")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_recurring", true)
    .eq("is_active", true)
    .lte("next_occurrence", today)
    .returns<TransactionTemplate[]>();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!dueTemplates || dueTemplates.length === 0) {
    return NextResponse.json({
      message: "No recurring transactions due",
      applied: 0,
    });
  }

  const results = {
    applied: 0,
    failed: 0,
    transactions: [] as { id: string; template_name: string; amount: number }[],
  };

  // Process each due template
  for (const template of dueTemplates) {
    // Skip templates without a valid next_occurrence date
    if (!template.next_occurrence) {
      results.failed++;
      continue;
    }

    try {
      // Create the transaction
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          category_id: template.category_id,
          type: template.type,
          amount: template.amount,
          date: template.next_occurrence,
          note: template.note ? `${template.note} (自動記錄)` : "自動記錄",
        })
        .select()
        .single<Transaction>();

      if (transactionError || !transaction) {
        results.failed++;
        continue;
      }

      // Log the recurring transaction
      await supabase.from("recurring_transaction_log").insert({
        template_id: template.id,
        transaction_id: transaction.id,
        user_id: user.id,
        scheduled_date: template.next_occurrence!,
      });

      // Calculate and update the next occurrence
      const nextOccurrence = calculateNextOccurrence(
        template.recurrence_frequency as RecurrenceFrequency,
        template.recurrence_day,
        new Date(template.next_occurrence)
      );

      await supabase
        .from("transaction_templates")
        .update({
          next_occurrence: nextOccurrence,
          last_applied: template.next_occurrence,
        })
        .eq("id", template.id);

      results.applied++;
      results.transactions.push({
        id: transaction.id,
        template_name: template.name,
        amount: template.amount,
      });
    } catch {
      results.failed++;
    }
  }

  return NextResponse.json({
    message: `Applied ${results.applied} recurring transactions`,
    ...results,
  });
}
