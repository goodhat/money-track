import { useCallback, useMemo } from "react";

interface UseCurrencyOptions {
  currency?: string;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

interface UseCurrencyResult {
  format: (amount: number) => string;
  formatWithSign: (amount: number, type: "income" | "expense") => string;
  parse: (value: string) => number;
}

/**
 * A hook for formatting and parsing currency values
 *
 * @param options - Configuration options for currency formatting
 * @returns Object containing format and parse functions
 */
export function useCurrency(
  options: UseCurrencyOptions = {}
): UseCurrencyResult {
  const {
    currency = "TWD",
    locale = "zh-TW",
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = options;

  const formatter = useMemo(() => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    });
  }, [locale, currency, minimumFractionDigits, maximumFractionDigits]);

  const format = useCallback(
    (amount: number) => {
      return formatter.format(amount);
    },
    [formatter]
  );

  const formatWithSign = useCallback(
    (amount: number, type: "income" | "expense") => {
      const formatted = formatter.format(amount);
      return type === "income" ? `+${formatted}` : `-${formatted}`;
    },
    [formatter]
  );

  const parse = useCallback(
    (value: string) => {
      // Remove currency symbols and commas, then parse
      const cleaned = value.replace(/[^\d.-]/g, "");
      return parseFloat(cleaned) || 0;
    },
    []
  );

  return { format, formatWithSign, parse };
}
