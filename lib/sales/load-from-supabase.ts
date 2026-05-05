import type { SupabaseClient } from "@supabase/supabase-js";

import { mapBusinessRow, mapMarketStatRow } from "@/lib/sales/map-db";
import type { BusinessRow, MarketStatRow } from "@/lib/sales/types";

/** Supabase 에서 사업자·상권 통계를 읽어 맵 형태로 반환합니다. */
export const loadSalesFromSupabase = async (
  client: SupabaseClient
): Promise<{
  businesses: BusinessRow[];
  marketByRegion: Record<string, MarketStatRow>;
}> => {
  const [{ data: stats, error: es }, { data: rows, error: eb }] =
    await Promise.all([
      client.from("market_stats").select("*"),
      client.from("businesses").select("*"),
    ]);

  if (es) throw es;
  if (eb) throw eb;

  const marketByRegion: Record<string, MarketStatRow> = {};
  (stats ?? []).forEach((s) => {
    const m = mapMarketStatRow(
      s as Parameters<typeof mapMarketStatRow>[0]
    );
    marketByRegion[m.regionCode] = m;
  });

  const businesses = (rows ?? []).map((r) =>
    mapBusinessRow(r as Parameters<typeof mapBusinessRow>[0])
  );

  return { businesses, marketByRegion };
};
