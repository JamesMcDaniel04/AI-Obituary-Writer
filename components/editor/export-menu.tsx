"use client";

import { useState } from "react";
import { Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ExportMenuProps = {
  plainText: string;
  pdfUrl: string;
};

export function ExportMenu({ plainText, pdfUrl }: ExportMenuProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        className="gap-2"
        onClick={async () => {
          await navigator.clipboard.writeText(plainText);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        }}
      >
        <Copy className="h-4 w-4" />
        {copied ? "Copied" : "Copy text"}
      </Button>
      <a
        href={pdfUrl}
        className={cn(buttonClasses.base, buttonClasses.primary, "gap-2")}
      >
        <Download className="h-4 w-4" />
        Download PDF
      </a>
    </div>
  );
}
