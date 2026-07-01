import type {
  HTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/** Outer frame — mirrors HeroUI's <Table> container. */
function TableRoot({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

function ScrollContainer({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("w-full overflow-x-auto", className)} {...props} />
  );
}

interface TableContentProps extends HTMLAttributes<HTMLTableElement> {
  "aria-label"?: string;
}

function Content({ className, ...props }: TableContentProps) {
  return (
    <table
      className={cn("w-full border-collapse text-sm", className)}
      {...props}
    />
  );
}

function Header({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("bg-surface-secondary/60", className)} {...props}>
      <tr>{children}</tr>
    </thead>
  );
}

interface ColumnProps extends ThHTMLAttributes<HTMLTableCellElement> {
  isRowHeader?: boolean;
}

function Column({ className, isRowHeader: _isRowHeader, ...props }: ColumnProps) {
  return (
    <th
      scope="col"
      className={cn(
        "h-11 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted whitespace-nowrap first:pl-4 last:pr-4",
        className,
      )}
      {...props}
    />
  );
}

function Body({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn(className)} {...props} />;
}

function Row({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-t border-border transition-colors hover:bg-surface-secondary/50",
        className,
      )}
      {...props}
    />
  );
}

function Cell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "px-3 py-2.5 align-middle first:pl-4 last:pr-4",
        className,
      )}
      {...props}
    />
  );
}

/** HeroUI-compatible compound Table API backed by native table markup. */
export const Table = Object.assign(TableRoot, {
  ScrollContainer,
  Content,
  Header,
  Column,
  Body,
  Row,
  Cell,
});
