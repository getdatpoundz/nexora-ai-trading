import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getQuote, getQuotes, getTimeSeries } from "@/lib/market-data.functions";

export function useQuote(symbol: string) {
  return useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => getQuote({ data: { symbol } }),
    refetchInterval: 3 * 60_000,
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}

export function useQuotes(symbols: string[]) {
  return useQuery({
    queryKey: ["quotes", ...symbols],
    queryFn: () => getQuotes({ data: { symbols } }),
    enabled: symbols.length > 0,
    refetchInterval: 3 * 60_000,
    staleTime: 2 * 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}

export function useTimeSeries(symbol: string, interval = "1day", outputsize = 90) {
  return useQuery({
    queryKey: ["ts", symbol, interval, outputsize],
    queryFn: () => getTimeSeries({ data: { symbol, interval, outputsize } }),
    staleTime: 10 * 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}
