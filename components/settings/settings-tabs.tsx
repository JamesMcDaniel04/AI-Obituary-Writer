"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/settings", label: "Profile & branding" },
  { href: "/settings/delivery-template", label: "Delivery template" },
];

export function SettingsTabs() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Settings sections"
      className="flex flex-wrap gap-1 rounded-full border border-border bg-white/60 p-1"
    >
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/settings"
            ? pathname === "/settings"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              isActive
                ? "bg-accent text-white shadow-sm"
                : "text-muted hover:bg-accent-soft hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
