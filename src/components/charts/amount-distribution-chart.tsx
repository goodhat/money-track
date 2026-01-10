"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useCurrency } from "@/hooks";

interface AmountDistributionChartProps {
  transactions: Array<{
    type: "income" | "expense";
    amount: number;
  }>;
  type?: "income" | "expense" | "all";
}

const RANGES = [
  { min: 0, max: 100, label: "0-100" },
  { min: 100, max: 500, label: "100-500" },
  { min: 500, max: 1000, label: "500-1K" },
  { min: 1000, max: 5000, label: "1K-5K" },
  { min: 5000, max: 10000, label: "5K-10K" },
  { min: 10000, max: 50000, label: "10K-50K" },
  { min: 50000, max: Infinity, label: "50K+" },
];

export function AmountDistributionChart({
  transactions,
  type = "all",
}: AmountDistributionChartProps) {
  const { format } = useCurrency();

  const data = useMemo(() => {
    const filtered = type === "all"
      ? transactions
      : transactions.filter((tx) => tx.type === type);

    return RANGES.map((range) => {
      const count = filtered.filter(
        (tx) => tx.amount >= range.min && tx.amount < range.max
      ).length;

      const total = filtered
        .filter((tx) => tx.amount >= range.min && tx.amount < range.max)
        .reduce((sum, tx) => sum + tx.amount, 0);

      return {
        range: range.label,
        count,
        total,
        percentage: filtered.length > 0 ? (count / filtered.length) * 100 : 0,
      };
    });
  }, [transactions, type]);

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const getBarColor = (index: number) => {
    const colors = [
      "#10b981", // green
      "#3b82f6", // blue
      "#8b5cf6", // purple
      "#f59e0b", // amber
      "#ef4444", // red
      "#ec4899", // pink
      "#06b6d4", // cyan
    ];
    return colors[index % colors.length];
  };

  if (transactions.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-muted-foreground">
        無交易資料
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
        <XAxis type="number" domain={[0, maxCount]} className="text-xs" />
        <YAxis
          type="category"
          dataKey="range"
          width={60}
          className="text-xs"
        />
        <Tooltip
          formatter={(value, name) => {
            if (value === undefined) return ["", ""];
            if (name === "count") return [`${value} 筆`, "交易數"];
            return [format(Number(value)), "總金額"];
          }}
          labelFormatter={(label) => `金額範圍: ${label}`}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(index)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
