export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export function buildQueryString(params: QueryParams): string {
  const search = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(params)) {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }
    search.set(key, String(rawValue));
  }
  return search.toString();
}

export function withQueryString(path: string, params: QueryParams): string {
  const query = buildQueryString(params);
  if (!query) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${query}`;
}

export function withCompanyScope(path: string, companyId?: string | null): string {
  return withQueryString(path, { companyId });
}

