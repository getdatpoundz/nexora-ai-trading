import { useEffect, useRef } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  autoStart: boolean;
  userId?: string;
  onFinished?: () => void;
};

const STEPS = [
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: "Navigering",
      description:
        "Här hittar du alla delar av plattformen: översikt, portfölj, strategier, marknader, insättning och mer.",
    },
  },
  {
    element: '[data-tour="checklist"]',
    popover: {
      title: "Kom igång-checklista",
      description:
        "Följ stegen i checklistan för att slutföra ditt konto. Vi guidar dig hela vägen.",
    },
  },
  {
    element: '[data-tour="portfolio-chart"]',
    popover: {
      title: "Portföljutveckling",
      description:
        "Se hur din portfölj utvecklas över tid med riktiga marknadspriser för Bitcoin och andra tillgångar.",
    },
  },
  {
    element: '[data-tour="stats"]',
    popover: {
      title: "Nyckeltal",
      description:
        "Snabb överblick över värde, tillgängligt saldo, avkastning och din aktiva strategi.",
    },
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: "Behöver du hjälp?",
      description:
        "Klicka här när som helst för att starta om guiden eller kontakta supporten.",
    },
  },
];

export function ProductTour({ autoStart, userId, onFinished }: Props) {
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    const d = driver({
      showProgress: true,
      allowClose: true,
      nextBtnText: "Nästa",
      prevBtnText: "Föregående",
      doneBtnText: "Klar",
      progressText: "{{current}} av {{total}}",
      steps: STEPS,
      onDestroyed: async () => {
        if (userId) {
          await supabase.from("profiles").update({ tour_completed: true }).eq("id", userId);
        }
        onFinished?.();
      },
    });
    driverRef.current = d;

    // Expose imperative start via window for the Help button
    (window as unknown as { __startNexoraTour?: () => void }).__startNexoraTour = () => d.drive();

    if (autoStart) {
      const t = setTimeout(() => d.drive(), 600);
      return () => {
        clearTimeout(t);
        d.destroy();
      };
    }
    return () => d.destroy();
  }, [autoStart, userId, onFinished]);

  return null;
}
