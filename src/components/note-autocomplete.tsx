"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NoteAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  categoryId?: string;
  placeholder?: string;
  className?: string;
}

interface NoteSuggestion {
  note: string;
  count: number;
}

export function NoteAutocomplete({
  value,
  onChange,
  categoryId,
  placeholder = "備註（選填）",
  className,
}: NoteAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<NoteSuggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<NoteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions when category changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const url = categoryId
          ? `/api/transactions/suggestions?category_id=${categoryId}`
          : `/api/transactions/suggestions`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.data) {
          setSuggestions(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch note suggestions:", err);
      }
    };

    fetchSuggestions();
  }, [categoryId]);

  // Filter suggestions based on input
  useEffect(() => {
    if (!value.trim()) {
      setFilteredSuggestions(suggestions.slice(0, 5));
    } else {
      const query = value.toLowerCase();
      const filtered = suggestions
        .filter((s) => s.note.toLowerCase().includes(query))
        .slice(0, 5);
      setFilteredSuggestions(filtered);
    }
    setSelectedIndex(-1);
  }, [value, suggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || filteredSuggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
            e.preventDefault();
            onChange(filteredSuggestions[selectedIndex].note);
            setShowSuggestions(false);
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          break;
      }
    },
    [showSuggestions, filteredSuggestions, selectedIndex, onChange]
  );

  const handleSelect = (note: string) => {
    onChange(note);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg overflow-hidden"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion.note}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                "flex items-center justify-between",
                index === selectedIndex && "bg-accent"
              )}
              onClick={() => handleSelect(suggestion.note)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="truncate">{suggestion.note}</span>
              <span className="text-xs text-muted-foreground ml-2 shrink-0">
                {suggestion.count}x
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
