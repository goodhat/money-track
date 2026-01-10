"use client";

import { useState, useEffect } from "react";
import { Flame, Target, PiggyBank, Trophy, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCurrency } from "@/hooks";

interface StreakData {
  current: number;
  longest: number;
  active_today: boolean;
  last_activity: string | null;
  budget?: number;
  spent?: number;
  income?: number;
  expense?: number;
}

interface StreaksResponse {
  daily_logging: StreakData;
  under_budget: StreakData;
  savings_goal: StreakData;
}

export function SpendingStreaks() {
  const [streaks, setStreaks] = useState<StreaksResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { format } = useCurrency();

  useEffect(() => {
    fetchStreaks();
  }, []);

  const fetchStreaks = async () => {
    try {
      const res = await fetch("/api/streaks");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setStreaks(json.data);
    } catch (err) {
      console.error("Failed to fetch streaks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStreak = async (streakType: string) => {
    try {
      const res = await fetch("/api/streaks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streak_type: streakType }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      fetchStreaks();
      toast.success("連續紀錄已更新！");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新失敗");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            習慣追蹤
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!streaks) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          習慣追蹤
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Daily Logging Streak */}
        <StreakCard
          icon={<Target className="h-5 w-5 text-blue-500" />}
          title="每日記帳"
          description="連續記帳天數"
          current={streaks.daily_logging.current}
          longest={streaks.daily_logging.longest}
          activeToday={streaks.daily_logging.active_today}
          onCheck={() => updateStreak("daily_logging")}
        />

        {/* Under Budget Streak */}
        <StreakCard
          icon={<PiggyBank className="h-5 w-5 text-green-500" />}
          title="預算達標"
          description={
            streaks.under_budget.budget
              ? `本月支出 ${format(streaks.under_budget.spent || 0)} / ${format(streaks.under_budget.budget)}`
              : "設定預算以開始追蹤"
          }
          current={streaks.under_budget.current}
          longest={streaks.under_budget.longest}
          activeToday={streaks.under_budget.active_today}
          onCheck={() => updateStreak("under_budget")}
          progress={
            streaks.under_budget.budget
              ? ((streaks.under_budget.spent || 0) / streaks.under_budget.budget) * 100
              : undefined
          }
          disabled={!streaks.under_budget.budget}
        />

        {/* Savings Goal Streak */}
        <StreakCard
          icon={<Trophy className="h-5 w-5 text-yellow-500" />}
          title="儲蓄目標"
          description={`收入 ${format(streaks.savings_goal.income || 0)} - 支出 ${format(streaks.savings_goal.expense || 0)}`}
          current={streaks.savings_goal.current}
          longest={streaks.savings_goal.longest}
          activeToday={streaks.savings_goal.active_today}
          onCheck={() => updateStreak("savings_goal")}
          savingsAmount={(streaks.savings_goal.income || 0) - (streaks.savings_goal.expense || 0)}
        />
      </CardContent>
    </Card>
  );
}

interface StreakCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  current: number;
  longest: number;
  activeToday: boolean;
  onCheck: () => void;
  progress?: number;
  disabled?: boolean;
  savingsAmount?: number;
}

function StreakCard({
  icon,
  title,
  description,
  current,
  longest,
  activeToday,
  onCheck,
  progress,
  disabled,
  savingsAmount,
}: StreakCardProps) {
  const { format } = useCurrency();

  return (
    <div className={`p-4 rounded-lg border ${activeToday ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-muted/30"}`}>
      <div className="flex items-start gap-3">
        <div className="mt-1">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{title}</h4>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Flame className={`h-4 w-4 ${current > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
                  <span className="font-bold text-lg">{current}</span>
                  <span className="text-sm text-muted-foreground">天</span>
                </div>
                {longest > 0 && longest > current && (
                  <div className="text-xs text-muted-foreground">
                    最長 {longest} 天
                  </div>
                )}
              </div>
              {!disabled && (
                <Button
                  variant={activeToday ? "ghost" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={onCheck}
                  disabled={activeToday}
                >
                  {activeToday ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>

          {progress !== undefined && (
            <div className="mt-2">
              <Progress
                value={Math.min(progress, 100)}
                className="h-2"
                indicatorClassName={progress > 100 ? "bg-red-500" : progress > 80 ? "bg-yellow-500" : "bg-green-500"}
              />
            </div>
          )}

          {savingsAmount !== undefined && (
            <div className={`mt-2 text-sm font-medium ${savingsAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
              {savingsAmount >= 0 ? "+" : ""}{format(savingsAmount)} 本月結餘
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
