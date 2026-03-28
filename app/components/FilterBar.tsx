"use client";

import { useRef } from "react";
import { Search, X } from "lucide-react";
import type { SortOption } from "@/lib/types";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "priority", label: "Priority" },
  { value: "date", label: "Last Updated" },
  { value: "name", label: "Name" },
];

export default function FilterBar({ searchQuery, onSearchChange, sortBy, onSortChange }: FilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mb-5 flex items-center gap-3 border-b border-studio-750 pb-4">
      <div className="relative max-w-xs flex-1">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-studio-500" />
        <input
          ref={inputRef}
          id="search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search projects, tasks, labels..."
          className="w-full !py-1.5 !pl-8 !pr-3"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-studio-500 transition-colors hover:text-studio-300"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-studio-500">Sort:</span>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="!px-2 !py-1.5 !text-xs"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
