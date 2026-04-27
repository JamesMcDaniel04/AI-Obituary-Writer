import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NewCaseButton() {
  return (
    <Link
      href="/cases/new"
      className={cn(buttonClasses.base, buttonClasses.primary)}
    >
      New case
    </Link>
  );
}
