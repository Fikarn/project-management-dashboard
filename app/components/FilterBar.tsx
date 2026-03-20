"use client";

import { useRef } from "react";
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
    <div className="mb-4 flex items-center gap-3">
      <div className="relative max-w-xs flex-1">
        <svg
          className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          id="search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search projects, tasks, labels..."
          className="w-full rounded border border-gray-700 bg-gray-800 py-1.5 pl-8 pr-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">Sort:</span>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="rounded border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
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
