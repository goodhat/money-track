import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { Transaction, Category } from "@/types/database";

const DEFAULT_PAGE_SIZE = 20;

interface TransactionWithCategory extends Omit<Transaction, 'category_id'> {
  category_id: string;
  category: Pick<Category, "id" | "name" | "type"> | null;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // format: YYYY-MM
  const limit = Math.min(parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE)), 100);
  const cursor = searchParams.get("cursor"); // format: date|id

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query = supabase
    .from("transactions")
    .select(`
      *,
      category:categories(id, name, type)
    `)
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit + 1); // Fetch one extra to check if there are more

  if (month) {
    const startDate = `${month}-01`;
    const [year, monthNum] = month.split("-").map(Number);
    const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
    const nextYear = monthNum === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    query = query.gte("date", startDate).lt("date", endDate);
  }

  // Apply cursor-based pagination
  if (cursor) {
    const [cursorDate] = cursor.split("|");
    // We need transactions that are "before" this cursor in our sort order
    // Since we sort by date DESC, created_at DESC, we need items where:
    // date < cursorDate OR (date = cursorDate AND created_at < cursorCreatedAt)
    // Supabase doesn't support OR in filters easily, so we use a workaround:
    // Get items with date <= cursorDate, then filter out the cursor item and items "after" it
    query = query.lte("date", cursorDate);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let filteredData = (data || []) as TransactionWithCategory[];

  // If we have a cursor, filter out items that should come before the cursor
  if (cursor && filteredData.length > 0) {
    const [cursorDate, cursorId] = cursor.split("|");
    const cursorIndex = filteredData.findIndex(
      (item) => item.date === cursorDate && item.id === cursorId
    );
    if (cursorIndex !== -1) {
      // Remove the cursor item and everything before it
      filteredData = filteredData.slice(cursorIndex + 1);
    } else {
      // Cursor item not found in results, filter by date comparison
      filteredData = filteredData.filter((item) => item.date < cursorDate);
    }
  }

  // Check if there are more items
  const hasMore = filteredData.length > limit;
  const items = hasMore ? filteredData.slice(0, limit) : filteredData;

  // Generate next cursor from the last item
  const nextCursor = hasMore && items.length > 0
    ? `${items[items.length - 1].date}|${items[items.length - 1].id}`
    : null;

  return NextResponse.json({
    data: items,
    pagination: {
      hasMore,
      nextCursor,
      limit,
    },
  });
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
  const { category_id, type, amount, date, note } = body;

  if (!category_id || !type || !amount || !date) {
    return NextResponse.json(
      { error: "category_id, type, amount, and date are required" },
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

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      category_id,
      type,
      amount,
      date,
      note: note || null,
    })
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
