import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SavingsGoal } from "@/types/database";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("is_completed")
    .order("target_date", { nullsFirst: false })
    .order("created_at", { ascending: false })
    .returns<SavingsGoal[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
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
  const { name, target_amount, target_date, color, icon } = body;

  if (!name || !target_amount) {
    return NextResponse.json(
      { error: "name and target_amount are required" },
      { status: 400 }
    );
  }

  if (target_amount <= 0) {
    return NextResponse.json(
      { error: "target_amount must be positive" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("savings_goals")
    .insert({
      user_id: user.id,
      name,
      target_amount,
      target_date: target_date || null,
      color: color || "#3b82f6",
      icon: icon || "piggy-bank",
    })
    .select()
    .single<SavingsGoal>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
