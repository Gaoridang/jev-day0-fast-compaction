import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Continuous verbatim compaction",
  description:
    "Jev scores each tool call and result. Stale ones drop or truncate. User and assistant text stay verbatim.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className={`${geistMono.className} flex min-h-full flex-col bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
