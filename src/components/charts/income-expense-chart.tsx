"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface IncomeExpenseChartProps {
  totalIncome: number;
  totalExpense: number;
  budget: number | null;
}

export function IncomeExpenseChart({
  totalIncome,
  totalExpense,
  budget,
}: IncomeExpenseChartProps) {
  const data = [
    {
      name: "本月",
      收入: totalIncome,
      支出: totalExpense,
      預算: budget || 0,
    },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: "TWD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
        <Tooltip formatter={(value) => formatCurrency(value as number)} />
        <Legend />
        <Bar dataKey="收入" fill="#10b981" />
        <Bar dataKey="支出" fill="#ef4444" />
        {budget && <Bar dataKey="預算" fill="#f59e0b" />}
      </BarChart>
    </ResponsiveContainer>
  );
}
