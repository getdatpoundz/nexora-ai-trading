import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function VerificationBanner() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  if (!profile || profile.withdrawals_enabled !== false) return null;
  return (
    <Link
      to="/support"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive sm:px-6"
    >
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4" />
        <span>
          Ditt konto kräver verifiering innan uttag kan göras.
          {profile.withdrawal_block_reason ? ` ${profile.withdrawal_block_reason}` : ""}
        </span>
      </div>
      <span className="font-semibold underline underline-offset-2">
        Kontakta support →
      </span>
    </Link>
  );
}
