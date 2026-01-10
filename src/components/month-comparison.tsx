"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useCurrency } from "@/hooks";

interface MonthData {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  budget: number | null;
  expenseByCategory: Record<string, number>;
}

function generateMonthOptions(count: number = 12) {
  const options = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
    options.push({ value, label });
  }
  return options;
}

export function MonthComparison() {
  const { format } = useCurrency();
  const monthOptions = useMemo(() => generateMonthOptions(12), []);

  // Default to current month and previous month
  const [month1, setMonth1] = useState(monthOptions[1]?.value || "");
  const [month2, setMonth2] = useState(monthOptions[0]?.value || "");
  const [data1, setData1] = useState<MonthData | null>(null);
  const [data2, setData2] = useState<MonthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBoth = async () => {
      setIsLoading(true);
      try {
        const [res1, res2] = await Promise.all([
          fetch(`/api/dashboard?month=${month1}`),
          fetch(`/api/dashboard?month=${month2}`),
        ]);
        const [json1, json2] = await Promise.all([res1.json(), res2.json()]);
        setData1(json1.data);
        setData2(json2.data);
      } catch (err) {
        console.error("Failed to fetch comparison data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (month1 && month2) {
      fetchBoth();
    }
  }, [month1, month2]);

  // Calculate changes
  const changes = useMemo(() => {
    if (!data1 || !data2) return null;

    const incomeChange = data1.totalIncome > 0
      ? ((data2.totalIncome - data1.totalIncome) / data1.totalIncome) * 100
      : data2.totalIncome > 0 ? 100 : 0;

    const expenseChange = data1.totalExpense > 0
      ? ((data2.totalExpense - data1.totalExpense) / data1.totalExpense) * 100
      : data2.totalExpense > 0 ? 100 : 0;

    const savingsChange = data2.netIncome - data1.netIncome;

    return { incomeChange, expenseChange, savingsChange };
  }, [data1, data2]);

  // Combine all categories from both months
  const allCategories = useMemo(() => {
    if (!data1 || !data2) return [];

    const categories = new Set([
      ...Object.keys(data1.expenseByCategory),
      ...Object.keys(data2.expenseByCategory),
    ]);

    return Array.from(categories)
      .map((name) => ({
        name,
        month1: data1.expenseByCategory[name] || 0,
        month2: data2.expenseByCategory[name] || 0,
      }))
      .sort((a, b) => Math.max(b.month1, b.month2) - Math.max(a.month1, a.month2));
  }, [data1, data2]);

  const maxCategoryAmount = useMemo(() => {
    return Math.max(
      ...allCategories.map((c) => Math.max(c.month1, c.month2)),
      1
    );
  }, [allCategories]);

  const formatChange = (value: number, invert = false) => {
    const isPositive = invert ? value < 0 : value > 0;
    const icon = value === 0 ? (
      <Minus className="h-4 w-4 text-muted-foreground" />
    ) : isPositive ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );

    return (
      <span className={`flex items-center gap-1 ${
        value === 0 ? "text-muted-foreground" : isPositive ? "text-green-600" : "text-red-600"
      }`}>
        {icon}
        {value >= 0 ? "+" : ""}{value.toFixed(1)}%
      </span>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>月份比較</CardTitle>
        <CardDescription>
          <div className="flex items-center gap-2 mt-2">
            <Select value={month1} onValueChange={setMonth1}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} disabled={opt.value === month2}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Select value={month2} onValueChange={setMonth2}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} disabled={opt.value === month1}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data1 && data2 && changes ? (
          <div className="space-y-6">
            {/* Summary comparison */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">收入變化</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{data1.month}</p>
                    <p className="font-medium">{format(data1.totalIncome)}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{data2.month}</p>
                    <p className="font-medium">{format(data2.totalIncome)}</p>
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  {formatChange(changes.incomeChange)}
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">支出變化</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{data1.month}</p>
                    <p className="font-medium">{format(data1.totalExpense)}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{data2.month}</p>
                    <p className="font-medium">{format(data2.totalExpense)}</p>
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  {formatChange(changes.expenseChange, true)}
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">淨收支變化</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{data1.month}</p>
                    <p className={`font-medium ${data1.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {format(data1.netIncome)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{data2.month}</p>
                    <p className={`font-medium ${data2.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {format(data2.netIncome)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <span className={`flex items-center gap-1 ${
                    changes.savingsChange === 0 ? "text-muted-foreground" :
                    changes.savingsChange > 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {changes.savingsChange === 0 ? (
                      <Minus className="h-4 w-4" />
                    ) : changes.savingsChange > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {changes.savingsChange >= 0 ? "+" : ""}{format(changes.savingsChange)}
                  </span>
                </div>
              </div>
            </div>

            {/* Category comparison */}
            {allCategories.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">分類支出比較</h4>
                <div className="space-y-4">
                  {allCategories.slice(0, 6).map((cat) => (
                    <div key={cat.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{cat.name}</span>
                        <div className="flex gap-4 text-muted-foreground">
                          <span className="w-24 text-right">{format(cat.month1)}</span>
                          <span className="w-24 text-right">{format(cat.month2)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Progress
                            value={(cat.month1 / maxCategoryAmount) * 100}
                            className="h-2 [&>div]:bg-blue-400"
                          />
                        </div>
                        <div className="flex-1">
                          <Progress
                            value={(cat.month2 / maxCategoryAmount) * 100}
                            className="h-2 [&>div]:bg-purple-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-6 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-400 rounded" />
                    {data1.month}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-purple-400 rounded" />
                    {data2.month}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            選擇兩個月份以進行比較
          </p>
        )}
      </CardContent>
    </Card>
  );
}
