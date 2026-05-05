/** 소상공인 상가 API·행정표준코드 연동 모듈(서버·라우트 핸들러에서 사용 권장). */
export {
  buildUrlWithExplicitTypeJson,
  parsePublicDataFetchAsJson,
  summarizePublicDataXmlBody,
  isPublicDataXmlErrorPayload,
} from "@/lib/commercial-api/public-data-response";
export {
  STAN_REGION_SEARCH_FALLBACK,
} from "@/lib/commercial-api/stan-fallback";
export {
  refineStanSearchResults,
  toStanApiLocataddNm,
} from "@/lib/commercial-api/stan-search-query";
export { fetchStanRegionList } from "@/lib/commercial-api/stan-regin";
export {
  fetchIndustryLargeClasses,
  fetchStoreListInDong,
  type IndustryLargeItem,
} from "@/lib/commercial-api/semas-store";
export { mapSbizStoreToBusinessRow } from "@/lib/commercial-api/map-ext-store";
