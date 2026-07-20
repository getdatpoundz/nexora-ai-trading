import { useQuery } from "@tanstack/react-query";
import { getQuote, getQuotes, getTimeSeries } from "@/lib/market-data.functions";

export function useQuote(symbol: string) {
  return useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => getQuote({ data: { symbol } }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useQuotes(symbols: string[]) {
  return useQuery({
    queryKey: ["quotes", ...symbols],
    queryFn: () => getQuotes({ data: { symbols } }),
    enabled: symbols.length > 0,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useTimeSeries(symbol: string, interval = "1day", outputsize = 90) {
  return useQuery({
    queryKey: ["ts", symbol, interval, outputsize],
    queryFn: () => getTimeSeries({ data: { symbol, interval, outputsize } }),
    staleTime: 5 * 60_000,
  });
}
