"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { Search, X, Download, Copy, Bookmark, Filter, Trash2, CheckSquare, Square, TrendingUp, TrendingDown, Receipt, Calculator } from "lucide-react";
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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Category, Transaction, TransactionType, SavedFilter } from "@/types/database";
import { TransactionsSkeleton } from "@/components/skeletons/transactions-skeleton";
import { useApi, usePaginatedApi, useMonthSelector, useCurrency, useKeyboardShortcuts, KEYBOARD_SHORTCUTS } from "@/hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImportTransactions } from "@/components/import-transactions";
import { ReceiptAttachment, AttachmentIndicator } from "@/components/receipt-attachment";
import { HighlightText } from "@/components/highlight-text";
import { EmptyState } from "@/components/empty-state";
import { NoteAutocomplete } from "@/components/note-autocomplete";

interface TransactionWithCategory extends Transaction {
  category: Pick<Category, "id" | "name" | "type">;
  attachment_count?: number;
}

type FilterType = "all" | "income" | "expense";

export default function TransactionsPage() {
  const { selectedMonth, setSelectedMonth, monthOptions } = useMonthSelector();
  const { formatWithSign } = useCurrency();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  // Fetch categories using the useApi hook
  const { data: categories = [] } = useApi<Category[]>("/api/categories");

  // Fetch saved filters
  const { data: savedFilters = [], refetch: refetchFilters } = useApi<SavedFilter[]>("/api/filters");

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

    // Filter by date range
    if (dateRange.from || dateRange.to) {
      result = result.filter((tx) => {
        if (dateRange.from && tx.date < dateRange.from) return false;
        if (dateRange.to && tx.date > dateRange.to) return false;
        return true;
      });
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
  }, [transactions, filterType, filterCategory, dateRange, searchQuery]);

  // Calculate quick stats for filtered transactions
  const quickStats = useMemo(() => {
    const income = filteredTransactions
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expense = filteredTransactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const net = income - expense;
    const count = filteredTransactions.length;
    const avgTransaction = count > 0 ? (income + expense) / count : 0;

    return { income, expense, net, count, avgTransaction };
  }, [filteredTransactions]);

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
    setDateRange({});
  }, []);

  const hasActiveFilters = searchQuery || filterType !== "all" || filterCategory !== "all" || dateRange.from || dateRange.to;

  // Ref for search input focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected transaction for keyboard navigation
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Bulk selection handlers
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  }, []);

  const toggleSelectTransaction = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    const allIds = filteredTransactions.map((tx) => tx.id);
    setSelectedIds(new Set(allIds));
  }, [filteredTransactions]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`確定要刪除 ${selectedIds.size} 筆交易嗎？此操作無法復原。`)) return;

    try {
      let successCount = 0;
      let failCount = 0;

      for (const id of selectedIds) {
        try {
          const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
          const json = await res.json();
          if (json.error) throw new Error(json.error);
          successCount++;
        } catch {
          failCount++;
        }
      }

      if (failCount === 0) {
        toast.success(`已刪除 ${successCount} 筆交易`);
      } else {
        toast.warning(`刪除完成：成功 ${successCount} 筆，失敗 ${failCount} 筆`);
      }

      setSelectedIds(new Set());
      setSelectionMode(false);
      refetchTransactions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "批次刪除失敗");
    }
  };

  const handleDuplicate = useCallback(
    (tx: TransactionWithCategory) => {
      // Open dialog with duplicated data, but with today's date
      setEditingTransaction(null);
      setFormData({
        type: tx.type,
        category_id: tx.category_id,
        amount: String(tx.amount),
        date: new Date().toISOString().split("T")[0],
        note: tx.note || "",
      });
      setError(null);
      setIsDialogOpen(true);
    },
    []
  );

  const handleSaveAsTemplate = async (tx: TransactionWithCategory) => {
    const name = prompt("請輸入範本名稱：", tx.note || tx.category.name);
    if (!name) return;

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category_id: tx.category_id,
          type: tx.type,
          amount: tx.amount,
          note: tx.note,
        }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);
      toast.success("已儲存為範本");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "儲存範本失敗");
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

  const handleSaveFilter = async () => {
    const name = prompt("請輸入篩選器名稱：");
    if (!name) return;

    try {
      const res = await fetch("/api/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          filter_type: filterType,
          category_id: filterCategory === "all" ? null : filterCategory,
          search_query: searchQuery || null,
        }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);
      refetchFilters();
      toast.success("篩選器已儲存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "儲存篩選器失敗");
    }
  };

  const handleApplyFilter = (filter: SavedFilter) => {
    setFilterType((filter.filter_type as FilterType) || "all");
    setFilterCategory(filter.category_id || "all");
    setSearchQuery(filter.search_query || "");
  };

  const handleDeleteFilter = async (id: string) => {
    try {
      const res = await fetch(`/api/filters/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      refetchFilters();
      toast.success("篩選器已刪除");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "刪除篩選器失敗");
    }
  };

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
      handler: () => {
        if (selectedIndex >= 0) {
          setSelectedIndex(-1);
        } else {
          setIsDialogOpen(false);
        }
      },
    },
    {
      key: "j",
      handler: () => {
        if (filteredTransactions.length > 0) {
          setSelectedIndex((prev) => Math.min(prev + 1, filteredTransactions.length - 1));
        }
      },
    },
    {
      key: "k",
      handler: () => {
        if (selectedIndex > 0) {
          setSelectedIndex((prev) => prev - 1);
        }
      },
    },
    {
      key: "ArrowDown",
      handler: () => {
        if (filteredTransactions.length > 0) {
          setSelectedIndex((prev) => Math.min(prev + 1, filteredTransactions.length - 1));
        }
      },
    },
    {
      key: "ArrowUp",
      handler: () => {
        if (selectedIndex > 0) {
          setSelectedIndex((prev) => prev - 1);
        }
      },
    },
    {
      key: "Enter",
      handler: () => {
        if (selectedIndex >= 0 && selectedIndex < filteredTransactions.length) {
          handleOpenDialog(filteredTransactions[selectedIndex]);
        }
      },
    },
    {
      key: "d",
      handler: () => {
        if (selectedIndex >= 0 && selectedIndex < filteredTransactions.length) {
          handleDuplicate(filteredTransactions[selectedIndex]);
        }
      },
    },
    {
      key: "Delete",
      handler: () => {
        if (selectedIndex >= 0 && selectedIndex < filteredTransactions.length) {
          handleDelete(filteredTransactions[selectedIndex].id);
        }
      },
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">交易紀錄</h1>
        <div className="flex gap-2">
          {selectionMode ? (
            <>
              <span className="text-sm text-muted-foreground self-center">
                已選取 {selectedIds.size} 筆
              </span>
              {selectedIds.size < filteredTransactions.length && (
                <Button variant="outline" size="sm" onClick={selectAllVisible}>
                  全選
                </Button>
              )}
              {selectedIds.size > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    取消全選
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    刪除選取項
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={toggleSelectionMode}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
                <CheckSquare className="h-4 w-4 mr-2" />
                批次操作
              </Button>
              <ImportTransactions onImportComplete={refetchTransactions} />
              {filteredTransactions.length > 0 && (
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  匯出 CSV
                </Button>
              )}
              <Button onClick={() => handleOpenDialog()}>新增交易</Button>
            </>
          )}
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

            {/* Date range filter */}
            <div className="space-y-2">
              <Label>日期範圍</Label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                className="w-full md:w-auto"
              />
            </div>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-4 w-4" />
                清除篩選
              </Button>
            )}

            {/* Saved filters dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Filter className="h-4 w-4" />
                  篩選器
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>已儲存的篩選器</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!savedFilters || savedFilters.length === 0 ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    尚無儲存的篩選器
                  </div>
                ) : (
                  savedFilters.map((filter) => (
                    <DropdownMenuItem
                      key={filter.id}
                      className="flex justify-between items-center group"
                    >
                      <span
                        className="flex-1 cursor-pointer"
                        onClick={() => handleApplyFilter(filter)}
                      >
                        {filter.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFilter(filter.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-600" />
                      </Button>
                    </DropdownMenuItem>
                  ))
                )}
                {hasActiveFilters && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSaveFilter}>
                      <Bookmark className="h-4 w-4 mr-2" />
                      儲存目前篩選
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Summary */}
      {!isLoading && filteredTransactions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              收入
            </div>
            <p className="text-lg font-semibold text-green-600">
              {formatWithSign(quickStats.income, "income")}
            </p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              支出
            </div>
            <p className="text-lg font-semibold text-red-600">
              {formatWithSign(quickStats.expense, "expense")}
            </p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Calculator className="h-4 w-4" />
              淨額
            </div>
            <p className={`text-lg font-semibold ${quickStats.net >= 0 ? "text-green-600" : "text-red-600"}`}>
              {quickStats.net >= 0 ? "+" : ""}{formatWithSign(Math.abs(quickStats.net), quickStats.net >= 0 ? "income" : "expense").replace(/[+-]/, "")}
            </p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Receipt className="h-4 w-4" />
              交易數
            </div>
            <p className="text-lg font-semibold">
              {quickStats.count} 筆
            </p>
          </div>
        </div>
      )}

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
              hasActiveFilters ? (
                <p className="text-center py-8 text-muted-foreground">
                  沒有符合條件的交易
                </p>
              ) : transactions.length === 0 ? (
                <EmptyState type="transactions" onAction={() => handleOpenDialog()} />
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  本月尚無交易紀錄
                </p>
              )
            ) : (
            <div className="space-y-2">
              {filteredTransactions.map((tx, index) => (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                    selectedIds.has(tx.id)
                      ? "bg-primary/10 ring-2 ring-primary"
                      : selectedIndex === index
                      ? "bg-accent ring-2 ring-primary"
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                  onClick={() => {
                    if (selectionMode) {
                      toggleSelectTransaction(tx.id);
                    } else {
                      handleOpenDialog(tx);
                    }
                  }}
                >
                  {selectionMode && (
                    <button
                      className="mr-3 p-1 hover:bg-muted rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectTransaction(tx.id);
                      }}
                    >
                      {selectedIds.has(tx.id) ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={tx.type === "income" ? "default" : "secondary"}>
                        {tx.category.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{tx.date}</span>
                      <AttachmentIndicator count={tx.attachment_count || 0} />
                    </div>
                    {tx.note && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <HighlightText text={tx.note} highlight={searchQuery} />
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        tx.type === "income" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatWithSign(tx.amount, tx.type)}
                    </span>
                    {!selectionMode && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="複製交易"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(tx);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="儲存為範本"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveAsTemplate(tx);
                          }}
                        >
                          <Bookmark className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          title="刪除"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(tx.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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
              <NoteAutocomplete
                value={formData.note}
                onChange={(note) => setFormData({ ...formData, note })}
                categoryId={formData.category_id}
                placeholder="輸入備註..."
              />
            </div>
            {/* Receipt attachments - only shown when editing existing transaction */}
            {editingTransaction && (
              <div className="space-y-2">
                <Label>收據附件</Label>
                <ReceiptAttachment
                  transactionId={editingTransaction.id}
                  onAttachmentsChange={(count) => {
                    // Update the attachment count in the transaction list
                    if (editingTransaction) {
                      editingTransaction.attachment_count = count;
                    }
                  }}
                />
              </div>
            )}
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
