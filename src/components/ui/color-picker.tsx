"use client";

import { useState, useMemo } from "react";
import { Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

// Organized color palette with semantic groupings
const COLOR_GROUPS = {
  "基本": [
    { color: "#ef4444", name: "紅色" },
    { color: "#f97316", name: "橙色" },
    { color: "#f59e0b", name: "琥珀" },
    { color: "#eab308", name: "黃色" },
    { color: "#84cc16", name: "萊姆" },
    { color: "#22c55e", name: "綠色" },
  ],
  "冷色": [
    { color: "#10b981", name: "翡翠" },
    { color: "#14b8a6", name: "藍綠" },
    { color: "#06b6d4", name: "青色" },
    { color: "#0ea5e9", name: "天藍" },
    { color: "#3b82f6", name: "藍色" },
    { color: "#6366f1", name: "靛藍" },
  ],
  "暖色": [
    { color: "#8b5cf6", name: "紫羅蘭" },
    { color: "#a855f7", name: "紫色" },
    { color: "#d946ef", name: "洋紅" },
    { color: "#ec4899", name: "粉紅" },
    { color: "#f43f5e", name: "玫瑰" },
    { color: "#78716c", name: "石灰" },
  ],
};

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
  className?: string;
  showPreview?: boolean;
  previewLabel?: string;
}

export function ColorPicker({ value, onChange, className, showPreview, previewLabel }: ColorPickerProps) {
  const [open, setOpen] = useState(false);

  // Find color name if it matches a preset
  const colorName = useMemo(() => {
    for (const group of Object.values(COLOR_GROUPS)) {
      const found = group.find(c => c.color.toLowerCase() === value?.toLowerCase());
      if (found) return found.name;
    }
    return null;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start gap-2", className)}
        >
          <div
            className="w-5 h-5 rounded border shrink-0"
            style={{ backgroundColor: value || "#e5e7eb" }}
          />
          <span className="flex-1 text-left truncate">
            {colorName || (value ? value.toUpperCase() : "選擇顏色")}
          </span>
          <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-4">
          {/* Preview */}
          {showPreview && value && (
            <div
              className="h-12 rounded-lg flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: value }}
            >
              {previewLabel || "預覽"}
            </div>
          )}

          {/* Color groups */}
          {Object.entries(COLOR_GROUPS).map(([groupName, colors]) => (
            <div key={groupName} className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">{groupName}</p>
              <div className="grid grid-cols-6 gap-2">
                {colors.map(({ color, name }) => (
                  <button
                    key={color}
                    title={name}
                    className={cn(
                      "w-8 h-8 rounded-md border-2 transition-all hover:scale-110 relative",
                      value?.toLowerCase() === color.toLowerCase()
                        ? "border-foreground ring-2 ring-offset-2 ring-primary"
                        : "border-transparent hover:border-muted-foreground/30"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      onChange(color);
                      setOpen(false);
                    }}
                  >
                    {value?.toLowerCase() === color.toLowerCase() && (
                      <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Custom color section */}
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-muted-foreground font-medium">自訂顏色</p>
            <div className="flex gap-2">
              <input
                type="color"
                value={value || "#10b981"}
                onChange={(e) => onChange(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border"
              />
              <input
                type="text"
                value={value || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                    onChange(val || null);
                  }
                }}
                placeholder="#000000"
                className="flex-1 px-3 rounded border text-sm font-mono"
              />
            </div>
          </div>

          {value && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              清除顏色
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
