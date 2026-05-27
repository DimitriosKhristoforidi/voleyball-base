import { Button } from "@heroui/react";
import { useAuth } from "@/lib/auth";

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  const { session, signOut } = useAuth();
  const email = session?.user?.email ?? "";

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="Открыть меню"
          onPress={onOpenMobileNav}
          className="md:hidden"
        >
          <MenuIcon />
        </Button>
        <div className="text-sm font-semibold md:hidden">🏐 Волейбол</div>
        <div className="hidden text-sm text-muted md:block">
          Управление играми и игроками
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {email && (
          <span className="hidden max-w-[180px] truncate text-sm text-foreground sm:inline lg:max-w-none">
            {email}
          </span>
        )}
        <Button size="sm" variant="secondary" onPress={() => void signOut()}>
          Выйти
        </Button>
      </div>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}
