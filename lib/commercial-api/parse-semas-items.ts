import type { SemasBody } from "@/lib/commercial-api/semas-types";

/** body.items 가 배열·단일 객체·{ item: [] } 인 경우를 정규화합니다. */
export const parseSemasItems = <T,>(body: SemasBody<T> | undefined): T[] => {
  if (!body?.items) return [];
  const raw = body.items;
  if (Array.isArray(raw)) return raw;
  const item = (raw as { item?: T | T[] }).item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
};
