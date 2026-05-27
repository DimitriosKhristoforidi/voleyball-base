import { NavLink } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  emoji: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Дашборд", emoji: "🏠" },
  { to: "/games", label: "Игры", emoji: "🏐" },
  { to: "/players", label: "Игроки", emoji: "👥" },
  { to: "/venues", label: "Площадки", emoji: "📍" },
];

interface NavLinksProps {
  onNavigate?: () => void;
}

export function NavLinks({ onNavigate }: NavLinksProps) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-accent-soft font-medium text-accent-soft-foreground"
                : "text-foreground hover:bg-surface-secondary",
            ].join(" ")
          }
        >
          <span aria-hidden>{item.emoji}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
