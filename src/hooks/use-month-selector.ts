import { useState, useMemo, useCallback } from "react";

interface MonthOption {
  value: string; // YYYY-MM format
  label: string; // Human-readable format in Chinese
}

interface UseMonthSelectorOptions {
  defaultMonth?: string; // YYYY-MM format
  monthsBack?: number;
  monthsForward?: number;
}

interface UseMonthSelectorResult {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  monthOptions: MonthOption[];
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

/**
 * A hook for managing month selection with navigation controls
 *
 * @param options - Configuration options
 * @returns Object containing selected month state and navigation controls
 */
export function useMonthSelector(
  options: UseMonthSelectorOptions = {}
): UseMonthSelectorResult {
  const { monthsBack = 12, monthsForward = 0 } = options;

  const getCurrentMonth = useCallback(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(
    options.defaultMonth || getCurrentMonth()
  );

  const monthOptions = useMemo(() => {
    const options: MonthOption[] = [];
    const now = new Date();

    // Generate future months first (if any)
    for (let i = monthsForward; i > 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
      options.push({ value, label });
    }

    // Generate current and past months
    for (let i = 0; i <= monthsBack; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
      options.push({ value, label });
    }

    return options;
  }, [monthsBack, monthsForward]);

  const currentIndex = useMemo(() => {
    return monthOptions.findIndex((opt) => opt.value === selectedMonth);
  }, [monthOptions, selectedMonth]);

  const canGoBack = currentIndex < monthOptions.length - 1;
  const canGoForward = currentIndex > 0;

  const goToPreviousMonth = useCallback(() => {
    if (canGoBack) {
      setSelectedMonth(monthOptions[currentIndex + 1].value);
    }
  }, [canGoBack, monthOptions, currentIndex]);

  const goToNextMonth = useCallback(() => {
    if (canGoForward) {
      setSelectedMonth(monthOptions[currentIndex - 1].value);
    }
  }, [canGoForward, monthOptions, currentIndex]);

  return {
    selectedMonth,
    setSelectedMonth,
    monthOptions,
    goToPreviousMonth,
    goToNextMonth,
    canGoBack,
    canGoForward,
  };
}
