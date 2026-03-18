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
    <div className="bg-gray-900 rounded-2xl p-6 shadow-xl border border-gray-700">
      {/* Buttons: 2 rows of 4 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {page.buttons.map((btn) => {
          const isSelected = selectedControlId === btn.id;
          const isEmpty = !btn.label;
          const result = testResults[btn.id];

          return (
            <button
              key={btn.id}
              onClick={() => !isEmpty && onSelectControl(btn)}
              className={`
                relative aspect-square rounded-lg flex items-center justify-center text-center p-2 transition-all
                ${isEmpty ? "bg-gray-800/40 cursor-default" : "bg-gray-800 hover:bg-gray-750 cursor-pointer"}
                ${isSelected ? "ring-2 ring-blue-500 bg-gray-700" : ""}
                ${btn.isPageNav ? "border border-indigo-500/50" : "border border-gray-700"}
              `}
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
                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                    result === "success" ? "bg-green-500" : "bg-red-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* LCD Strip */}
      <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-blue-600/30 mb-4" />

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
              className={`
                relative aspect-square rounded-full flex items-center justify-center transition-all
                ${isEmpty ? "bg-gray-800/40 border-gray-700/50 cursor-default" : "bg-gray-800 border-gray-600 hover:bg-gray-750 cursor-pointer"}
                border-2
                ${isSelected ? "ring-2 ring-blue-500 bg-gray-700" : ""}
              `}
            >
              {/* Dial notch */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-2 rounded-full bg-gray-600" />
              <span className={`text-xs font-medium ${isEmpty ? "text-gray-700" : "text-gray-300"}`}>
                {pressControl?.label || "—"}
              </span>
              {result && (
                <span
                  className={`absolute top-0 right-0 w-2 h-2 rounded-full ${
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
