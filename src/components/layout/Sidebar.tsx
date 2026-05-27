import { NavLinks } from "./NavLinks";

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <span className="text-xl">🏐</span>
        <span className="font-semibold">Волейбол · Админка</span>
      </div>
      <div className="p-3">
        <NavLinks />
      </div>
    </aside>
  );
}
