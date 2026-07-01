import { Brand } from "./Brand";
import { NavLinks } from "./NavLinks";

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-border px-4">
        <Brand />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted/70">
          Навигация
        </p>
        <NavLinks />
      </div>
      <div className="border-t border-border p-4">
        <p className="text-xs text-muted">🏐 Управление играми и оплатами</p>
      </div>
    </aside>
  );
}
