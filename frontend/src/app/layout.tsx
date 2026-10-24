import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Multilingual Prescription Assistant",
  description: "Doctor-to-patient prescription translation powered by Gemini AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
