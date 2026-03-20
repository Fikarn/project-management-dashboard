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
    <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-xl">
      {/* Buttons: 2 rows of 4 */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        {page.buttons.map((btn) => {
          const isSelected = selectedControlId === btn.id;
          const isEmpty = !btn.label;
          const result = testResults[btn.id];

          return (
            <button
              key={btn.id}
              onClick={() => !isEmpty && onSelectControl(btn)}
              className={`relative flex aspect-square items-center justify-center rounded-lg p-2 text-center transition-all ${isEmpty ? "cursor-default bg-gray-800/40" : "hover:bg-gray-750 cursor-pointer bg-gray-800"} ${isSelected ? "bg-gray-700 ring-2 ring-blue-500" : ""} ${btn.isPageNav ? "border border-indigo-500/50" : "border border-gray-700"} `}
            >
              <span
                className={`text-xs font-medium leading-tight ${
                  isEmpty ? "text-gray-700" : btn.isPageNav ? "text-indigo-300" : "text-gray-200"
                }`}
              >
                {btn.label || "—"}
              </span>
              {result && (
                <span
                  className={`absolute right-1 top-1 h-2 w-2 rounded-full ${
                    result === "success" ? "bg-green-500" : "bg-red-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* LCD Strip */}
      <div className="mb-4 h-1.5 rounded-full bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-blue-600/30" />

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
              onClick={() => {
                if (!isEmpty && pressControl) onSelectControl(pressControl);
              }}
              className={`relative flex aspect-square items-center justify-center rounded-full transition-all ${isEmpty ? "cursor-default border-gray-700/50 bg-gray-800/40" : "hover:bg-gray-750 cursor-pointer border-gray-600 bg-gray-800"} border-2 ${isSelected ? "bg-gray-700 ring-2 ring-blue-500" : ""} `}
            >
              {/* Dial notch */}
              <div className="absolute left-1/2 top-1 h-2 w-1 -translate-x-1/2 rounded-full bg-gray-600" />
              <span className={`text-xs font-medium ${isEmpty ? "text-gray-700" : "text-gray-300"}`}>
                {pressControl?.label || "—"}
              </span>
              {result && (
                <span
                  className={`absolute right-0 top-0 h-2 w-2 rounded-full ${
                    result === "success" ? "bg-green-500" : "bg-red-500"
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
