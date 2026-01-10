"use client";

import { useState, useEffect, useCallback } from "react";
import { WidgetType } from "@/types/database";

interface Preferences {
  dashboard_widgets: WidgetType[];
  theme: "light" | "dark" | "system";
}

const DEFAULT_PREFERENCES: Preferences = {
  dashboard_widgets: ["budget", "summary", "chart", "category", "transactions", "streaks"],
  theme: "system",
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/preferences");
      const json = await res.json();
      if (!json.error && json.data) {
        setPreferences({
          dashboard_widgets: json.data.dashboard_widgets || DEFAULT_PREFERENCES.dashboard_widgets,
          theme: json.data.theme || DEFAULT_PREFERENCES.theme,
        });
      }
    } catch (err) {
      console.error("Failed to fetch preferences:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updateWidgets = async (widgets: WidgetType[]): Promise<boolean> => {
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboard_widgets: widgets }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setPreferences((prev) => ({ ...prev, dashboard_widgets: widgets }));
      return true;
    } catch (err) {
      console.error("Failed to update widgets:", err);
      return false;
    }
  };

  const toggleWidget = async (widget: WidgetType): Promise<boolean> => {
    const currentWidgets = preferences.dashboard_widgets;
    const newWidgets = currentWidgets.includes(widget)
      ? currentWidgets.filter((w) => w !== widget)
      : [...currentWidgets, widget];

    return updateWidgets(newWidgets);
  };

  const reorderWidgets = async (fromIndex: number, toIndex: number): Promise<boolean> => {
    const newWidgets = [...preferences.dashboard_widgets];
    const [removed] = newWidgets.splice(fromIndex, 1);
    newWidgets.splice(toIndex, 0, removed);

    return updateWidgets(newWidgets);
  };

  const isWidgetEnabled = (widget: WidgetType): boolean => {
    return preferences.dashboard_widgets.includes(widget);
  };

  return {
    preferences,
    isLoading,
    updateWidgets,
    toggleWidget,
    reorderWidgets,
    isWidgetEnabled,
    refetch: fetchPreferences,
  };
}
