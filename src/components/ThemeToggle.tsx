"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setReady(true);
  }, []);

  function apply(next: Theme) {
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
    setTheme(next);
  }

  const dark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Tema oscuro" : "Tema claro"}
      onClick={() => apply(dark ? "light" : "dark")}
      className="fixed right-4 bottom-4 z-30 h-9 w-16 rounded-full border border-zinc-300 bg-zinc-100 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
    >
      <span
        className={`absolute top-1 left-1 grid h-7 w-7 place-items-center rounded-full bg-white text-zinc-900 shadow dark:bg-zinc-950 dark:text-zinc-100 ${
          ready ? "transition-transform duration-300 ease-out" : ""
        } ${dark ? "translate-x-7" : "translate-x-0"}`}
      >
        {dark ? "☾" : "☀"}
      </span>
    </button>
  );
}
