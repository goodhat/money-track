"use client";

import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportResult {
  total: number;
  imported: number;
  errors: number;
  errorDetails: string[];
}

interface ParsedRow {
  date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note?: string;
}

function parseCSV(content: string): ParsedRow[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  // Parse header row
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const dateIdx = header.findIndex((h) => h.includes("date") || h.includes("日期"));
  const typeIdx = header.findIndex((h) => h.includes("type") || h.includes("類型"));
  const categoryIdx = header.findIndex((h) => h.includes("category") || h.includes("分類"));
  const amountIdx = header.findIndex((h) => h.includes("amount") || h.includes("金額"));
  const noteIdx = header.findIndex((h) => h.includes("note") || h.includes("備註"));

  if (dateIdx === -1 || typeIdx === -1 || categoryIdx === -1 || amountIdx === -1) {
    throw new Error("CSV must have date, type, category, and amount columns");
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (doesn't handle quoted fields with commas)
    const values = line.split(",").map((v) => v.trim());

    const dateVal = values[dateIdx] || "";
    const typeVal = values[typeIdx]?.toLowerCase() || "";
    const categoryVal = values[categoryIdx] || "";
    const amountVal = parseFloat(values[amountIdx]?.replace(/[^\d.-]/g, "") || "0");
    const noteVal = noteIdx !== -1 ? values[noteIdx] : undefined;

    // Normalize type
    let type: "income" | "expense" = "expense";
    if (typeVal.includes("income") || typeVal.includes("收入")) {
      type = "income";
    } else if (typeVal.includes("expense") || typeVal.includes("支出")) {
      type = "expense";
    }

    rows.push({
      date: dateVal,
      type,
      category: categoryVal,
      amount: Math.abs(amountVal),
      note: noteVal,
    });
  }

  return rows;
}

interface ImportTransactionsProps {
  onImportComplete?: () => void;
}

export function ImportTransactions({ onImportComplete }: ImportTransactionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setParseError(null);

    try {
      const content = await selectedFile.text();
      const parsed = parseCSV(content);
      setPreview(parsed.slice(0, 5)); // Show first 5 rows as preview
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse CSV");
      setPreview([]);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setResult(null);

    try {
      const content = await file.text();
      const parsed = parseCSV(content);

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: parsed }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setResult(json.data);

      if (json.data.imported > 0) {
        toast.success(`已匯入 ${json.data.imported} 筆交易`);
        onImportComplete?.();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "匯入失敗");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setFile(null);
    setPreview([]);
    setResult(null);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          匯入 CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>匯入交易資料</DialogTitle>
          <DialogDescription>
            上傳 CSV 檔案以批次匯入交易紀錄
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File input */}
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <FileText className="h-4 w-4 mr-2" />
              選擇檔案
            </Button>
            {file && (
              <span className="text-sm text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>

          {/* Format info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              CSV 檔案需包含以下欄位：date (YYYY-MM-DD), type (income/expense), category, amount, note (選填)
            </AlertDescription>
          </Alert>

          {/* Parse error */}
          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 text-sm font-medium">
                預覽 (前 5 筆)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left">日期</th>
                      <th className="px-4 py-2 text-left">類型</th>
                      <th className="px-4 py-2 text-left">分類</th>
                      <th className="px-4 py-2 text-right">金額</th>
                      <th className="px-4 py-2 text-left">備註</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2">{row.date}</td>
                        <td className="px-4 py-2">
                          <span className={row.type === "income" ? "text-green-600" : "text-red-600"}>
                            {row.type === "income" ? "收入" : "支出"}
                          </span>
                        </td>
                        <td className="px-4 py-2">{row.category}</td>
                        <td className="px-4 py-2 text-right">{row.amount.toLocaleString()}</td>
                        <td className="px-4 py-2 text-muted-foreground">{row.note || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <Alert variant={result.errors > 0 ? "default" : "default"}>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p>總計 {result.total} 筆，成功匯入 {result.imported} 筆，失敗 {result.errors} 筆</p>
                  {result.errorDetails.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-2">
                      <p className="font-medium">錯誤詳情：</p>
                      <ul className="list-disc list-inside">
                        {result.errorDetails.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            {result ? "關閉" : "取消"}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={!file || parseError !== null || isImporting}
            >
              {isImporting ? "匯入中..." : "開始匯入"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
