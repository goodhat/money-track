"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [budgetAmount, setBudgetAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchBudget = async () => {
    try {
      const res = await fetch(`/api/budgets/${selectedMonth}`);
      const json = await res.json();
      if (json.data) {
        setBudgetAmount(String(json.data.amount));
      } else {
        setBudgetAmount("");
      }
    } catch (err) {
      console.error("Failed to fetch budget:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setMessage(null);
    fetchBudget();
  }, [selectedMonth]);

  const handleSave = async () => {
    const amount = parseFloat(budgetAmount);
    if (isNaN(amount) || amount < 0) {
      setMessage({ type: "error", text: "請輸入有效的預算金額" });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/budgets/${selectedMonth}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setMessage({ type: "success", text: "預算已儲存" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "儲存失敗",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    // Show current month and next 11 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
      options.push({ value, label });
    }
    return options;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>

      <Card>
        <CardHeader>
          <CardTitle>月預算設定</CardTitle>
          <CardDescription>設定每月的支出預算上限</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>選擇月份</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">預算金額 (TWD)</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-48" />
            ) : (
              <Input
                id="budget"
                type="number"
                min="0"
                step="100"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="輸入預算金額"
                className="w-48"
              />
            )}
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {message.text}
            </p>
          )}

          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? "儲存中..." : "儲存預算"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
