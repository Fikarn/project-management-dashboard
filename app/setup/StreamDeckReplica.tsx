"use client";

import { DeckControl, DeckPage, getPhysicalDials, getDialInteractions } from "./deckConfig";

interface StreamDeckReplicaProps {
  page: DeckPage;
  selectedControlId: string | null;
  onSelectControl: (control: DeckControl) => void;
  testResults: Record<string, "success" | "error">;
}

export default function StreamDeckReplica({
  page,
  selectedControlId,
  onSelectControl,
  testResults,
}: StreamDeckReplicaProps) {
  const physicalDials = getPhysicalDials(page);

  return (
    <div className="rounded-card border border-studio-750 bg-studio-900 p-6 shadow-modal">
      {/* Buttons: 2 rows of 4 */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        {page.buttons.map((btn) => {
          const isSelected = selectedControlId === btn.id;
          const isEmpty = !btn.label;
          const result = testResults[btn.id];

          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => !isEmpty && onSelectControl(btn)}
              disabled={isEmpty}
              aria-pressed={isSelected}
              aria-label={btn.label || "Empty slot"}
              className={`relative flex aspect-square items-center justify-center rounded-card p-2 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${isEmpty ? "cursor-default bg-studio-850/40" : "cursor-pointer bg-studio-850 hover:bg-studio-750"} ${isSelected ? "bg-studio-750 ring-2 ring-accent-blue" : ""} ${btn.isPageNav ? "border border-accent-blue/50" : "border border-studio-750"} `}
            >
              <span
                className={`text-xs font-medium leading-tight ${
                  isEmpty ? "text-studio-500" : btn.isPageNav ? "text-accent-blue" : "text-studio-200"
                }`}
              >
                {btn.label || "—"}
              </span>
              {result && (
                <span
                  aria-label={result === "success" ? "Test succeeded" : "Test failed"}
                  className={`absolute right-1 top-1 h-2 w-2 rounded-full ${
                    result === "success" ? "bg-accent-green" : "bg-red-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* LCD Strip */}
      <div
        className="mb-4 h-1.5 rounded-full bg-gradient-to-r from-accent-blue/30 via-accent-cyan/30 to-accent-blue/30"
        aria-hidden="true"
      />

      {/* Dials */}
      <div className="grid grid-cols-4 gap-3">
        {physicalDials.map((pos) => {
          const interactions = getDialInteractions(page, pos);
          const pressControl = interactions.find((d) => d.type === "dial-press");
          const isEmpty = !pressControl?.label;
          const isSelected = interactions.some((d) => selectedControlId === d.id);
          const result = pressControl ? testResults[pressControl.id] : undefined;

          return (
            <button
              key={`dial-${pos}`}
              type="button"
              onClick={() => {
                if (!isEmpty && pressControl) onSelectControl(pressControl);
              }}
              disabled={isEmpty}
              aria-pressed={isSelected}
              aria-label={pressControl?.label ? `Dial ${pos}: ${pressControl.label}` : `Dial ${pos} empty`}
              className={`relative flex aspect-square items-center justify-center rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${isEmpty ? "cursor-default border-studio-750/50 bg-studio-850/40" : "cursor-pointer border-studio-600 bg-studio-850 hover:bg-studio-750"} border-2 ${isSelected ? "bg-studio-750 ring-2 ring-accent-blue" : ""} `}
            >
              {/* Dial notch */}
              <div
                className="absolute left-1/2 top-1 h-2 w-1 -translate-x-1/2 rounded-full bg-studio-600"
                aria-hidden="true"
              />
              <span className={`text-xs font-medium ${isEmpty ? "text-studio-500" : "text-studio-300"}`}>
                {pressControl?.label || "—"}
              </span>
              {result && (
                <span
                  aria-label={result === "success" ? "Test succeeded" : "Test failed"}
                  className={`absolute right-0 top-0 h-2 w-2 rounded-full ${
                    result === "success" ? "bg-accent-green" : "bg-red-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
