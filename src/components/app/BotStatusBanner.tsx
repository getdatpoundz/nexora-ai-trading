import { useAuth } from "@/hooks/useAuth";
import { useBotStatus } from "@/hooks/useBotStatus";
import { Link } from "@tanstack/react-router";
import { Bot, AlertTriangle, CheckCircle2, ArrowDownToLine } from "lucide-react";

export function BotStatusBanner() {
  const { user } = useAuth();
  const { session, usage, loading } = useBotStatus(user?.id);

  if (loading || !session) return null;

  const tradesPct = Math.min(100, Math.round((usage.trades_count / session.max_trades_month) * 100));
  const levPct = session.max_leverage_pct > 0
    ? Math.min(100, Math.round((usage.leverage_used_pct / session.max_leverage_pct) * 100))
    : 0;
  const maxPct = Math.max(tradesPct, levPct);
  const isLimit = session.status === "limit_reached" || maxPct >= 100;
  const isWarn = maxPct >= 80 && !isLimit;

  const running = session.status === "running";
  const tone = isLimit
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : isWarn
    ? "border-warning/40 bg-warning/10 text-warning-foreground"
    : running
    ? "border-success/40 bg-success/10 text-foreground"
    : "border-border bg-muted/40 text-muted-foreground";

  const Icon = isLimit ? AlertTriangle : running ? Bot : CheckCircle2;
  const showDeposit = isLimit || isWarn;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2 text-xs sm:px-6 ${tone}`}>
      <Link to="/strategies" className="flex flex-1 items-center gap-2 font-medium hover:opacity-80">
        <Icon className={`h-4 w-4 ${running && !isLimit ? "animate-pulse" : ""}`} />
        {isLimit ? (
          <span>Månadsgräns nådd — sätt in mer för högre hävstång och fler trades</span>
        ) : isWarn ? (
          <span>Snart månadsgräns — sätt in mer för att fortsätta trada med högre hävstång</span>
        ) : running ? (
          <span>AI-boten är aktiv och tradar åt dig</span>
        ) : (
          <span>Bot pausad · {session.status === "paused" ? "Pausad" : "Stoppad"}</span>
        )}
      </Link>
      <div className="flex items-center gap-4 tabular-nums">
        <span>
          <span className="opacity-70">Trades:</span>{" "}
          <strong>{usage.trades_count}</strong>/{session.max_trades_month}
        </span>
        {session.max_leverage_pct > 0 && (
          <span>
            <span className="opacity-70">Hävstång:</span>{" "}
            <strong>{usage.leverage_used_pct}%</strong>/{session.max_leverage_pct}%
          </span>
        )}
        <span>
          <span className="opacity-70">Utveckling:</span>{" "}
          <strong>{session.current_multiplier.toFixed(2)}x</strong>
        </span>
        {showDeposit && (
          <Link
            to="/deposit"
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
              isLimit
                ? "bg-destructive text-destructive-foreground hover:opacity-90"
                : "bg-foreground text-background hover:opacity-90"
            }`}
          >
            <ArrowDownToLine className="h-3 w-3" />
            Sätt in
          </Link>
        )}
      </div>
    </div>
  );
}
