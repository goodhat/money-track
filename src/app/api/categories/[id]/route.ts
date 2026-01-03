import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { TransactionType } from "@/types/database";

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
  const { name, type } = body;

  if (!name && !type) {
    return NextResponse.json(
      { error: "At least name or type is required" },
      { status: 400 }
    );
  }

  if (type && !["income", "expense"].includes(type)) {
    return NextResponse.json(
      { error: "Type must be 'income' or 'expense'" },
      { status: 400 }
    );
  }

  const updateData: { name?: string; type?: TransactionType } = {};
  if (name) updateData.name = name;
  if (type) updateData.type = type as TransactionType;

  const { data, error } = await supabase
    .from("categories")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
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

  // Check if category has transactions
  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: "無法刪除：此分類下還有交易紀錄" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
