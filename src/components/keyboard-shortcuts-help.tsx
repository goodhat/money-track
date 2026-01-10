"use client";

import { useState, useEffect } from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ShortcutInfo {
  keys: string[];
  description: string;
  context?: string;
}

const SHORTCUTS: ShortcutInfo[] = [
  { keys: ["N"], description: "新增交易", context: "交易頁面" },
  { keys: ["/"], description: "搜尋", context: "交易頁面" },
  { keys: ["Ctrl", "E"], description: "匯出 CSV", context: "交易頁面" },
  { keys: ["Esc"], description: "關閉對話框 / 取消選取", context: "全域" },
  { keys: ["J"], description: "向下選取", context: "交易頁面" },
  { keys: ["K"], description: "向上選取", context: "交易頁面" },
  { keys: ["↓"], description: "向下選取", context: "交易頁面" },
  { keys: ["↑"], description: "向上選取", context: "交易頁面" },
  { keys: ["Enter"], description: "編輯選取項目", context: "交易頁面" },
  { keys: ["D"], description: "複製選取的交易", context: "交易頁面" },
  { keys: ["Delete"], description: "刪除選取的交易", context: "交易頁面" },
  { keys: ["?"], description: "顯示快捷鍵說明", context: "全域" },
];

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="快捷鍵說明 (?)">
          <Keyboard className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>鍵盤快捷鍵</DialogTitle>
          <DialogDescription>
            使用快捷鍵加速您的操作
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {/* Group by context */}
          {["全域", "交易頁面"].map((context) => {
            const contextShortcuts = SHORTCUTS.filter((s) => s.context === context);
            if (contextShortcuts.length === 0) return null;

            return (
              <div key={context}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {context}
                </h4>
                <div className="space-y-2">
                  {contextShortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <kbd
                            key={keyIdx}
                            className="px-2 py-1 text-xs font-semibold bg-muted border rounded shadow-sm"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
          按 <kbd className="px-1.5 py-0.5 bg-muted border rounded text-xs">?</kbd> 隨時開啟此說明
        </div>
      </DialogContent>
    </Dialog>
  );
}
