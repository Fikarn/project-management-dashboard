"use client";

import { useRef } from "react";
import { Search, X } from "lucide-react";
import type { SortOption, ViewFilter } from "@/lib/types";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  filter: ViewFilter;
  onFilterChange: (filter: ViewFilter) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "priority", label: "Priority" },
  { value: "date", label: "Last Updated" },
  { value: "name", label: "Name" },
];

const FILTER_CHIPS: { value: ViewFilter; label: string; shortcut: string }[] = [
  { value: "all", label: "All", shortcut: "0" },
  { value: "todo", label: "To Do", shortcut: "1" },
  { value: "in-progress", label: "In Progress", shortcut: "2" },
  { value: "blocked", label: "Blocked", shortcut: "3" },
  { value: "done", label: "Done", shortcut: "4" },
];

export default function FilterBar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filter,
  onFilterChange,
}: FilterBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-studio-750 pb-4">
      <div className="relative max-w-xs flex-1">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-studio-500" aria-hidden="true" />
        <input
          ref={inputRef}
          id="search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search projects, tasks, labels..."
          aria-label="Search projects, tasks, and labels"
          className="w-full !py-1.5 !pl-8 !pr-3"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-studio-500 transition-colors hover:text-studio-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <div role="group" aria-label="Filter projects by status" className="flex flex-wrap items-center gap-1">
        {FILTER_CHIPS.map((chip) => {
          const isActive = filter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => onFilterChange(chip.value)}
              aria-pressed={isActive}
              aria-keyshortcuts={chip.shortcut}
              className={`rounded-pill px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
                isActive
                  ? "bg-accent-blue text-studio-950"
                  : "bg-studio-800 text-studio-300 hover:bg-studio-700 hover:text-studio-100"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <label htmlFor="filter-bar-sort" className="text-xs text-studio-500">
          Sort:
        </label>
        <select
          id="filter-bar-sort"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          aria-label="Sort order"
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
