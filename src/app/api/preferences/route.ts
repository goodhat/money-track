import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { UserPreferences, WidgetType } from "@/types/database";

const DEFAULT_WIDGETS: WidgetType[] = ["budget", "summary", "chart", "category", "transactions", "streaks"];
const VALID_WIDGETS: WidgetType[] = ["budget", "summary", "chart", "category", "transactions", "streaks"];

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single() as unknown as { data: UserPreferences | null };

  if (!preferences) {
    // Return defaults if no preferences exist
    return NextResponse.json({
      data: {
        dashboard_widgets: DEFAULT_WIDGETS,
        theme: "system",
      },
    });
  }

  return NextResponse.json({ data: preferences });
}

export async function PUT(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { dashboard_widgets, theme } = body as {
    dashboard_widgets?: WidgetType[];
    theme?: "light" | "dark" | "system";
  };

  // Validate widgets
  if (dashboard_widgets) {
    const invalidWidgets = dashboard_widgets.filter((w) => !VALID_WIDGETS.includes(w));
    if (invalidWidgets.length > 0) {
      return NextResponse.json(
        { error: `Invalid widgets: ${invalidWidgets.join(", ")}` },
        { status: 400 }
      );
    }
  }

  // Validate theme
  if (theme && !["light", "dark", "system"].includes(theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  // Check if preferences exist
  const { data: existing } = await supabase
    .from("user_preferences")
    .select("id")
    .eq("user_id", user.id)
    .single();

  let result;

  if (existing) {
    // Update existing preferences
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (dashboard_widgets) updateData.dashboard_widgets = dashboard_widgets;
    if (theme) updateData.theme = theme;

    result = await supabase
      .from("user_preferences")
      .update(updateData)
      .eq("user_id", user.id)
      .select()
      .single();
  } else {
    // Create new preferences
    result = await supabase
      .from("user_preferences")
      .insert({
        user_id: user.id,
        dashboard_widgets: dashboard_widgets || DEFAULT_WIDGETS,
        theme: theme || "system",
      })
      .select()
      .single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ data: result.data });
}
