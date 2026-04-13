"use client";

import { useState } from "react";

export default function SetupGuide() {
  const [expanded, setExpanded] = useState(true);
  const [showManual, setShowManual] = useState(false);

  const steps = [
    {
      title: "Install Companion",
      text: "Download and install Bitfocus Companion from bitfocus.io/companion. Connect your Stream Deck+ via USB.",
    },
    {
      title: "Download config file",
      text: 'Use the "Download Companion Profile" button above to get a pre-built configuration file with the buttons, dials, and LCD feedback already mapped.',
    },
    {
      title: "Import into Companion",
      text: 'In Companion, go to the Import/Export tab → Import → select the downloaded .companionconfig file. Choose "Import to page 1" and import all pages.',
    },
    {
      title: "Test and verify",
      text: 'Use the "Test" buttons on this page to verify each action works. The studio console should update in real time when actions fire.',
    },
  ];

  const manualSteps = [
    {
      title: "Add Generic HTTP connection",
      text: 'In Companion, go to Connections → Add → search "Generic HTTP". Set the base URL to your server (e.g. http://localhost:3000). Leave other settings as defaults.',
    },
    {
      title: "Configure each button",
      text: 'Click a button slot on the replica below to see its HTTP config. In Companion, click the matching button slot, add a "Generic HTTP: POST/GET Request" action, and paste the URL path, headers, and body from here.',
    },
  ];

  return (
    <div className="overflow-hidden rounded-[20px] border border-studio-750/80 bg-studio-850/70 shadow-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-studio-850 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
      >
        <h2 className="text-sm font-semibold text-studio-100">Control Surface Guide</h2>
        <span className="text-xs text-studio-400">{expanded ? "Hide" : "Show"}</span>
      </button>

      {expanded && (
        <div className="space-y-3 px-4 pb-4">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-pill bg-accent-blue/20 text-xs font-bold text-accent-blue">
                {i + 1}
              </span>
              <div>
                <h3 className="text-sm font-medium text-studio-200">{step.title}</h3>
                <p className="mt-0.5 text-xs text-studio-400">{step.text}</p>
              </div>
            </div>
          ))}

          {/* Manual setup (collapsible) */}
          <div className="mt-2 border-t border-studio-750 pt-2">
            <button
              type="button"
              onClick={() => setShowManual((v) => !v)}
              aria-expanded={showManual}
              className="text-xs text-studio-400 transition-colors hover:text-studio-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
            >
              {showManual ? "Hide" : "Show"} manual setup (advanced)
            </button>
            {showManual && (
              <div className="mt-2 space-y-3">
                {manualSteps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-pill bg-studio-750 text-xs font-bold text-studio-300">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-medium text-studio-300">{step.title}</h3>
                      <p className="mt-0.5 text-xs text-studio-400">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
