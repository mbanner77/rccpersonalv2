import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import "@/lib/dev-cron";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "@/components/LogoutButton";

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
          <nav className="mx-auto max-w-5xl flex items-center justify-between p-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <img
                src="https://realcore.info/bilder/rc-logo.png"
                alt="realcore"
                className="h-6 w-auto"
              />
              <span className="hidden sm:inline">Anniversaries</span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link className="hover:underline" href="/dashboard">Dashboard</Link>
              <Link className="hover:underline" href="/employees">Employees</Link>
              <Link className="hover:underline" href="/settings">Settings</Link>
              <ThemeToggle />
              <LogoutButton />
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl p-6">{children}</main>
      </body>
    </html>
  );
}
