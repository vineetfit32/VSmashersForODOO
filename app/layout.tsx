import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { DevPersonaBanner } from "@/components/dev-persona-banner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Billpilot Subscriptions",
  description: "Recurring billing and subscription management for Billpilot Software.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {process.env.NODE_ENV === "development" ? <DevPersonaBanner /> : null}
        {children}
      </body>
    </html>
  );
}
