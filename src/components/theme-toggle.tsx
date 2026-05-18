"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useIsMounted();

  if (!mounted) {
    return (
      <button
        className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary/50"
        aria-label="Toggle theme"
      >
        <Sun className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300",
        "hover:bg-secondary active:scale-95 cursor-pointer",
        isDark ? "bg-[#1f2937]" : "bg-[#e6f7f9]"
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="relative w-4 h-4">
        <Sun
          className={cn(
            "absolute inset-0 w-4 h-4 transition-all duration-300",
            isDark
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
          )}
          style={{ color: "#009AA5" }}
        />
        <Moon
          className={cn(
            "absolute inset-0 w-4 h-4 transition-all duration-300",
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0"
          )}
          style={{ color: "#009AA5" }}
        />
      </div>
    </button>
  );
}
