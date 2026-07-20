import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  buildFallbackSeries,
  fallbackChangePct,
  fallbackNativePrice,
  findMarketAsset,
  type AssetType,
} from "./market-data.shared";

export type Quote = {
  symbol: string;
  name: string;
  type: AssetType;
  priceSek: number;
  priceNative: number;
  currency: "USD" | "EUR" | "SEK";
  changePct24h: number;
};

export const getQuote = createServerFn({ method: "GET" })
  .inputValidator((i: { symbol: string }) => z.object({ symbol: z.string() }).parse(i))
  .handler(async ({ data }): Promise<Quote> => {
    const asset = findMarketAsset(data.symbol);
    const { tdFetch, getFxToSek } = await import("./market-data.server");
    let q: { close: string; percent_change: string } | null = null;
    try {
      q = await tdFetch<{ close: string; percent_change: string }>("/quote", { symbol: asset.td }, 180_000);
    } catch (error) {
      console.warn("Twelve Data quote fallback", { symbol: asset.symbol, error });
    }
    const fallbackPrice = fallbackNativePrice(asset.symbol);
    const parsedPrice = q ? Number(q.close) : Number.NaN;
    const parsedChange = q ? Number(q.percent_change) : Number.NaN;
    const priceNative = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : fallbackPrice;
    const fx = await getFxToSek(asset.currency);
    return {
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type,
      priceNative,
      currency: asset.currency,
      priceSek: priceNative * fx,
      changePct24h: Number.isFinite(parsedChange) ? parsedChange : fallbackChangePct(asset.symbol),
    };
  });

export const getQuotes = createServerFn({ method: "GET" })
  .inputValidator((i: { symbols: string[] }) =>
    z.object({ symbols: z.array(z.string()).min(1).max(30) }).parse(i),
  )
  .handler(async ({ data }): Promise<Quote[]> => {
    const assets = data.symbols.map(findMarketAsset);
    const { tdFetch, getFxToSek } = await import("./market-data.server");
    // Twelve Data supports batch via comma-separated symbols
    const symbols = assets.map((a) => a.td).join(",");
    let raw: Record<string, { close?: string; percent_change?: string; symbol?: string }> | null = null;
    try {
      raw = await tdFetch<Record<string, { close?: string; percent_change?: string; symbol?: string }>>(
        "/quote",
        { symbol: symbols },
        180_000,
      );
    } catch (error) {
      console.warn("Twelve Data quotes fallback", { symbols: data.symbols, error });
    }
    // When only one symbol is requested, Twelve Data returns a flat object.
    const map: Record<string, { close?: string; percent_change?: string }> = raw
      ? assets.length === 1
        ? { [assets[0].td]: raw as unknown as { close?: string; percent_change?: string } }
        : raw
      : {};

    // Preload FX for currencies we need
    const fxCache: Record<string, number> = { SEK: 1 };
    for (const cur of new Set(assets.map((a) => a.currency))) {
      if (!(cur in fxCache)) fxCache[cur] = await getFxToSek(cur);
    }

    return assets.map((a) => {
      const q = map[a.td];
      const parsedPrice = q ? Number(q.close) : Number.NaN;
      const parsedChange = q ? Number(q.percent_change) : Number.NaN;
      const priceNative = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : fallbackNativePrice(a.symbol);
      const changePct = Number.isFinite(parsedChange) ? parsedChange : fallbackChangePct(a.symbol);
      return {
        symbol: a.symbol,
        name: a.name,
        type: a.type,
        priceNative,
        currency: a.currency,
        priceSek: priceNative * (fxCache[a.currency] ?? 1),
        changePct24h: changePct,
      };
    });
  });

export type SeriesPoint = { date: string; value: number };
export const getTimeSeries = createServerFn({ method: "GET" })
  .inputValidator((i: { symbol: string; interval?: string; outputsize?: number }) =>
    z
      .object({
        symbol: z.string(),
        interval: z.string().optional(),
        outputsize: z.number().int().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }): Promise<SeriesPoint[]> => {
    const asset = findMarketAsset(data.symbol);
    const { tdFetch, getFxToSek } = await import("./market-data.server");
    const interval = data.interval ?? "1day";
    const outputsize = String(data.outputsize ?? 90);
    const fx = await getFxToSek(asset.currency);
    let res: { values?: Array<{ datetime: string; close: string }> } | null = null;
    try {
      res = await tdFetch<{ values?: Array<{ datetime: string; close: string }> }>(
        "/time_series",
        { symbol: asset.td, interval, outputsize },
        5 * 60_000,
      );
    } catch (error) {
      console.warn("Twelve Data series fallback", { symbol: asset.symbol, error });
    }
    const values = res?.values ?? [];
    if (values.length === 0) {
      return buildFallbackSeries(asset.symbol, Number(outputsize)).map((point) => ({
        date: point.date,
        value: point.value * fx,
      }));
    }
    return values
      .slice()
      .reverse()
      .map((v) => ({ date: v.datetime, value: Number(v.close) * fx }));
  });
