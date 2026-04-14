"use client";

import { useState } from "react";

export default function SetupGuide() {
  const [showManual, setShowManual] = useState(false);

  const steps = [
    {
      title: "Install Companion",
      text: "Install Bitfocus Companion, then connect the Stream Deck+ over USB before importing anything.",
    },
    {
      title: "Import the profile",
      text: "Use the generated .companionconfig file so both button pages and dial mappings land in the right slots immediately.",
    },
    {
      title: "Verify live actions",
      text: "Probe the server connection, then use the control detail pane to test each mapped request against the studio console.",
    },
    {
      title: "Adjust only exceptions",
      text: "Use manual setup only for slots that need a custom URL, payload, or page-jump behavior beyond the generated profile.",
    },
  ];

  const manualSteps = [
    {
      title: "Add Generic HTTP",
      text: "In Companion Connections, add Generic HTTP and point it at this workstation base URL.",
    },
    {
      title: "Copy request details",
      text: "Select the matching slot in the replica, then copy the exact URL, JSON body, or curl reference from the detail pane.",
    },
  ];

  return (
    <section className="console-surface-soft px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="console-label">Commissioning Checklist</div>
          <div className="mt-1 text-sm font-semibold text-studio-100">Import, verify, then fine-tune</div>
        </div>
        <span className="rounded-pill bg-studio-800 px-2 py-0.5 text-xxs font-semibold uppercase tracking-[0.16em] text-studio-400">
          4 steps
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-[14px] border border-studio-800 bg-studio-950/45 px-3 py-2.5">
            <div className="flex items-start gap-3">
              <span className="bg-accent-blue/12 mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-pill text-[11px] font-semibold text-accent-blue">
                {index + 1}
              </span>
              <div>
                <div className="text-sm font-medium text-studio-200">{step.title}</div>
                <p className="mt-1 text-xs leading-5 text-studio-400">{step.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-studio-800 pt-3">
        <button
          type="button"
          onClick={() => setShowManual((value) => !value)}
          aria-expanded={showManual}
          className="text-xs font-medium text-studio-400 transition-colors hover:text-studio-200"
        >
          {showManual ? "Hide" : "Show"} manual setup fallback
        </button>

        {showManual ? (
          <div className="mt-3 space-y-2">
            {manualSteps.map((step, index) => (
              <div key={step.title} className="rounded-[14px] border border-studio-800 bg-studio-950/35 px-3 py-2.5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-pill bg-studio-800 text-[11px] font-semibold text-studio-300">
                    {index + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-studio-200">{step.title}</div>
                    <p className="mt-1 text-xs leading-5 text-studio-400">{step.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
