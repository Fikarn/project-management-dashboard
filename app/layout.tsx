import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "./components/shared/ToastContext";
import { AppErrorBoundary } from "./components/shared/ErrorBoundary";

export const metadata: Metadata = {
  title: {
    default: "Studio Console",
    template: "%s | Studio Console",
  },
  description: "Local control console for studio lighting, audio, Stream Deck actions, and production planning.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-studio-950 font-sans text-studio-300 antialiased">
        <AppErrorBoundary>
          <ToastProvider>{children}</ToastProvider>
        </AppErrorBoundary>
      </body>
    </html>
  );
}
