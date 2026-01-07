"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { Search, X, Download } from "lucide-react";
import { toast } from "sonner";
import { exportTransactionsToCSV } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
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
import { Category, Transaction, TransactionType } from "@/types/database";
import { TransactionsSkeleton } from "@/components/skeletons/transactions-skeleton";
import { useApi, usePaginatedApi, useMonthSelector, useCurrency, useKeyboardShortcuts, KEYBOARD_SHORTCUTS } from "@/hooks";

interface TransactionWithCategory extends Transaction {
  category: Pick<Category, "id" | "name" | "type">;
}

type FilterType = "all" | "income" | "expense";

export default function TransactionsPage() {
  const { selectedMonth, setSelectedMonth, monthOptions } = useMonthSelector();
  const { formatWithSign } = useCurrency();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Fetch categories using the useApi hook
  const { data: categories = [] } = useApi<Category[]>("/api/categories");

  // Build URL for paginated transactions
  const buildTransactionsUrl = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams({ month: selectedMonth });
      if (cursor) params.set("cursor", cursor);
      return `/api/transactions?${params.toString()}`;
    },
    [selectedMonth]
  );

  // Fetch transactions using the usePaginatedApi hook
  const {
    data: transactions,
    pagination,
    isLoading,
    isLoadingMore,
    loadMore,
    refetch: refetchTransactions,
  } = usePaginatedApi<TransactionWithCategory>(buildTransactionsUrl);

  // Filter transactions based on search and filters
  const filteredTransactions = useMemo(() => {
    let result = transactions;

    // Filter by type
    if (filterType !== "all") {
      result = result.filter((tx) => tx.type === filterType);
    }

    // Filter by category
    if (filterCategory !== "all") {
      result = result.filter((tx) => tx.category_id === filterCategory);
    }

    // Filter by search query (searches in note and category name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.note?.toLowerCase().includes(query) ||
          tx.category.name.toLowerCase().includes(query) ||
          String(tx.amount).includes(query)
      );
    }

    return result;
  }, [transactions, filterType, filterCategory, searchQuery]);

  // Get categories for the current filter type
  const availableCategories = useMemo(() => {
    if (filterType === "all") {
      return categories || [];
    }
    return (categories || []).filter((c) => c.type === filterType);
  }, [categories, filterType]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setFilterType("all");
    setFilterCategory("all");
  }, []);

  const hasActiveFilters = searchQuery || filterType !== "all" || filterCategory !== "all";

  // Ref for search input focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithCategory | null>(null);
  const [formData, setFormData] = useState({
    type: "expense" as TransactionType,
    category_id: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCategories = useMemo(
    () => (categories || []).filter((c) => c.type === formData.type),
    [categories, formData.type]
  );

  const handleOpenDialog = useCallback(
    (transaction?: TransactionWithCategory) => {
      if (transaction) {
        setEditingTransaction(transaction);
        setFormData({
          type: transaction.type,
          category_id: transaction.category_id,
          amount: String(transaction.amount),
          date: transaction.date,
          note: transaction.note || "",
        });
      } else {
        setEditingTransaction(null);
        const defaultCategory = (categories || []).find((c) => c.type === "expense");
        setFormData({
          type: "expense",
          category_id: defaultCategory?.id || "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          note: "",
        });
      }
      setError(null);
      setIsDialogOpen(true);
    },
    [categories]
  );

  const handleTypeChange = useCallback(
    (type: TransactionType) => {
      const defaultCategory = (categories || []).find((c) => c.type === type);
      setFormData((prev) => ({
        ...prev,
        type,
        category_id: defaultCategory?.id || "",
      }));
    },
    [categories]
  );

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
      const url = editingTransaction
        ? `/api/transactions/${editingTransaction.id}`
        : "/api/transactions";
      const method = editingTransaction ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setIsDialogOpen(false);
      refetchTransactions();
      toast.success(editingTransaction ? "交易已更新" : "交易已新增");
    } catch (err) {
      const message = err instanceof Error ? err.message : "儲存失敗";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此交易嗎？")) return;

    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      refetchTransactions();
      toast.success("交易已刪除");
    } catch (err) {
      const message = err instanceof Error ? err.message : "刪除失敗";
      toast.error(message);
    }
  };

  const handleExport = useCallback(() => {
    try {
      exportTransactionsToCSV(filteredTransactions, `transactions_${selectedMonth}.csv`);
      toast.success("已匯出 CSV 檔案");
    } catch {
      toast.error("匯出失敗");
    }
  }, [filteredTransactions, selectedMonth]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      ...KEYBOARD_SHORTCUTS.NEW_TRANSACTION,
      handler: () => handleOpenDialog(),
    },
    {
      ...KEYBOARD_SHORTCUTS.SEARCH,
      handler: () => searchInputRef.current?.focus(),
    },
    {
      ...KEYBOARD_SHORTCUTS.EXPORT,
      handler: () => {
        if (filteredTransactions.length > 0) {
          handleExport();
        }
      },
    },
    {
      ...KEYBOARD_SHORTCUTS.ESCAPE,
      handler: () => setIsDialogOpen(false),
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">交易紀錄</h1>
        <div className="flex gap-2">
          {filteredTransactions.length > 0 && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              匯出 CSV
            </Button>
          )}
          <Button onClick={() => handleOpenDialog()}>新增交易</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            {/* Month selector */}
            <div className="space-y-2">
              <Label>月份</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2 flex-1">
              <Label>搜尋</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="搜尋備註、分類或金額..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Type filter */}
            <div className="space-y-2">
              <Label>類型</Label>
              <Select value={filterType} onValueChange={(v: FilterType) => {
                setFilterType(v);
                setFilterCategory("all"); // Reset category when type changes
              }}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="expense">支出</SelectItem>
                  <SelectItem value="income">收入</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category filter */}
            <div className="space-y-2">
              <Label>分類</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-4 w-4" />
                清除篩選
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <TransactionsSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>交易列表</CardTitle>
              {hasActiveFilters && (
                <span className="text-sm text-muted-foreground">
                  顯示 {filteredTransactions.length} 筆 / 共 {transactions.length} 筆
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                {hasActiveFilters ? "沒有符合條件的交易" : "本月尚無交易紀錄"}
              </p>
            ) : (
            <div className="space-y-2">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => handleOpenDialog(tx)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={tx.type === "income" ? "default" : "secondary"}>
                        {tx.category.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{tx.date}</span>
                    </div>
                    {tx.note && (
                      <p className="text-sm text-muted-foreground mt-1">{tx.note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-medium ${
                        tx.type === "income" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatWithSign(tx.amount, tx.type)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(tx.id);
                      }}
                    >
                      刪除
                    </Button>
                  </div>
                </div>
              ))}
              {pagination?.hasMore && (
                <div className="pt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? "載入中..." : "載入更多"}
                  </Button>
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? "編輯交易" : "新增交易"}
            </DialogTitle>
            <DialogDescription>
              {editingTransaction ? "修改交易資訊" : "記錄新的收入或支出"}
            </DialogDescription>
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
    </div>
  );
}
