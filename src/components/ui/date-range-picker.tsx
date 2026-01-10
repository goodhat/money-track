"use client";

import * as React from "react";
import { format, parse, isValid, startOfMonth, endOfMonth } from "date-fns";
import { zhTW } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  value?: {
    from?: string; // YYYY-MM-DD format
    to?: string;   // YYYY-MM-DD format
  };
  onChange?: (range: { from?: string; to?: string }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "選擇日期範圍",
  className,
  disabled = false,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse string dates to Date objects
  const dateRange: DateRange | undefined = React.useMemo(() => {
    const from = value?.from ? parse(value.from, "yyyy-MM-dd", new Date()) : undefined;
    const to = value?.to ? parse(value.to, "yyyy-MM-dd", new Date()) : undefined;

    return {
      from: from && isValid(from) ? from : undefined,
      to: to && isValid(to) ? to : undefined,
    };
  }, [value]);

  // Handle date range selection
  const handleSelect = React.useCallback(
    (range: DateRange | undefined) => {
      if (onChange) {
        onChange({
          from: range?.from ? format(range.from, "yyyy-MM-dd") : undefined,
          to: range?.to ? format(range.to, "yyyy-MM-dd") : undefined,
        });
      }
    },
    [onChange]
  );

  // Quick select options
  const handleQuickSelect = React.useCallback(
    (option: "thisMonth" | "lastMonth" | "last7Days" | "last30Days") => {
      const today = new Date();
      let from: Date;
      let to: Date = today;

      switch (option) {
        case "thisMonth":
          from = startOfMonth(today);
          to = endOfMonth(today);
          break;
        case "lastMonth": {
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          from = startOfMonth(lastMonth);
          to = endOfMonth(lastMonth);
          break;
        }
        case "last7Days":
          from = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
          break;
        case "last30Days":
          from = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
          break;
      }

      if (onChange) {
        onChange({
          from: format(from, "yyyy-MM-dd"),
          to: format(to, "yyyy-MM-dd"),
        });
      }
      setOpen(false);
    },
    [onChange]
  );

  const displayValue = React.useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, "M/d", { locale: zhTW })} - ${format(dateRange.to, "M/d", { locale: zhTW })}`;
    }
    if (dateRange?.from) {
      return `${format(dateRange.from, "M/d", { locale: zhTW })} - `;
    }
    return null;
  }, [dateRange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            !displayValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r p-2 space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm"
              onClick={() => handleQuickSelect("last7Days")}
            >
              過去 7 天
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm"
              onClick={() => handleQuickSelect("last30Days")}
            >
              過去 30 天
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm"
              onClick={() => handleQuickSelect("thisMonth")}
            >
              本月
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm"
              onClick={() => handleQuickSelect("lastMonth")}
            >
              上月
            </Button>
            {(value?.from || value?.to) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm text-muted-foreground"
                onClick={() => {
                  if (onChange) onChange({});
                  setOpen(false);
                }}
              >
                清除
              </Button>
            )}
          </div>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleSelect}
            defaultMonth={dateRange?.from || new Date()}
            locale={zhTW}
            numberOfMonths={1}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
