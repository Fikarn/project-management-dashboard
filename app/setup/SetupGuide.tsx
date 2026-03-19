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
      text: 'Use the "Download Companion Config" button above to get a pre-built configuration file with all buttons and dials ready to go.',
    },
    {
      title: "Import into Companion",
      text: 'In Companion, go to the Import/Export tab → Import → select the downloaded .companionconfig file. Choose "Import to page 1" and import all pages.',
    },
    {
      title: "Test and verify",
      text: 'Use the "Test" buttons on this page to verify each action works. The dashboard should update in real-time when actions fire.',
    },
  ];

  const manualSteps = [
    {
      title: "Add Generic HTTP connection",
      text: 'In Companion, go to Connections → Add → search "Generic HTTP". Set the base URL to your server (e.g. http://localhost:3000). Leave other settings as defaults.',
    },
    {
      title: "Configure each button",
      text: "Click a button slot on the replica below to see its HTTP config. In Companion, click the matching button slot, add a \"Generic HTTP: POST/GET Request\" action, and paste the URL path, headers, and body from here.",
    },
  ];

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800 transition-colors"
      >
        <h2 className="text-sm font-semibold text-white">Setup Guide</h2>
        <span className="text-gray-500 text-xs">{expanded ? "Hide" : "Show"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <h3 className="text-sm font-medium text-gray-200">{step.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{step.text}</p>
              </div>
            </div>
          ))}

          {/* Manual setup (collapsible) */}
          <div className="mt-2 pt-2 border-t border-gray-700">
            <button
              onClick={() => setShowManual((v) => !v)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showManual ? "Hide" : "Show"} manual setup (advanced)
            </button>
            {showManual && (
              <div className="mt-2 space-y-3">
                {manualSteps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 text-gray-400 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-medium text-gray-300">{step.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{step.text}</p>
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
