import { Drawer } from "@heroui/react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { NavLinks } from "./NavLinks";

interface MobileNavDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNavDrawer({ isOpen, onOpenChange }: MobileNavDrawerProps) {
  const location = useLocation();

  // Auto-close after route change.
  useEffect(() => {
    if (isOpen) onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <Drawer.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Content placement="left">
        <Drawer.Dialog
          aria-label="Меню"
          className="flex w-72 max-w-[85vw] flex-col"
        >
          <Drawer.Header>
            <Drawer.Heading>
              <span className="flex items-center gap-2">
                <span className="text-xl">🏐</span>
                <span>Волейбол · Админка</span>
              </span>
            </Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
            <NavLinks onNavigate={() => onOpenChange(false)} />
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
