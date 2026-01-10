"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Play, Pencil, Trash2, CalendarClock, Pause, RefreshCw } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { Category, TransactionTemplate, TransactionType, RecurrenceFrequency } from "@/types/database";
import { useCurrency } from "@/hooks";

interface TemplateWithCategory extends TransactionTemplate {
  category: Pick<Category, "id" | "name" | "type">;
}

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  daily: "每日",
  weekly: "每週",
  biweekly: "每兩週",
  monthly: "每月",
  yearly: "每年",
};

export default function TemplatesPage() {
  const { format } = useCurrency();
  const [templates, setTemplates] = useState<TemplateWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithCategory | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState<TemplateWithCategory | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [isApplyingRecurring, setIsApplyingRecurring] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "expense" as TransactionType,
    category_id: "",
    amount: "",
    note: "",
    is_recurring: false,
    recurrence_frequency: "monthly" as RecurrenceFrequency,
    recurrence_day: "",
  });
  const [applyDate, setApplyDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setTemplates(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "載入範本失敗");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setCategories(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "載入分類失敗");
    }
  };

  const fetchDueRecurring = async () => {
    try {
      const res = await fetch("/api/recurring");
      const json = await res.json();
      if (!json.error) {
        setDueCount(json.due_count || 0);
      }
    } catch {
      // Silent fail for due count
    }
  };

  const handleApplyAllRecurring = async () => {
    setIsApplyingRecurring(true);
    try {
      const res = await fetch("/api/recurring", { method: "POST" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      if (json.applied > 0) {
        toast.success(`已自動記錄 ${json.applied} 筆交易`);
        fetchDueRecurring();
      } else {
        toast.info("目前沒有待記錄的定期交易");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "自動記錄失敗");
    } finally {
      setIsApplyingRecurring(false);
    }
  };

  const handleToggleActive = async (template: TemplateWithCategory) => {
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !template.is_active }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      fetchTemplates();
      toast.success(template.is_active ? "已暫停定期交易" : "已啟用定期交易");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新失敗");
    }
  };

  useEffect(() => {
    Promise.all([fetchTemplates(), fetchCategories(), fetchDueRecurring()]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === formData.type),
    [categories, formData.type]
  );

  const handleTypeChange = (type: TransactionType) => {
    const defaultCategory = categories.find((c) => c.type === type);
    setFormData((prev) => ({
      ...prev,
      type,
      category_id: defaultCategory?.id || "",
    }));
  };

  const handleOpenDialog = (template?: TemplateWithCategory) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        type: template.type,
        category_id: template.category_id,
        amount: String(template.amount),
        note: template.note || "",
        is_recurring: template.is_recurring,
        recurrence_frequency: template.recurrence_frequency || "monthly",
        recurrence_day: template.recurrence_day ? String(template.recurrence_day) : "",
      });
    } else {
      setEditingTemplate(null);
      const defaultCategory = categories.find((c) => c.type === "expense");
      setFormData({
        name: "",
        type: "expense",
        category_id: defaultCategory?.id || "",
        amount: "",
        note: "",
        is_recurring: false,
        recurrence_frequency: "monthly",
        recurrence_day: "",
      });
    }
    setError(null);
    setIsDialogOpen(true);
  };

  const handleOpenApplyDialog = (template: TemplateWithCategory) => {
    setApplyingTemplate(template);
    setApplyDate(new Date().toISOString().split("T")[0]);
    setIsApplyDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError("請輸入範本名稱");
      return;
    }
    if (!formData.category_id) {
      setError("請選擇分類");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("請輸入有效金額");
      return;
    }
    if (formData.is_recurring && formData.recurrence_day) {
      const day = parseInt(formData.recurrence_day);
      if (isNaN(day) || day < 1 || day > 31) {
        setError("請輸入有效日期 (1-31)");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = editingTemplate
        ? `/api/templates/${editingTemplate.id}`
        : "/api/templates";
      const method = editingTemplate ? "PUT" : "POST";

      const payload: Record<string, unknown> = {
        name: formData.name,
        type: formData.type,
        category_id: formData.category_id,
        amount: parseFloat(formData.amount),
        note: formData.note,
        is_recurring: formData.is_recurring,
      };

      if (formData.is_recurring) {
        payload.recurrence_frequency = formData.recurrence_frequency;
        payload.recurrence_day = formData.recurrence_day ? parseInt(formData.recurrence_day) : null;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setIsDialogOpen(false);
      fetchTemplates();
      fetchDueRecurring();
      toast.success(editingTemplate ? "範本已更新" : "範本已建立");
    } catch (err) {
      const message = err instanceof Error ? err.message : "儲存失敗";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!applyingTemplate) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: applyingTemplate.category_id,
          type: applyingTemplate.type,
          amount: applyingTemplate.amount,
          date: applyDate,
          note: applyingTemplate.note,
        }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setIsApplyDialogOpen(false);
      toast.success("已從範本建立交易");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "建立交易失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此範本嗎？")) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      fetchTemplates();
      toast.success("範本已刪除");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  const expenseTemplates = templates.filter((t) => t.type === "expense" && !t.is_recurring);
  const incomeTemplates = templates.filter((t) => t.type === "income" && !t.is_recurring);
  const recurringTemplates = templates.filter((t) => t.is_recurring);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-40 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
                  ))}
                </div>
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
          <h1 className="text-2xl font-bold">範本與定期交易</h1>
          <p className="text-muted-foreground text-sm mt-1">
            儲存常用的交易，或設定自動定期記帳
          </p>
        </div>
        <div className="flex gap-2">
          {dueCount > 0 && (
            <Button
              variant="outline"
              onClick={handleApplyAllRecurring}
              disabled={isApplyingRecurring}
              className="relative"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isApplyingRecurring ? "animate-spin" : ""}`} />
              執行定期交易
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {dueCount}
              </Badge>
            </Button>
          )}
          <Button onClick={() => handleOpenDialog()}>新增範本</Button>
        </div>
      </div>

      {/* Recurring Transactions Section */}
      {recurringTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              定期交易
            </CardTitle>
            <CardDescription>自動記錄的定期收支</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recurringTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors ${
                    !template.is_active ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{template.name}</span>
                      <Badge variant={template.type === "income" ? "default" : "secondary"}>
                        {template.category.name}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {FREQUENCY_LABELS[template.recurrence_frequency!]}
                        {template.recurrence_day && ` ${template.recurrence_day}日`}
                      </Badge>
                      {!template.is_active && (
                        <Badge variant="secondary" className="text-xs">已暫停</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={template.type === "income" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {template.type === "income" ? "+" : "-"}{format(template.amount)}
                      </span>
                      {template.next_occurrence && template.is_active && (
                        <span className="text-muted-foreground text-sm">
                          下次：{template.next_occurrence}
                        </span>
                      )}
                      {template.note && (
                        <span className="text-muted-foreground text-sm truncate">
                          {template.note}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(template)}
                      title={template.is_active ? "暫停" : "啟用"}
                    >
                      {template.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(template)}
                      title="編輯"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(template.id)}
                      title="刪除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>支出範本</CardTitle>
            <CardDescription>常用的支出交易</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expenseTemplates.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  尚無支出範本
                </p>
              ) : (
                expenseTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{template.name}</span>
                        <Badge variant="secondary" className="shrink-0">
                          {template.category.name}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-red-600 font-medium">
                          -{format(template.amount)}
                        </span>
                        {template.note && (
                          <span className="text-muted-foreground text-sm truncate">
                            {template.note}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenApplyDialog(template)}
                        title="套用範本"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(template)}
                        title="編輯"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(template.id)}
                        title="刪除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>收入範本</CardTitle>
            <CardDescription>常用的收入交易</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {incomeTemplates.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  尚無收入範本
                </p>
              ) : (
                incomeTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{template.name}</span>
                        <Badge variant="default" className="shrink-0">
                          {template.category.name}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-green-600 font-medium">
                          +{format(template.amount)}
                        </span>
                        {template.note && (
                          <span className="text-muted-foreground text-sm truncate">
                            {template.note}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenApplyDialog(template)}
                        title="套用範本"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(template)}
                        title="編輯"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(template.id)}
                        title="刪除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Template Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "編輯範本" : "新增範本"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate ? "修改範本資訊" : "建立常用交易範本"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>範本名稱</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：午餐、捷運、月薪"
              />
            </div>
            <div className="space-y-2">
              <Label>類型</Label>
              <Select
                value={formData.type}
                onValueChange={(v: TransactionType) => handleTypeChange(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">支出</SelectItem>
                  <SelectItem value="income">收入</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>分類</Label>
              <Select
                value={formData.category_id}
                onValueChange={(v) => setFormData({ ...formData, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>金額 (TWD)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>備註 (選填)</Label>
              <Input
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="輸入備註..."
              />
            </div>

            {/* Recurring Transaction Settings */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_recurring" className="font-medium">設為定期交易</Label>
                  <p className="text-muted-foreground text-sm">自動建立定期收支記錄</p>
                </div>
                <Switch
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                />
              </div>

              {formData.is_recurring && (
                <div className="space-y-4 mt-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>重複週期</Label>
                    <Select
                      value={formData.recurrence_frequency}
                      onValueChange={(v: RecurrenceFrequency) =>
                        setFormData({ ...formData, recurrence_frequency: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">每日</SelectItem>
                        <SelectItem value="weekly">每週</SelectItem>
                        <SelectItem value="biweekly">每兩週</SelectItem>
                        <SelectItem value="monthly">每月</SelectItem>
                        <SelectItem value="yearly">每年</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(formData.recurrence_frequency === "monthly" || formData.recurrence_frequency === "yearly") && (
                    <div className="space-y-2">
                      <Label>指定日期 (選填)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.recurrence_day}
                        onChange={(e) => setFormData({ ...formData, recurrence_day: e.target.value })}
                        placeholder="例如：5 (每月5號)"
                      />
                      <p className="text-muted-foreground text-xs">
                        若該月沒有此日期，將自動調整為當月最後一天
                      </p>
                    </div>
                  )}
                </div>
              )}
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

      {/* Apply Template Dialog */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>套用範本</DialogTitle>
            <DialogDescription>
              選擇日期以建立交易
            </DialogDescription>
          </DialogHeader>
          {applyingTemplate && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{applyingTemplate.name}</span>
                  <Badge variant={applyingTemplate.type === "income" ? "default" : "secondary"}>
                    {applyingTemplate.category.name}
                  </Badge>
                </div>
                <span className={applyingTemplate.type === "income" ? "text-green-600" : "text-red-600"}>
                  {applyingTemplate.type === "income" ? "+" : "-"}
                  {format(applyingTemplate.amount)}
                </span>
                {applyingTemplate.note && (
                  <p className="text-muted-foreground text-sm mt-1">{applyingTemplate.note}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>日期</Label>
                <DatePicker
                  value={applyDate}
                  onChange={(date) => setApplyDate(date)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApplyDialogOpen(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button onClick={handleApplyTemplate} disabled={isSubmitting}>
              {isSubmitting ? "建立中..." : "建立交易"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
