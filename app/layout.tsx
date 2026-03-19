import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "./components/ToastContext";

export const metadata: Metadata = {
  title: "Project Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
