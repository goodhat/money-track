"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { useCurrency } from "@/hooks";

interface CategoryBudgetData {
  category_id: string;
  category_name: string;
  category_color: string | null;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
}

export default function SettingsPage() {
  const { format } = useCurrency();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [budgetAmount, setBudgetAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgetData[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState("");

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
    }
  };

  const fetchCategoryBudgets = async () => {
    try {
      const res = await fetch(`/api/category-budgets/${selectedMonth}`);
      const json = await res.json();
      if (json.data) {
        setCategoryBudgets(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch category budgets:", err);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchBudget(), fetchCategoryBudgets()]).finally(() => {
      setIsLoading(false);
    });
  }, [selectedMonth]);

  const handleSave = async () => {
    const amount = parseFloat(budgetAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("請輸入有效的預算金額");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch(`/api/budgets/${selectedMonth}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      toast.success("預算已儲存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategoryBudgetSave = async (categoryId: string) => {
    const amount = parseFloat(editingAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("請輸入有效的預算金額");
      return;
    }

    try {
      const res = await fetch(`/api/category-budgets/${selectedMonth}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: categoryId, amount }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      // Refresh category budgets
      fetchCategoryBudgets();
      setEditingCategory(null);
      toast.success("分類預算已儲存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "儲存失敗");
    }
  };

  const startEditing = (category: CategoryBudgetData) => {
    setEditingCategory(category.category_id);
    setEditingAmount(category.budget > 0 ? String(category.budget) : "");
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

  const totalCategoryBudgets = useMemo(() => {
    return categoryBudgets.reduce((sum, cat) => sum + cat.budget, 0);
  }, [categoryBudgets]);

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>

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

      <Card>
        <CardHeader>
          <CardTitle>總預算設定</CardTitle>
          <CardDescription>設定每月的總支出預算上限</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="budget">預算金額 (TWD)</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-48" />
            ) : (
              <div className="flex gap-2">
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
                <Button onClick={handleSave} disabled={isSaving || isLoading}>
                  {isSaving ? "儲存中..." : "儲存"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>分類預算</CardTitle>
              <CardDescription>為各支出分類設定個別預算限制</CardDescription>
            </div>
            {totalCategoryBudgets > 0 && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">分類預算總和</p>
                <p className="text-lg font-semibold">{format(totalCategoryBudgets)}</p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : categoryBudgets.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              尚無支出分類。請先新增分類。
            </p>
          ) : (
            <div className="space-y-4">
              {categoryBudgets.map((cat) => (
                <div
                  key={cat.category_id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.category_color || "#ef4444" }}
                      />
                      <span className="font-medium">{cat.category_name}</span>
                    </div>
                    {editingCategory === cat.category_id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="100"
                          value={editingAmount}
                          onChange={(e) => setEditingAmount(e.target.value)}
                          className="w-32 h-8"
                          placeholder="0"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleCategoryBudgetSave(cat.category_id);
                            } else if (e.key === "Escape") {
                              setEditingCategory(null);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleCategoryBudgetSave(cat.category_id)}
                        >
                          儲存
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingCategory(null)}
                        >
                          取消
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(cat)}
                      >
                        {cat.budget > 0 ? format(cat.budget) : "設定預算"}
                      </Button>
                    )}
                  </div>

                  {cat.budget > 0 && (
                    <>
                      <Progress
                        value={Math.min(cat.percentage, 100)}
                        className="h-2"
                        indicatorClassName={getStatusColor(cat.percentage)}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-2">
                        <span>
                          已花費 {format(cat.spent)} / {format(cat.budget)}
                        </span>
                        <span className={cat.remaining < 0 ? "text-red-600" : ""}>
                          {cat.remaining >= 0 ? `剩餘 ${format(cat.remaining)}` : `超支 ${format(Math.abs(cat.remaining))}`}
                        </span>
                      </div>
                    </>
                  )}

                  {cat.budget === 0 && cat.spent > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      本月已花費 {format(cat.spent)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
