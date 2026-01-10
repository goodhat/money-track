"use client";

import { ReactNode } from "react";
import Link from "next/link";
import {
  Receipt,
  PiggyBank,
  Target,
  Wallet,
  FileText,
  TrendingUp,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type: "transactions" | "goals" | "templates" | "insights" | "categories" | "budget";
  onAction?: () => void;
}

interface EmptyStateConfig {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  tips?: string[];
}

const configs: Record<EmptyStateProps["type"], EmptyStateConfig> = {
  transactions: {
    icon: <Receipt className="h-16 w-16 text-muted-foreground/50" />,
    title: "尚無交易紀錄",
    description: "開始記錄您的第一筆收入或支出",
    actionLabel: "新增交易",
    tips: [
      "按 N 快速新增交易",
      "可以匯入 CSV 檔案批次新增",
      "建立範本讓重複交易更方便",
    ],
  },
  goals: {
    icon: <Target className="h-16 w-16 text-muted-foreground/50" />,
    title: "尚無儲蓄目標",
    description: "設定目標，追蹤您的儲蓄進度",
    actionLabel: "建立目標",
    tips: [
      "設定明確的目標金額和日期",
      "定期記錄進度保持動力",
      "將大目標拆分成小階段",
    ],
  },
  templates: {
    icon: <FileText className="h-16 w-16 text-muted-foreground/50" />,
    title: "尚無交易範本",
    description: "建立範本讓重複性交易更方便",
    actionLabel: "建立範本",
    tips: [
      "適合固定支出如房租、水電費",
      "可設定週期自動提醒",
      "從現有交易直接儲存為範本",
    ],
  },
  insights: {
    icon: <TrendingUp className="h-16 w-16 text-muted-foreground/50" />,
    title: "資料不足",
    description: "記錄更多交易以獲得財務分析",
    actionLabel: "新增交易",
    actionHref: "/transactions",
    tips: [
      "建議至少記錄一個月的資料",
      "分類越準確，分析越有價值",
      "持續記錄能看見趨勢變化",
    ],
  },
  categories: {
    icon: <Wallet className="h-16 w-16 text-muted-foreground/50" />,
    title: "尚無自訂分類",
    description: "建立專屬分類更好管理支出",
    actionLabel: "新增分類",
    tips: [
      "系統預設了常用分類",
      "可為分類設定顏色便於識別",
      "建議根據生活習慣調整",
    ],
  },
  budget: {
    icon: <PiggyBank className="h-16 w-16 text-muted-foreground/50" />,
    title: "尚未設定預算",
    description: "設定預算幫助您控制支出",
    actionLabel: "設定預算",
    actionHref: "/settings",
    tips: [
      "建議預算不超過收入的 80%",
      "可為各分類設定個別預算",
      "定期檢視預算執行狀況",
    ],
  },
};

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const config = configs[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* Decorative background circles */}
      <div className="relative">
        <div className="absolute -inset-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-full blur-2xl" />
        <div className="relative bg-muted/50 rounded-full p-6">
          {config.icon}
        </div>
      </div>

      <h3 className="mt-6 text-lg font-semibold">{config.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
        {config.description}
      </p>

      {config.actionLabel && (
        <div className="mt-6">
          {config.actionHref ? (
            <Button asChild>
              <Link href={config.actionHref}>
                <Plus className="h-4 w-4 mr-2" />
                {config.actionLabel}
              </Link>
            </Button>
          ) : onAction ? (
            <Button onClick={onAction}>
              <Plus className="h-4 w-4 mr-2" />
              {config.actionLabel}
            </Button>
          ) : null}
        </div>
      )}

      {config.tips && config.tips.length > 0 && (
        <div className="mt-8 w-full max-w-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 text-center">
            小提示
          </p>
          <ul className="space-y-2">
            {config.tips.map((tip, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="text-primary mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
