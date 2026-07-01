import { LogOut, Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  const { session, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const email = session?.user?.email ?? "";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="Открыть меню"
          onPress={onOpenMobileNav}
          className="md:hidden"
        >
          <Menu className="size-5" />
        </Button>
        <div className="text-sm font-semibold md:hidden">🏐 Волейбол</div>
        <div className="hidden text-sm text-muted md:block">
          Управление играми и игроками
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {email && (
          <span className="hidden max-w-[180px] truncate text-sm text-muted sm:inline lg:max-w-none">
            {email}
          </span>
        )}
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          onPress={toggleTheme}
        >
          {theme === "dark" ? (
            <Sun className="size-5" />
          ) : (
            <Moon className="size-5" />
          )}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          startContent={<LogOut className="size-4" />}
          onPress={() => void signOut()}
        >
          Выйти
        </Button>
      </div>
    </header>
  );
}
