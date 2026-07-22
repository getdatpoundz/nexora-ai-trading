import { useEffect, useRef, memo } from "react";

type Props = {
  symbol: string; // e.g. "BINANCE:BTCUSDT" or "NASDAQ:AAPL"
  height?: number;
  interval?: "1" | "5" | "15" | "30" | "60" | "240" | "D" | "W";
  hideToolbar?: boolean;
};

/**
 * Embed TradingView Advanced Chart. Loads the widget script once per instance
 * inside its container. Uses dark theme to match app.
 */
function TradingViewWidgetInner({ symbol, height = 500, interval = "60", hideToolbar = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Clean previous
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Europe/Stockholm",
      theme: "light",
      style: "1",
      locale: "sv_SE",
      toolbar_bg: "#f8fafc",
      enable_publishing: false,
      hide_top_toolbar: hideToolbar,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      studies: hideToolbar ? [] : ["STD;RSI", "MASimple@tv-basicstudies"],
      support_host: "https://www.tradingview.com",
    });

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container__widget";
    wrapper.style.height = "100%";
    wrapper.style.width = "100%";
    containerRef.current.appendChild(wrapper);
    containerRef.current.appendChild(script);
  }, [symbol, interval, hideToolbar]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container overflow-hidden rounded-xl border border-border bg-card"
      style={{ height, width: "100%" }}
    />
  );
}

/** Map internal asset symbols → TradingView tickers */
export function toTradingViewSymbol(symbol: string, assetType?: string): string {
  const s = symbol.toUpperCase();
  if (!assetType || assetType === "crypto") {
    const map: Record<string, string> = {
      BTC: "BINANCE:BTCUSDT", ETH: "BINANCE:ETHUSDT", SOL: "BINANCE:SOLUSDT",
      ADA: "BINANCE:ADAUSDT", DOT: "BINANCE:DOTUSDT", AVAX: "BINANCE:AVAXUSDT",
      MATIC: "BINANCE:MATICUSDT", LINK: "BINANCE:LINKUSDT", XRP: "BINANCE:XRPUSDT",
      DOGE: "BINANCE:DOGEUSDT", LTC: "BINANCE:LTCUSDT", BNB: "BINANCE:BNBUSDT",
    };
    return map[s] ?? `BINANCE:${s}USDT`;
  }
  if (assetType === "stock") return `NASDAQ:${s}`;
  if (assetType === "forex") return `FX:${s}`;
  if (assetType === "commodity") return `TVC:${s}`;
  return `BINANCE:${s}USDT`;
}

export const TradingViewWidget = memo(TradingViewWidgetInner);
