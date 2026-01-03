import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", user.id)
    .eq("year_month", year_month)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || null });
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
  const { amount } = body;

  if (amount === undefined || amount < 0) {
    return NextResponse.json(
      { error: "Amount must be a non-negative number" },
      { status: 400 }
    );
  }

  // Upsert - insert or update
  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      {
        user_id: user.id,
        year_month,
        amount,
      },
      {
        onConflict: "user_id,year_month",
      }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
