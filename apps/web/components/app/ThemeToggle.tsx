"use client";

import { useTheme } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { RiSunLine, RiMoonLine } from "@remixicon/react";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className={className}
    >
      <RiSunLine className="size-4 hidden dark:block" />
      <RiMoonLine className="size-4 block dark:hidden" />
    </Button>
  );
}
