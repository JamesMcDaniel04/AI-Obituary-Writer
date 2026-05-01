"use client";

import Link from "next/link";
import {
  FolderOpen,
  FileText,
  LayoutDashboard,
  Settings,
  PlusCircle,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: string[];
  exclude?: string[];
};

const baseNavItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/cases",
    label: "Cases",
    icon: FolderOpen,
    exclude: ["/cases/new"],
  },
  {
    href: "/cases/new",
    label: "New case",
    icon: PlusCircle,
    match: ["/cases/new"],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    match: ["/settings", "/branding"],
  },
];

const CASE_PATH_PATTERN = /^\/cases\/([^/]+)/;

function getCurrentCaseHref(pathname: string) {
  const match = CASE_PATH_PATTERN.exec(pathname);

  if (!match || match[1] === "new") {
    return null;
  }

  return `/cases/${match[1]}`;
}

export function DirectorNav() {
  const pathname = usePathname() ?? "";
  const currentCaseHref = getCurrentCaseHref(pathname);
  const navItems: NavItem[] = currentCaseHref
    ? [
        ...baseNavItems.slice(0, 3),
        {
          href: currentCaseHref,
          label: "Current case",
          icon: FileText,
          match: [currentCaseHref],
        },
        ...baseNavItems.slice(3),
      ]
    : baseNavItems;

  return (
    <nav aria-label="Director navigation" className="flex flex-col gap-1">
      {navItems.map((item) => {
        const matches = item.match ?? [item.href];
        const excluded = item.exclude?.some((p) => pathname.startsWith(p)) ?? false;
        const isActive =
          !excluded &&
          matches.some((p) => pathname === p || pathname.startsWith(`${p}/`));
        const Icon = item.icon;

        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition",
              isActive
                ? "bg-accent text-white"
                : "text-muted hover:bg-accent-soft hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                isActive ? "text-white" : "text-accent",
              )}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
