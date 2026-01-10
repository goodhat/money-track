import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { RecurrenceFrequency } from "@/types/database";

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    is_active,
  } = body;

  if (type && !["income", "expense"].includes(type)) {
    return NextResponse.json(
      { error: "Type must be 'income' or 'expense'" },
      { status: 400 }
    );
  }

  if (amount !== undefined && amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be positive" },
      { status: 400 }
    );
  }

  const validFrequencies = ["daily", "weekly", "biweekly", "monthly", "yearly"];
  if (is_recurring && recurrence_frequency && !validFrequencies.includes(recurrence_frequency)) {
    return NextResponse.json(
      { error: "Invalid recurrence frequency" },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (category_id !== undefined) updateData.category_id = category_id;
  if (type !== undefined) updateData.type = type;
  if (amount !== undefined) updateData.amount = amount;
  if (note !== undefined) updateData.note = note || null;
  if (is_recurring !== undefined) updateData.is_recurring = is_recurring;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (recurrence_frequency !== undefined) updateData.recurrence_frequency = recurrence_frequency || null;
  if (recurrence_day !== undefined) updateData.recurrence_day = recurrence_day || null;

  // Recalculate next_occurrence when recurrence settings change
  if (is_recurring && recurrence_frequency) {
    updateData.next_occurrence = calculateNextOccurrence(
      recurrence_frequency as RecurrenceFrequency,
      recurrence_day || null
    );
  } else if (is_recurring === false) {
    updateData.next_occurrence = null;
    updateData.recurrence_frequency = null;
    updateData.recurrence_day = null;
  }

  const { data, error } = await supabase
    .from("transaction_templates")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(`
      *,
      category:categories(id, name, type)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("transaction_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
