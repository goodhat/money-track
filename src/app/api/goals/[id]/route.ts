import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SavingsGoal, GoalContribution } from "@/types/database";

export async function GET(
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

  // Get goal with contributions
  const [goalResult, contributionsResult] = await Promise.all([
    supabase
      .from("savings_goals")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single<SavingsGoal>(),
    supabase
      .from("goal_contributions")
      .select("*")
      .eq("goal_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<GoalContribution[]>(),
  ]);

  if (goalResult.error) {
    return NextResponse.json({ error: goalResult.error.message }, { status: 500 });
  }

  if (!goalResult.data) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      ...goalResult.data,
      contributions: contributionsResult.data || [],
    },
  });
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
  const { name, target_amount, target_date, color, icon, is_completed } = body;

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updateData.name = name;
  if (target_amount !== undefined) {
    if (target_amount <= 0) {
      return NextResponse.json({ error: "target_amount must be positive" }, { status: 400 });
    }
    updateData.target_amount = target_amount;
  }
  if (target_date !== undefined) updateData.target_date = target_date || null;
  if (color !== undefined) updateData.color = color;
  if (icon !== undefined) updateData.icon = icon;
  if (is_completed !== undefined) {
    updateData.is_completed = is_completed;
    updateData.completed_at = is_completed ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from("savings_goals")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single<SavingsGoal>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
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
    .from("savings_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// POST to add/withdraw from goal
export async function POST(
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
  const { amount, note } = body;

  if (amount === undefined || amount === 0) {
    return NextResponse.json({ error: "amount is required and cannot be zero" }, { status: 400 });
  }

  // Get current goal
  const { data: goal, error: goalError } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single<SavingsGoal>();

  if (goalError || !goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const newAmount = goal.current_amount + amount;

  // Prevent negative balance
  if (newAmount < 0) {
    return NextResponse.json({ error: "Cannot withdraw more than current amount" }, { status: 400 });
  }

  // Add contribution record
  const { error: contributionError } = await supabase
    .from("goal_contributions")
    .insert({
      goal_id: id,
      user_id: user.id,
      amount,
      note: note || null,
    });

  if (contributionError) {
    return NextResponse.json({ error: contributionError.message }, { status: 500 });
  }

  // Update goal current_amount
  const isCompleted = newAmount >= goal.target_amount;
  const updateData: Record<string, unknown> = {
    current_amount: newAmount,
    updated_at: new Date().toISOString(),
  };

  if (isCompleted && !goal.is_completed) {
    updateData.is_completed = true;
    updateData.completed_at = new Date().toISOString();
  }

  const { data: updatedGoal, error: updateError } = await supabase
    .from("savings_goals")
    .update(updateData)
    .eq("id", id)
    .select()
    .single<SavingsGoal>();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    data: updatedGoal,
    message: amount > 0 ? "已存入" : "已提取",
    is_newly_completed: isCompleted && !goal.is_completed,
  });
}
