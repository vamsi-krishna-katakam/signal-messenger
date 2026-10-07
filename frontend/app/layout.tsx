import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Signal Messenger — Scalar Labs Assignment",
  description: "Functional Signal messaging platform clone built with Next.js, FastAPI, SQLite, and WebSockets.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#121212] text-white overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
