"use client";

import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";

function getTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribeTheme(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function ThemeAwareToaster() {
  const theme = useSyncExternalStore<"light" | "dark">(subscribeTheme, getTheme, () => "light");
  return <Toaster richColors position="top-center" theme={theme} />;
}