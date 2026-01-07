import { format } from "date-fns";

interface ExportTransaction {
  id: string;
  date: string;
  type: "income" | "expense";
  category: { name: string } | null;
  amount: number;
  note: string | null;
}

/**
 * Converts transactions to CSV format and triggers download
 */
export function exportTransactionsToCSV(
  transactions: ExportTransaction[],
  filename?: string
) {
  // Define CSV headers
  const headers = ["日期", "類型", "分類", "金額", "備註"];

  // Convert transactions to CSV rows
  const rows = transactions.map((tx) => [
    tx.date,
    tx.type === "income" ? "收入" : "支出",
    tx.category?.name || "未分類",
    String(tx.amount),
    tx.note || "",
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  // Add BOM for Excel compatibility with Chinese characters
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

  // Generate filename with current date if not provided
  const defaultFilename = `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`;

  // Create download link and trigger download
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename || defaultFilename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formats transactions data for copying to clipboard
 */
export function formatTransactionsForClipboard(
  transactions: ExportTransaction[]
): string {
  const headers = ["日期", "類型", "分類", "金額", "備註"];
  const rows = transactions.map((tx) => [
    tx.date,
    tx.type === "income" ? "收入" : "支出",
    tx.category?.name || "未分類",
    String(tx.amount),
    tx.note || "",
  ]);

  return [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
}

/**
 * Copies transactions data to clipboard
 */
export async function copyTransactionsToClipboard(
  transactions: ExportTransaction[]
): Promise<boolean> {
  try {
    const text = formatTransactionsForClipboard(transactions);
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
