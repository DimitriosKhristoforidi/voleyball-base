import { ExternalLink } from "lucide-react";
import type { AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement>;

function LinkRoot({ className, children, ...props }: LinkProps) {
  return (
    <a
      className={cn(
        "inline-flex items-center gap-1 font-medium text-accent underline-offset-4 transition-colors hover:text-accent/80 hover:underline",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return <ExternalLink aria-hidden className={cn("size-3.5", className)} />;
}

/** Anchor with HeroUI-style compound `Link.Icon`. */
export const Link = Object.assign(LinkRoot, { Icon: LinkIcon });
