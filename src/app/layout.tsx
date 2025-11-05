import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/lib/dev-cron";
import AppHeader from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "realcore • Anniversaries",
  description: "Jubiläen, Mitarbeiterverwaltung und Import",
  icons: {
    icon: "https://realcore.info/bilder/favicon.png",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// duplicate metadata removed (see single metadata export above)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-black">
          <AppHeader />
        </header>
        <main className="mx-auto max-w-5xl p-6">{children}</main>
      </body>
    </html>
  );
}
