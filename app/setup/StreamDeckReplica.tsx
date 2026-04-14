"use client";

import { DeckControl, DeckPage, getDialInteractions, getPhysicalDials } from "./deckConfig";

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
    <div className="flex h-full min-h-0 flex-col rounded-[22px] border border-studio-700/80 bg-[linear-gradient(180deg,rgba(16,18,25,0.98),rgba(6,8,12,0.99))] p-4 shadow-[0_28px_60px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="console-label">Active Companion Page</div>
          <div className="mt-1 text-sm font-semibold text-studio-100">{page.label}</div>
        </div>
        <div className="rounded-pill border border-studio-700 bg-studio-950/80 px-2.5 py-1 text-xxs font-semibold uppercase tracking-[0.18em] text-studio-400">
          Stream Deck+
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 items-center justify-center">
        <div className="w-full max-w-[560px] rounded-[28px] border border-studio-700/80 bg-[linear-gradient(180deg,#11141d_0%,#05070c_100%)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_24px_60px_rgba(0,0,0,0.5)]">
          <div className="mb-4 grid grid-cols-4 gap-3">
            {page.buttons.map((button) => {
              const isSelected = selectedControlId === button.id;
              const isEmpty = !button.label;
              const result = testResults[button.id];

              return (
                <button
                  key={button.id}
                  type="button"
                  onClick={() => {
                    if (!isEmpty) onSelectControl(button);
                  }}
                  disabled={isEmpty}
                  aria-pressed={isSelected}
                  aria-label={button.label || "Empty slot"}
                  className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-[20px] border p-2 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
                    isEmpty
                      ? "cursor-default border-studio-800 bg-studio-950/65"
                      : "cursor-pointer border-studio-700 bg-[linear-gradient(180deg,rgba(24,28,39,0.98),rgba(10,12,18,0.98))] hover:border-studio-600 hover:bg-studio-900"
                  } ${isSelected ? "border-accent-blue/70 shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_12px_28px_rgba(37,99,235,0.18)]" : ""} ${button.isPageNav ? "border-accent-blue/40" : ""}`}
                >
                  <span
                    className={`text-xs font-semibold leading-tight ${
                      isEmpty ? "text-studio-600" : button.isPageNav ? "text-accent-blue" : "text-studio-100"
                    }`}
                  >
                    {button.label || "—"}
                  </span>

                  {result ? (
                    <span
                      aria-label={result === "success" ? "Test succeeded" : "Test failed"}
                      className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ${
                        result === "success"
                          ? "bg-accent-green shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
                          : "bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]"
                      }`}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mb-4 rounded-[999px] border border-accent-blue/20 bg-[linear-gradient(90deg,rgba(30,41,59,0.85),rgba(59,130,246,0.22),rgba(30,41,59,0.85))] px-3 py-2">
            <div className="grid grid-cols-4 gap-2 text-center">
              {physicalDials.map((position) => {
                const pressControl = getDialInteractions(page, position).find(
                  (control) => control.type === "dial-press"
                );
                return (
                  <div
                    key={`lcd-${position}`}
                    className="rounded-[10px] bg-studio-950/55 px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-studio-300"
                  >
                    {pressControl?.label || "Empty"}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {physicalDials.map((position) => {
              const interactions = getDialInteractions(page, position);
              const pressControl = interactions.find((control) => control.type === "dial-press");
              const isSelected = interactions.some((control) => control.id === selectedControlId);
              const isEmpty = !pressControl?.label;
              const result = pressControl ? testResults[pressControl.id] : undefined;

              return (
                <button
                  key={`dial-${position}`}
                  type="button"
                  onClick={() => {
                    if (!isEmpty && pressControl) onSelectControl(pressControl);
                  }}
                  disabled={isEmpty}
                  aria-pressed={isSelected}
                  aria-label={
                    pressControl?.label ? `Dial ${position}: ${pressControl.label}` : `Dial ${position} empty`
                  }
                  className={`relative flex aspect-square items-center justify-center rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
                    isEmpty
                      ? "cursor-default border-studio-800 bg-studio-950/50"
                      : "cursor-pointer border-studio-600 bg-[radial-gradient(circle_at_40%_35%,rgba(71,85,105,0.55),rgba(15,23,42,0.98)_72%)] hover:border-studio-500"
                  } ${isSelected ? "border-accent-blue/70 shadow-[0_0_0_1px_rgba(59,130,246,0.3),0_16px_34px_rgba(37,99,235,0.18)]" : ""}`}
                >
                  <span
                    className="absolute left-1/2 top-2 h-2.5 w-1 -translate-x-1/2 rounded-full bg-studio-300/70"
                    aria-hidden="true"
                  />
                  <div className="max-w-[72px] text-center">
                    <div
                      className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isEmpty ? "text-studio-600" : "text-studio-100"}`}
                    >
                      {pressControl?.label || "—"}
                    </div>
                    <div className="mt-1 text-[10px] text-studio-500">Dial {position}</div>
                  </div>

                  {result ? (
                    <span
                      aria-label={result === "success" ? "Test succeeded" : "Test failed"}
                      className={`absolute right-1 top-1 h-2.5 w-2.5 rounded-full ${
                        result === "success" ? "bg-accent-green" : "bg-red-500"
                      }`}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
