"use client";

import { useMemo } from "react";
import { Lightbulb, TrendingUp, TrendingDown, AlertCircle, Award, Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCurrency } from "@/hooks";

interface MonthlyData {
  yearMonth: string;
  income: number;
  expense: number;
  savings: number;
}

interface CategoryBreakdown {
  category_name: string;
  type: "income" | "expense";
  total: number;
  percentage: number;
}

interface SpendingTipsProps {
  monthlyTrends: MonthlyData[];
  categoryBreakdown: CategoryBreakdown[];
  averages: {
    monthlyIncome: number;
    monthlyExpense: number;
    savingsRate: number;
  };
}

interface Tip {
  icon: React.ReactNode;
  title: string;
  description: string;
  type: "success" | "warning" | "info" | "achievement";
}

export function SpendingTips({ monthlyTrends, categoryBreakdown, averages }: SpendingTipsProps) {
  const { format } = useCurrency();

  const tips = useMemo(() => {
    const result: Tip[] = [];

    if (monthlyTrends.length < 2) {
      result.push({
        icon: <Lightbulb className="h-5 w-5 text-blue-500" />,
        title: "繼續記錄",
        description: "持續記錄交易，系統會根據您的消費習慣提供個人化建議。",
        type: "info",
      });
      return result;
    }

    const recentMonths = monthlyTrends.slice(-3);
    const latestMonth = recentMonths[recentMonths.length - 1];
    const prevMonth = recentMonths.length > 1 ? recentMonths[recentMonths.length - 2] : null;

    // Savings rate analysis
    if (averages.savingsRate >= 20) {
      result.push({
        icon: <Award className="h-5 w-5 text-green-500" />,
        title: "優秀的儲蓄習慣！",
        description: `您的平均儲蓄率達 ${averages.savingsRate.toFixed(1)}%，超過建議的 20% 目標。繼續保持！`,
        type: "achievement",
      });
    } else if (averages.savingsRate >= 10) {
      result.push({
        icon: <Target className="h-5 w-5 text-blue-500" />,
        title: "儲蓄率良好",
        description: `目前儲蓄率為 ${averages.savingsRate.toFixed(1)}%，建議目標為 20%。每月再多存 ${format((averages.monthlyIncome * 0.2) - (averages.monthlyIncome - averages.monthlyExpense))} 即可達標。`,
        type: "info",
      });
    } else if (averages.savingsRate > 0) {
      result.push({
        icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
        title: "提升儲蓄空間",
        description: `儲蓄率為 ${averages.savingsRate.toFixed(1)}%，建議至少維持 10%。檢視非必要支出可幫助提升儲蓄。`,
        type: "warning",
      });
    } else {
      result.push({
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
        title: "支出超過收入",
        description: "本期支出超過收入，建議檢視開銷並設定預算限制。",
        type: "warning",
      });
    }

    // Month-over-month comparison
    if (prevMonth && latestMonth) {
      const expenseChange = prevMonth.expense > 0
        ? ((latestMonth.expense - prevMonth.expense) / prevMonth.expense) * 100
        : 0;

      if (expenseChange < -10) {
        result.push({
          icon: <TrendingDown className="h-5 w-5 text-green-500" />,
          title: "支出下降",
          description: `相比上月，支出減少了 ${Math.abs(expenseChange).toFixed(0)}%，節省 ${format(prevMonth.expense - latestMonth.expense)}。`,
          type: "success",
        });
      } else if (expenseChange > 20) {
        result.push({
          icon: <TrendingUp className="h-5 w-5 text-red-500" />,
          title: "支出增加提醒",
          description: `本月支出比上月增加 ${expenseChange.toFixed(0)}%，多支出 ${format(latestMonth.expense - prevMonth.expense)}。`,
          type: "warning",
        });
      }
    }

    // Top spending category analysis
    const expenseCategories = categoryBreakdown.filter(c => c.type === "expense");
    if (expenseCategories.length > 0) {
      const topCategory = expenseCategories[0];
      if (topCategory.percentage > 40) {
        result.push({
          icon: <Lightbulb className="h-5 w-5 text-amber-500" />,
          title: `${topCategory.category_name} 佔比過高`,
          description: `「${topCategory.category_name}」佔支出的 ${topCategory.percentage.toFixed(0)}%（${format(topCategory.total)}），建議檢視是否可以優化。`,
          type: "info",
        });
      }
    }

    // Consistency check - spending stability
    if (monthlyTrends.length >= 3) {
      const expenses = monthlyTrends.slice(-3).map(m => m.expense);
      const avgExpense = expenses.reduce((a, b) => a + b, 0) / expenses.length;
      const variance = expenses.reduce((sum, e) => sum + Math.pow(e - avgExpense, 2), 0) / expenses.length;
      const stdDev = Math.sqrt(variance);
      const cv = avgExpense > 0 ? (stdDev / avgExpense) * 100 : 0;

      if (cv < 15) {
        result.push({
          icon: <Award className="h-5 w-5 text-green-500" />,
          title: "支出穩定",
          description: "近三個月支出變動在 15% 以內，您的預算控制做得很好！",
          type: "achievement",
        });
      }
    }

    return result.slice(0, 4); // Limit to 4 tips
  }, [monthlyTrends, categoryBreakdown, averages, format]);

  if (tips.length === 0) return null;

  const getBorderColor = (type: Tip["type"]) => {
    switch (type) {
      case "success":
      case "achievement":
        return "border-l-green-500";
      case "warning":
        return "border-l-amber-500";
      default:
        return "border-l-blue-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          智慧洞察
        </CardTitle>
        <CardDescription>根據您的消費數據提供的個人化建議</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tips.map((tip, index) => (
            <div
              key={index}
              className={`flex gap-3 p-3 bg-muted/50 rounded-lg border-l-4 ${getBorderColor(tip.type)}`}
            >
              <div className="shrink-0 mt-0.5">{tip.icon}</div>
              <div>
                <p className="font-medium text-sm">{tip.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
