"use client";

import { Fragment, useMemo } from "react";

interface HighlightTextProps {
  text: string;
  highlight: string;
  className?: string;
  highlightClassName?: string;
}

export function HighlightText({
  text,
  highlight,
  className = "",
  highlightClassName = "bg-yellow-200 dark:bg-yellow-800 rounded px-0.5",
}: HighlightTextProps) {
  const parts = useMemo(() => {
    if (!highlight.trim()) {
      return [{ text, isMatch: false }];
    }

    const regex = new RegExp(`(${escapeRegExp(highlight)})`, "gi");
    const splitParts = text.split(regex);

    return splitParts
      .filter((part) => part !== "")
      .map((part) => ({
        text: part,
        isMatch: part.toLowerCase() === highlight.toLowerCase(),
      }));
  }, [text, highlight]);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.isMatch ? (
          <mark key={index} className={highlightClassName}>
            {part.text}
          </mark>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        )
      )}
    </span>
  );
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
