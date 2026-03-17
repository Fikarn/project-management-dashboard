import type { ViewFilter } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var viewFilter: ViewFilter | undefined;
}

export function getViewFilter(): ViewFilter {
  return global.viewFilter ?? "all";
}

export function setViewFilter(filter: ViewFilter): void {
  global.viewFilter = filter;
}
