"use client";

import { useState } from "react";
import { Settings, GripVertical, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { WidgetType } from "@/types/database";
import { usePreferences } from "@/hooks";

const WIDGET_INFO: Record<WidgetType, { label: string; description: string }> = {
  budget: { label: "預算進度", description: "顯示本月預算使用狀況" },
  summary: { label: "收支摘要", description: "顯示本月收入、支出與淨收支" },
  chart: { label: "收支圖表", description: "顯示收入與支出的視覺比較" },
  category: { label: "分類支出", description: "顯示各分類支出分佈" },
  transactions: { label: "最近交易", description: "顯示最近的交易紀錄" },
  streaks: { label: "習慣追蹤", description: "顯示連續記帳與預算達標紀錄" },
};

const ALL_WIDGETS: WidgetType[] = ["budget", "summary", "chart", "category", "transactions", "streaks"];

export function WidgetCustomizer() {
  const { preferences, updateWidgets, isLoading } = usePreferences();
  const [isOpen, setIsOpen] = useState(false);
  const [localWidgets, setLocalWidgets] = useState<WidgetType[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpen = (open: boolean) => {
    if (open) {
      setLocalWidgets([...preferences.dashboard_widgets]);
    }
    setIsOpen(open);
  };

  const toggleWidget = (widget: WidgetType) => {
    setLocalWidgets((prev) => {
      if (prev.includes(widget)) {
        return prev.filter((w) => w !== widget);
      }
      return [...prev, widget];
    });
  };

  const moveWidget = (index: number, direction: "up" | "down") => {
    const newWidgets = [...localWidgets];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newWidgets.length) return;

    [newWidgets[index], newWidgets[newIndex]] = [newWidgets[newIndex], newWidgets[index]];
    setLocalWidgets(newWidgets);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateWidgets(localWidgets);
    setIsSaving(false);

    if (success) {
      toast.success("Dashboard 設定已儲存");
      setIsOpen(false);
    } else {
      toast.error("儲存失敗");
    }
  };

  const resetToDefault = () => {
    setLocalWidgets([...ALL_WIDGETS]);
  };

  if (isLoading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="自訂 Dashboard">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>自訂 Dashboard</DialogTitle>
          <DialogDescription>
            選擇要顯示的區塊，並拖曳調整順序
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Enabled widgets (ordered) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">顯示的區塊</Label>
            {localWidgets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">尚未選擇任何區塊</p>
            ) : (
              <div className="space-y-1">
                {localWidgets.map((widget, index) => (
                  <div
                    key={widget}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{WIDGET_INFO[widget].label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveWidget(index, "up")}
                        disabled={index === 0}
                      >
                        <span className="text-xs">↑</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => moveWidget(index, "down")}
                        disabled={index === localWidgets.length - 1}
                      >
                        <span className="text-xs">↓</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => toggleWidget(widget)}
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Disabled widgets */}
          {ALL_WIDGETS.filter((w) => !localWidgets.includes(w)).length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">隱藏的區塊</Label>
              <div className="space-y-1">
                {ALL_WIDGETS.filter((w) => !localWidgets.includes(w)).map((widget) => (
                  <div
                    key={widget}
                    className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg opacity-60"
                  >
                    <div className="flex-1">
                      <span className="text-sm">{WIDGET_INFO[widget].label}</span>
                      <p className="text-xs text-muted-foreground">{WIDGET_INFO[widget].description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggleWidget(widget)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={resetToDefault}>
            重設預設
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "儲存中..." : "儲存"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
