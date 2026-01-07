"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface BudgetStatus {
  budget: number | null;
  spent: number;
  remaining: number;
  percentUsed: number;
}

export function BudgetAlert() {
  const [status, setStatus] = useState<BudgetStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Get current month
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const fetchBudgetStatus = async () => {
      try {
        const res = await fetch(`/api/dashboard?month=${month}`);
        const json = await res.json();
        if (json.data) {
          const budget = json.data.budget;
          const spent = json.data.totalExpense;
          setStatus({
            budget,
            spent,
            remaining: budget ? Math.max(budget - spent, 0) : 0,
            percentUsed: budget ? (spent / budget) * 100 : 0,
          });
        }
      } catch {
        // Silently fail - budget alert is not critical
      }
    };

    fetchBudgetStatus();
  }, []);

  // Don't show if dismissed, no status, no budget, or under 80%
  if (dismissed || !status || !status.budget || status.percentUsed < 80) {
    return null;
  }

  const isOverBudget = status.percentUsed >= 100;
  const isWarning = status.percentUsed >= 80 && status.percentUsed < 100;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: "TWD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Alert
      variant={isOverBudget ? "destructive" : "default"}
      className={`mb-6 ${isWarning ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" : ""}`}
    >
      {isOverBudget ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <TrendingUp className="h-4 w-4 text-yellow-600" />
      )}
      <AlertTitle className={isWarning ? "text-yellow-800 dark:text-yellow-200" : ""}>
        {isOverBudget ? "預算已超支！" : "預算即將用完"}
      </AlertTitle>
      <AlertDescription className={isWarning ? "text-yellow-700 dark:text-yellow-300" : ""}>
        {isOverBudget ? (
          <>
            本月支出 {formatCurrency(status.spent)} 已超過預算 {formatCurrency(status.budget)}{" "}
            共 {formatCurrency(status.spent - status.budget)}。
          </>
        ) : (
          <>
            本月已使用 {status.percentUsed.toFixed(0)}% 預算，剩餘 {formatCurrency(status.remaining)}。
          </>
        )}{" "}
        <Link href="/settings" className="underline font-medium">
          調整預算
        </Link>
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
