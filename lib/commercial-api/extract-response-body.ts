import type { SemasBody } from "@/lib/commercial-api/semas-types";

/** 공공데이터 REST API가 `body` 또는 `response.body`에 본문을 두는 경우를 흡수합니다. */
export const extractSemasLikeBody = <T>(
  json: Record<string, unknown>
): SemasBody<T> | undefined => {
  const direct = json.body;
  if (direct && typeof direct === "object") {
    return direct as SemasBody<T>;
  }
  const response = json.response as Record<string, unknown> | undefined;
  const inner = response?.body;
  if (inner && typeof inner === "object") {
    return inner as SemasBody<T>;
  }
  return undefined;
};
