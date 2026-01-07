"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Category, TransactionType } from "@/types/database";
import { useKeyboardShortcuts } from "@/hooks";

interface QuickAddTransactionProps {
  onSuccess?: () => void;
}

export function QuickAddTransaction({ onSuccess }: QuickAddTransactionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    type: "expense" as TransactionType,
    category_id: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetch("/api/categories")
        .then((res) => res.json())
        .then((json) => {
          if (json.data) {
            setCategories(json.data);
            // Set default category
            const defaultCategory = json.data.find((c: Category) => c.type === "expense");
            if (defaultCategory) {
              setFormData((prev) => ({ ...prev, category_id: defaultCategory.id }));
            }
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const handleOpen = useCallback(() => {
    setFormData({
      type: "expense",
      category_id: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      note: "",
    });
    setError(null);
    setIsOpen(true);
  }, []);

  // Global keyboard shortcut to open quick add
  useKeyboardShortcuts([
    {
      key: "n",
      handler: handleOpen,
      description: "新增交易",
    },
    {
      key: "Escape",
      handler: () => setIsOpen(false),
      description: "關閉",
    },
  ]);

  const handleTypeChange = (type: TransactionType) => {
    const defaultCategory = categories.find((c) => c.type === type);
    setFormData((prev) => ({
      ...prev,
      type,
      category_id: defaultCategory?.id || "",
    }));
  };

  const filteredCategories = categories.filter((c) => c.type === formData.type);

  const handleSubmit = async () => {
    if (!formData.category_id) {
      setError("請選擇分類");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("請輸入有效金額");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setIsOpen(false);
      toast.success("交易已新增");
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "儲存失敗";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
        aria-label="新增交易"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>快速新增交易</DialogTitle>
            <DialogDescription>記錄新的收入或支出</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>日期</Label>
              <DatePicker
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
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
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
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
    </>
  );
}
