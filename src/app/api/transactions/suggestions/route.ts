import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("category_id");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Build the query for note suggestions
  let query = supabase
    .from("transactions")
    .select("note")
    .eq("user_id", user.id)
    .not("note", "is", null)
    .not("note", "eq", "");

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data: transactions, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate notes and count occurrences
  const noteCountMap = new Map<string, number>();
  for (const tx of transactions || []) {
    if (tx.note) {
      const count = noteCountMap.get(tx.note) || 0;
      noteCountMap.set(tx.note, count + 1);
    }
  }

  // Convert to array and sort by frequency
  const suggestions = Array.from(noteCountMap.entries())
    .map(([note, count]) => ({ note, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Limit to top 20 suggestions

  return NextResponse.json({ data: suggestions });
}
