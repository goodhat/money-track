"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TransactionType } from "@/types/database";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { IncomeExpenseChart } from "@/components/charts/income-expense-chart";
import { ExpenseCategoryChart } from "@/components/charts/expense-category-chart";
import { BudgetAlert } from "@/components/budget-alert";
import { SpendingStreaks } from "@/components/spending-streaks";
import { WidgetCustomizer } from "@/components/widget-customizer";
import { usePreferences } from "@/hooks";

interface DashboardData {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  budget: number | null;
  expenseByCategory: Record<string, number>;
  recentTransactions: Array<{
    id: string;
    type: TransactionType;
    amount: number;
    date: string;
    note: string | null;
    category: { id: string; name: string; type: string } | null;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const { isWidgetEnabled } = usePreferences();

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`/api/dashboard?month=${selectedMonth}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json.data);
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchDashboard();
  }, [selectedMonth]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: "TWD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
      options.push({ value, label });
    }
    return options;
  };

  const budgetProgress = data?.budget
    ? Math.min((data.totalExpense / data.budget) * 100, 100)
    : 0;

  const budgetStatus = () => {
    if (!data?.budget) return "neutral";
    const ratio = data.totalExpense / data.budget;
    if (ratio >= 1) return "danger";
    if (ratio >= 0.8) return "warning";
    return "safe";
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <BudgetAlert />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Label>月份：</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {generateMonthOptions().map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <WidgetCustomizer />
        </div>
      </div>

      {/* Budget Progress */}
      {isWidgetEnabled("budget") && (
        <Card>
          <CardHeader>
            <CardTitle>預算使用狀況</CardTitle>
            <CardDescription>
              {data?.budget
                ? `本月預算：${formatCurrency(data.budget)}`
                : "尚未設定預算"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.budget ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>已支出：{formatCurrency(data.totalExpense)}</span>
                  <span>剩餘：{formatCurrency(Math.max(data.budget - data.totalExpense, 0))}</span>
                </div>
                <Progress
                  value={budgetProgress}
                  className={
                    budgetStatus() === "danger"
                      ? "[&>div]:bg-red-500"
                      : budgetStatus() === "warning"
                      ? "[&>div]:bg-yellow-500"
                      : "[&>div]:bg-green-500"
                  }
                />
                <p className="text-sm text-muted-foreground text-center">
                  {budgetProgress.toFixed(0)}% 已使用
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                <Link href="/settings" className="text-primary hover:underline">
                  點此設定預算
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {isWidgetEnabled("summary") && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                本月收入
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(data?.totalIncome || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                本月支出
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(data?.totalExpense || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                淨收支
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${
                  (data?.netIncome || 0) >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {(data?.netIncome || 0) >= 0 ? "+" : ""}
                {formatCurrency(data?.netIncome || 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Income vs Expense Chart */}
      {isWidgetEnabled("chart") && (
        <Card>
          <CardHeader>
            <CardTitle>收支概覽</CardTitle>
            <CardDescription>本月收入、支出與預算比較</CardDescription>
          </CardHeader>
          <CardContent>
            <IncomeExpenseChart
              totalIncome={data?.totalIncome || 0}
              totalExpense={data?.totalExpense || 0}
              budget={data?.budget || null}
            />
          </CardContent>
        </Card>
      )}

      {/* Expense by Category */}
      {isWidgetEnabled("category") && data?.expenseByCategory && Object.keys(data.expenseByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>各分類支出</CardTitle>
            <CardDescription>支出分類分佈圖</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Pie Chart */}
              <ExpenseCategoryChart data={data.expenseByCategory} />

              {/* Detailed List */}
              <div className="space-y-3">
                {Object.entries(data.expenseByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm">{category}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${(amount / data.totalExpense) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-24 text-right">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-column layout for Recent Transactions and Spending Streaks */}
      {(isWidgetEnabled("transactions") || isWidgetEnabled("streaks")) && (
        <div className={`grid gap-6 ${isWidgetEnabled("transactions") && isWidgetEnabled("streaks") ? "lg:grid-cols-2" : ""}`}>
          {/* Recent Transactions */}
          {isWidgetEnabled("transactions") && (
            <Card>
              <CardHeader>
                <CardTitle>最近交易</CardTitle>
                <CardDescription>
                  <Link href="/transactions" className="text-primary hover:underline">
                    查看全部
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data?.recentTransactions && data.recentTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {data.recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={tx.type === "income" ? "default" : "secondary"}>
                              {tx.category?.name || "未分類"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{tx.date}</span>
                          </div>
                          {tx.note && (
                            <p className="text-sm text-muted-foreground mt-1">{tx.note}</p>
                          )}
                        </div>
                        <span
                          className={`font-medium ${
                            tx.type === "income" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">本月尚無交易紀錄</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Spending Streaks */}
          {isWidgetEnabled("streaks") && <SpendingStreaks />}
        </div>
      )}
    </div>
  );
}
