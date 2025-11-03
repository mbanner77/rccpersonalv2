"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return stored ? stored === "dark" : prefersDark;
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", dark);
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("theme", dark ? "dark" : "light");
    }
  }, [dark]);

  function toggle() {
    const next = !dark;
    setDark(next);
  }

  return (
    <button onClick={toggle} title="Theme umschalten" className="rounded border px-3 py-1 text-sm">
      {dark ? "Light" : "Dark"}
    </button>
  );
}
