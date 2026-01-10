"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  PiggyBank,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  Check,
  Target,
  Calendar,
  Minus,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { SavingsGoal } from "@/types/database";
import { useCurrency } from "@/hooks";

const GOAL_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export default function GoalsPage() {
  const { format } = useCurrency();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isContributeDialogOpen, setIsContributeDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [contributingGoal, setContributingGoal] = useState<SavingsGoal | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    target_amount: "",
    target_date: "",
    color: "#3b82f6",
  });
  const [contributeData, setContributeData] = useState({
    amount: "",
    note: "",
    isDeposit: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGoals = async () => {
    try {
      const res = await fetch("/api/goals");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setGoals(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "載入目標失敗");
    }
  };

  useEffect(() => {
    fetchGoals().finally(() => setIsLoading(false));
  }, []);

  const handleOpenDialog = (goal?: SavingsGoal) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        name: goal.name,
        target_amount: String(goal.target_amount),
        target_date: goal.target_date || "",
        color: goal.color,
      });
    } else {
      setEditingGoal(null);
      setFormData({
        name: "",
        target_amount: "",
        target_date: "",
        color: "#3b82f6",
      });
    }
    setError(null);
    setIsDialogOpen(true);
  };

  const handleOpenContributeDialog = (goal: SavingsGoal) => {
    setContributingGoal(goal);
    setContributeData({ amount: "", note: "", isDeposit: true });
    setIsContributeDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError("請輸入目標名稱");
      return;
    }
    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
      setError("請輸入有效目標金額");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = editingGoal ? `/api/goals/${editingGoal.id}` : "/api/goals";
      const method = editingGoal ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          target_amount: parseFloat(formData.target_amount),
          target_date: formData.target_date || null,
          color: formData.color,
        }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setIsDialogOpen(false);
      fetchGoals();
      toast.success(editingGoal ? "目標已更新" : "目標已建立");
    } catch (err) {
      const message = err instanceof Error ? err.message : "儲存失敗";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContribute = async () => {
    if (!contributingGoal) return;
    if (!contributeData.amount || parseFloat(contributeData.amount) <= 0) {
      toast.error("請輸入有效金額");
      return;
    }

    setIsSubmitting(true);

    try {
      const amount = contributeData.isDeposit
        ? parseFloat(contributeData.amount)
        : -parseFloat(contributeData.amount);

      const res = await fetch(`/api/goals/${contributingGoal.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          note: contributeData.note || null,
        }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setIsContributeDialogOpen(false);
      fetchGoals();

      if (json.is_newly_completed) {
        toast.success("恭喜！目標已達成！", {
          description: `${contributingGoal.name} 已存滿 ${format(contributingGoal.target_amount)}`,
        });
      } else {
        toast.success(contributeData.isDeposit ? "已存入" : "已提取");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此目標嗎？所有存款紀錄也會一併刪除。")) return;

    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      fetchGoals();
      toast.success("目標已刪除");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  const activeGoals = goals.filter((g) => !g.is_completed);
  const completedGoals = goals.filter((g) => g.is_completed);

  // Calculate days remaining
  const getDaysRemaining = (targetDate: string | null) => {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Calculate required monthly savings
  const getMonthlyRequired = (goal: SavingsGoal) => {
    if (!goal.target_date) return null;
    const remaining = goal.target_amount - goal.current_amount;
    if (remaining <= 0) return 0;
    const days = getDaysRemaining(goal.target_date);
    if (!days || days <= 0) return remaining;
    const months = days / 30;
    return remaining / months;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">儲蓄目標</h1>
          <p className="text-muted-foreground text-sm mt-1">
            設定並追蹤您的財務目標
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          新增目標
        </Button>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            進行中的目標
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeGoals.map((goal) => {
              const progress = (goal.current_amount / goal.target_amount) * 100;
              const daysRemaining = getDaysRemaining(goal.target_date);
              const monthlyRequired = getMonthlyRequired(goal);

              return (
                <Card key={goal.id} className="relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: goal.color }}
                  />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${goal.color}20` }}
                        >
                          <PiggyBank className="h-5 w-5" style={{ color: goal.color }} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{goal.name}</CardTitle>
                          {goal.target_date && (
                            <CardDescription className="flex items-center gap-1 text-xs">
                              <Calendar className="h-3 w-3" />
                              {goal.target_date}
                              {daysRemaining !== null && daysRemaining > 0 && (
                                <span className="ml-1">({daysRemaining} 天)</span>
                              )}
                              {daysRemaining !== null && daysRemaining <= 0 && (
                                <Badge variant="destructive" className="ml-1 text-xs">已過期</Badge>
                              )}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(goal)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600"
                          onClick={() => handleDelete(goal.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">進度</span>
                        <span className="font-medium">{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-2" />
                      <div className="flex justify-between mt-2 text-sm">
                        <span style={{ color: goal.color }} className="font-medium">
                          {format(goal.current_amount)}
                        </span>
                        <span className="text-muted-foreground">
                          / {format(goal.target_amount)}
                        </span>
                      </div>
                    </div>

                    {monthlyRequired !== null && monthlyRequired > 0 && (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        <TrendingUp className="h-3 w-3 inline mr-1" />
                        每月需存 {format(monthlyRequired)} 才能達成
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setContributeData({ ...contributeData, isDeposit: false });
                          handleOpenContributeDialog(goal);
                        }}
                        disabled={goal.current_amount <= 0}
                      >
                        <Minus className="h-4 w-4 mr-1" />
                        提取
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        style={{ backgroundColor: goal.color }}
                        onClick={() => {
                          setContributeData({ ...contributeData, isDeposit: true });
                          handleOpenContributeDialog(goal);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        存入
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            已達成的目標
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedGoals.map((goal) => (
              <Card key={goal.id} className="relative overflow-hidden bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                <div className="absolute top-0 left-0 right-0 h-1 bg-green-500" />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <Check className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{goal.name}</CardTitle>
                        {goal.completed_at && (
                          <CardDescription className="text-xs">
                            達成於 {new Date(goal.completed_at).toLocaleDateString("zh-TW")}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600"
                      onClick={() => handleDelete(goal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">存款金額</span>
                    <span className="text-green-600 font-bold text-lg">
                      {format(goal.current_amount)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <PiggyBank className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">尚無儲蓄目標</h3>
            <p className="text-muted-foreground text-sm mb-4">
              建立您的第一個儲蓄目標，開始追蹤財務進度
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              新增目標
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Goal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGoal ? "編輯目標" : "新增儲蓄目標"}
            </DialogTitle>
            <DialogDescription>
              {editingGoal ? "修改目標設定" : "設定您想達成的儲蓄目標"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>目標名稱</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：旅遊基金、新手機、緊急預備金"
              />
            </div>
            <div className="space-y-2">
              <Label>目標金額 (TWD)</Label>
              <Input
                type="number"
                min="0"
                step="1000"
                value={formData.target_amount}
                onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>目標日期 (選填)</Label>
              <DatePicker
                value={formData.target_date}
                onChange={(date) => setFormData({ ...formData, target_date: date })}
              />
            </div>
            <div className="space-y-2">
              <Label>顏色</Label>
              <div className="flex gap-2 flex-wrap">
                {GOAL_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-transform ${
                      formData.color === color ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contribute Dialog */}
      <Dialog open={isContributeDialogOpen} onOpenChange={setIsContributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {contributeData.isDeposit ? "存入" : "提取"} - {contributingGoal?.name}
            </DialogTitle>
            <DialogDescription>
              {contributeData.isDeposit ? "將資金存入此目標" : "從此目標提取資金"}
            </DialogDescription>
          </DialogHeader>
          {contributingGoal && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">目前進度</span>
                  <span>
                    {format(contributingGoal.current_amount)} / {format(contributingGoal.target_amount)}
                  </span>
                </div>
                <Progress
                  value={(contributingGoal.current_amount / contributingGoal.target_amount) * 100}
                  className="h-2"
                />
              </div>
              <div className="space-y-2">
                <Label>{contributeData.isDeposit ? "存入" : "提取"}金額 (TWD)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={contributeData.amount}
                  onChange={(e) =>
                    setContributeData({ ...contributeData, amount: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>備註 (選填)</Label>
                <Input
                  value={contributeData.note}
                  onChange={(e) =>
                    setContributeData({ ...contributeData, note: e.target.value })
                  }
                  placeholder="例如：獎金、年終"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsContributeDialogOpen(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              onClick={handleContribute}
              disabled={isSubmitting}
              variant={contributeData.isDeposit ? "default" : "destructive"}
            >
              {isSubmitting ? "處理中..." : contributeData.isDeposit ? "存入" : "提取"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
