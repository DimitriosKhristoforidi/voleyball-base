import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Brand } from "./Brand";
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
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="left" aria-label="Меню">
        <SheetHeader>
          <SheetTitle className="sr-only">Меню навигации</SheetTitle>
          <Brand />
        </SheetHeader>
        <SheetBody>
          <NavLinks onNavigate={() => onOpenChange(false)} />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
