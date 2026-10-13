// Lecture des paramètres d'URL des pages de liste (recherche, filtres, tri, pagination).

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 25;

export function param(searchParams: RawSearchParams, key: string): string | undefined {
  const value = searchParams[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() || undefined;
}

/** Valeur du paramètre si elle fait partie des valeurs autorisées. */
export function enumParam<T extends string>(
  searchParams: RawSearchParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = param(searchParams, key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export type ListParams<SortKey extends string> = {
  q: string | undefined;
  page: number;
  sort: SortKey;
  dir: "asc" | "desc";
  skip: number;
  take: number;
};

export function listParams<SortKey extends string>(
  searchParams: RawSearchParams,
  options: { sortable: readonly SortKey[]; defaultSort: SortKey; defaultDir?: "asc" | "desc" },
): ListParams<SortKey> {
  const page = Math.max(1, Number.parseInt(param(searchParams, "page") ?? "1", 10) || 1);
  const sort = enumParam(searchParams, "sort", options.sortable) ?? options.defaultSort;
  const dir =
    enumParam(searchParams, "dir", ["asc", "desc"] as const) ?? options.defaultDir ?? "desc";
  return {
    q: param(searchParams, "q")?.slice(0, 100),
    page,
    sort,
    dir,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  };
}

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}
