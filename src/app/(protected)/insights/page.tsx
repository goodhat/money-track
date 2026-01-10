"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight, AlertTriangle, Target } from "lucide-react";
import { MonthComparison } from "@/components/month-comparison";
import { AmountDistributionChart } from "@/components/charts/amount-distribution-chart";
import { SpendingTips } from "@/components/spending-tips";
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
import { useCurrency } from "@/hooks";

interface MonthlyData {
  yearMonth: string;
  income: number;
  expense: number;
  savings: number;
}

interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  type: "income" | "expense";
  total: number;
  percentage: number;
}

interface TransactionAmount {
  type: "income" | "expense";
  amount: number;
}

interface AnalyticsData {
  monthlyTrends: MonthlyData[];
  yearOverYear: {
    currentYear: MonthlyData[];
    previousYear: MonthlyData[];
  };
  categoryBreakdown: CategoryBreakdown[];
  averages: {
    monthlyIncome: number;
    monthlyExpense: number;
    savingsRate: number;
  };
  transactionAmounts: TransactionAmount[];
}

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export default function InsightsPage() {
  const { format } = useCurrency();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("12");

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/analytics?months=${period}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setData(json.data);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [period]);

  // Transform data for charts
  const trendChartData = useMemo(() => {
    if (!data) return [];
    return data.monthlyTrends.map((m) => ({
      month: m.yearMonth.substring(5), // MM format
      fullMonth: m.yearMonth,
      收入: m.income,
      支出: m.expense,
      淨儲蓄: m.savings,
    }));
  }, [data]);

  const yoyChartData = useMemo(() => {
    if (!data) return [];
    const currentYear = new Date().getFullYear();
    const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

    return months.map((month) => {
      const currentData = data.yearOverYear.currentYear.find((d) => d.yearMonth.endsWith(month));
      const prevData = data.yearOverYear.previousYear.find((d) => d.yearMonth.endsWith(month));
      return {
        month,
        [`${currentYear}支出`]: currentData?.expense || 0,
        [`${currentYear - 1}支出`]: prevData?.expense || 0,
        [`${currentYear}收入`]: currentData?.income || 0,
        [`${currentYear - 1}收入`]: prevData?.income || 0,
      };
    });
  }, [data]);

  const expensePieData = useMemo(() => {
    if (!data) return [];
    return data.categoryBreakdown
      .filter((c) => c.type === "expense")
      .slice(0, 8)
      .map((c) => ({
        name: c.category_name,
        value: c.total,
        percentage: c.percentage,
      }));
  }, [data]);

  const _incomePieData = useMemo(() => {
    if (!data) return [];
    return data.categoryBreakdown
      .filter((c) => c.type === "income")
      .slice(0, 8)
      .map((c) => ({
        name: c.category_name,
        value: c.total,
        percentage: c.percentage,
      }));
  }, [data]);
  void _incomePieData; // Reserved for future income pie chart

  // Calculate spending anomalies (months where spending was unusually high)
  const spendingAnomalies = useMemo(() => {
    if (!data || data.monthlyTrends.length < 3) return [];

    const expenses = data.monthlyTrends.map(m => m.expense);
    const avg = expenses.reduce((a, b) => a + b, 0) / expenses.length;
    const stdDev = Math.sqrt(
      expenses.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / expenses.length
    );

    // Flag months where spending exceeds avg + 1.5 std dev
    const threshold = avg + (stdDev * 1.5);

    return data.monthlyTrends
      .filter(m => m.expense > threshold)
      .map(m => ({
        month: m.yearMonth,
        expense: m.expense,
        percentAboveAvg: ((m.expense - avg) / avg) * 100,
      }))
      .slice(0, 3);
  }, [data]);

  // Calculate best/worst months
  const monthStats = useMemo(() => {
    if (!data || data.monthlyTrends.length === 0) return null;

    const sortedBySavings = [...data.monthlyTrends].sort((a, b) => b.savings - a.savings);
    const bestMonth = sortedBySavings[0];
    const worstMonth = sortedBySavings[sortedBySavings.length - 1];

    return { bestMonth, worstMonth };
  }, [data]);

  // Calculate month-over-month trends
  const momTrends = useMemo(() => {
    if (!data || data.monthlyTrends.length < 2) return null;

    const recent = data.monthlyTrends.slice(-2);
    const prev = recent[0];
    const curr = recent[1];

    if (!prev || !curr) return null;

    return {
      expenseChange: prev.expense > 0 ? ((curr.expense - prev.expense) / prev.expense) * 100 : 0,
      incomeChange: prev.income > 0 ? ((curr.income - prev.income) / prev.income) * 100 : 0,
      savingsChange: curr.savings - prev.savings,
      currentMonth: curr.yearMonth,
      previousMonth: prev.yearMonth,
    };
  }, [data]);

  const formatCurrency = (value: number) => format(value);

  const formatTooltip = (value: number | undefined) => value !== undefined ? formatCurrency(value) : "";

  // Memoized label function for PieChart to avoid re-renders
  const renderPieLabel = useCallback(
    ({ name, payload }: { name?: string; payload?: { percentage?: number } }) =>
      `${name ?? ""} ${(payload?.percentage ?? 0).toFixed(0)}%`,
    []
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">無法載入分析資料</p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  // Calculate YoY changes
  const currentYearTotal = data.yearOverYear.currentYear.reduce((sum, m) => sum + m.expense, 0);
  const prevYearTotal = data.yearOverYear.previousYear.reduce((sum, m) => sum + m.expense, 0);
  const yoyChange = prevYearTotal > 0 ? ((currentYearTotal - prevYearTotal) / prevYearTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">財務分析</h1>
          <p className="text-muted-foreground text-sm mt-1">
            深入了解您的收支趨勢
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 個月</SelectItem>
            <SelectItem value="6">6 個月</SelectItem>
            <SelectItem value="12">12 個月</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均月收入</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.averages.monthlyIncome)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均月支出</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(data.averages.monthlyExpense)}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">儲蓄率</p>
                <p className={`text-2xl font-bold ${data.averages.savingsRate >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {data.averages.savingsRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <PiggyBank className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">年度支出變化</p>
                <div className="flex items-center gap-1">
                  <p className={`text-2xl font-bold ${yoyChange <= 0 ? "text-green-600" : "text-red-600"}`}>
                    {yoyChange >= 0 ? "+" : ""}{yoyChange.toFixed(1)}%
                  </p>
                  {yoyChange <= 0 ? (
                    <ArrowDownRight className="h-5 w-5 text-green-600" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <Wallet className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spending Tips */}
      <SpendingTips
        monthlyTrends={data.monthlyTrends}
        categoryBreakdown={data.categoryBreakdown}
        averages={data.averages}
      />

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Trends */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>月度趨勢</CardTitle>
            <CardDescription>收入與支出的每月變化</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} className="text-xs" />
                <Tooltip formatter={formatTooltip} />
                <Legend />
                <Bar dataKey="收入" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="支出" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Year over Year Comparison */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>年度比較</CardTitle>
            <CardDescription>{currentYear} vs {currentYear - 1} 支出比較</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={yoyChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} className="text-xs" />
                <Tooltip formatter={formatTooltip} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={`${currentYear}支出`}
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey={`${currentYear - 1}支出`}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Savings Trend */}
        <Card>
          <CardHeader>
            <CardTitle>淨儲蓄趨勢</CardTitle>
            <CardDescription>每月收入減去支出</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} className="text-xs" />
                <Tooltip formatter={formatTooltip} />
                <Bar
                  dataKey="淨儲蓄"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Breakdown Pie */}
        <Card>
          <CardHeader>
            <CardTitle>支出分布</CardTitle>
            <CardDescription>各分類佔比</CardDescription>
          </CardHeader>
          <CardContent>
            {expensePieData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                無支出資料
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={renderPieLabel}
                    labelLine={false}
                  >
                    {expensePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={formatTooltip} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Amount Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>交易金額分布</CardTitle>
          <CardDescription>各金額區間的交易數量</CardDescription>
        </CardHeader>
        <CardContent>
          <AmountDistributionChart
            transactions={data?.transactionAmounts || []}
            type="expense"
          />
        </CardContent>
      </Card>

      {/* Month Comparison Section */}
      <div className="grid gap-6">
        <MonthComparison />
      </div>

      {/* Insights & Alerts Section */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Spending Anomalies */}
        <Card className={spendingAnomalies.length > 0 ? "border-amber-500/50" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${spendingAnomalies.length > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
              支出警示
            </CardTitle>
            <CardDescription>異常支出月份</CardDescription>
          </CardHeader>
          <CardContent>
            {spendingAnomalies.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">無異常支出</p>
                <p className="text-xs text-muted-foreground mt-1">支出都在正常範圍內</p>
              </div>
            ) : (
              <div className="space-y-3">
                {spendingAnomalies.map((anomaly) => (
                  <div key={anomaly.month} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <span className="text-sm font-medium">{anomaly.month}</span>
                    <div className="text-right">
                      <p className="text-red-600 font-medium">{formatCurrency(anomaly.expense)}</p>
                      <p className="text-xs text-muted-foreground">高於平均 {anomaly.percentAboveAvg.toFixed(0)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Best/Worst Months */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              最佳 / 最差月份
            </CardTitle>
            <CardDescription>以淨儲蓄計算</CardDescription>
          </CardHeader>
          <CardContent>
            {monthStats ? (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">最佳月份</p>
                      <p className="font-medium">{monthStats.bestMonth.yearMonth}</p>
                    </div>
                    <p className="text-green-600 font-bold">{formatCurrency(monthStats.bestMonth.savings)}</p>
                  </div>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">最差月份</p>
                      <p className="font-medium">{monthStats.worstMonth.yearMonth}</p>
                    </div>
                    <p className={monthStats.worstMonth.savings >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                      {formatCurrency(monthStats.worstMonth.savings)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">資料不足</p>
            )}
          </CardContent>
        </Card>

        {/* Month-over-Month Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              月度變化
            </CardTitle>
            <CardDescription>
              {momTrends ? `${momTrends.previousMonth} → ${momTrends.currentMonth}` : "與上月比較"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {momTrends ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">支出變化</span>
                  <span className={`font-medium ${momTrends.expenseChange <= 0 ? "text-green-600" : "text-red-600"}`}>
                    {momTrends.expenseChange >= 0 ? "+" : ""}{momTrends.expenseChange.toFixed(1)}%
                    {momTrends.expenseChange <= 0 ? <ArrowDownRight className="h-4 w-4 inline ml-1" /> : <ArrowUpRight className="h-4 w-4 inline ml-1" />}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">收入變化</span>
                  <span className={`font-medium ${momTrends.incomeChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {momTrends.incomeChange >= 0 ? "+" : ""}{momTrends.incomeChange.toFixed(1)}%
                    {momTrends.incomeChange >= 0 ? <ArrowUpRight className="h-4 w-4 inline ml-1" /> : <ArrowDownRight className="h-4 w-4 inline ml-1" />}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">淨儲蓄差</span>
                  <span className={`font-bold ${momTrends.savingsChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {momTrends.savingsChange >= 0 ? "+" : ""}{formatCurrency(momTrends.savingsChange)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">資料不足</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Rankings */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>支出排行</CardTitle>
            <CardDescription>各分類支出金額</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.categoryBreakdown
                .filter((c) => c.type === "expense")
                .slice(0, 5)
                .map((cat, index) => (
                  <div key={cat.category_id} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-medium truncate">{cat.category_name}</span>
                        <span className="text-red-600 font-medium shrink-0 ml-2">
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                      <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              {data.categoryBreakdown.filter((c) => c.type === "expense").length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">無支出資料</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>收入來源</CardTitle>
            <CardDescription>各分類收入金額</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.categoryBreakdown
                .filter((c) => c.type === "income")
                .slice(0, 5)
                .map((cat, index) => (
                  <div key={cat.category_id} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-medium truncate">{cat.category_name}</span>
                        <span className="text-green-600 font-medium shrink-0 ml-2">
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                      <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              {data.categoryBreakdown.filter((c) => c.type === "income").length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">無收入資料</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
