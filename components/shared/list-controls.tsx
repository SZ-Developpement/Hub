"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Met à jour des paramètres d'URL sans empiler d'entrée d'historique. */
function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    // Tout changement de filtre ramène à la première page.
    if (!("page" in changes)) next.delete("page");
    const query = next.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  return { update, pending, searchParams };
}

export function SearchInput({
  placeholder = "Rechercher…",
  className,
}: {
  placeholder?: string;
  className?: string;
}) {
  const { update, pending, searchParams } = useQueryUpdater();
  const current = searchParams.get("q") ?? "";
  const [value, setValue] = useState(current);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <InputGroup className={cn("w-full sm:max-w-xs", className)}>
      <InputGroupAddon>{pending ? <Spinner /> : <SearchIcon />}</InputGroupAddon>
      <InputGroupInput
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => update({ q: next.trim() || null }), 300);
        }}
      />
    </InputGroup>
  );
}

const ALL = "__all__";

export function FilterSelect({
  name,
  label,
  options,
  allLabel = "Tous",
  className,
}: {
  /** Nom du paramètre d'URL. */
  name: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel?: string;
  className?: string;
}) {
  const { update, searchParams } = useQueryUpdater();
  const value = searchParams.get(name) ?? ALL;

  return (
    <Select value={value} onValueChange={(next) => update({ [name]: next === ALL ? null : next })}>
      <SelectTrigger aria-label={label} className={cn("w-full sm:w-auto sm:min-w-40", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** En-tête de colonne triable : un clic trie, un second inverse l'ordre. */
export function SortableHead({
  column,
  children,
  defaultDir = "asc",
  isDefault = false,
  defaultSortDir = "desc",
  className,
  align = "left",
}: {
  column: string;
  children: ReactNode;
  /** Sens appliqué au premier clic. */
  defaultDir?: "asc" | "desc";
  /** Vrai si cette colonne est le tri par défaut de la page. */
  isDefault?: boolean;
  defaultSortDir?: "asc" | "desc";
  className?: string;
  align?: "left" | "right";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sortParam = searchParams.get("sort");
  const active = sortParam ? sortParam === column : isDefault;
  const currentDir = (searchParams.get("dir") ?? (isDefault ? defaultSortDir : defaultDir)) as
    | "asc"
    | "desc";
  const nextDir = active ? (currentDir === "asc" ? "desc" : "asc") : defaultDir;

  const next = new URLSearchParams(searchParams.toString());
  next.set("sort", column);
  next.set("dir", nextDir);
  next.delete("page");

  const Icon = !active ? ChevronsUpDownIcon : currentDir === "asc" ? ArrowUpIcon : ArrowDownIcon;

  return (
    <TableHead
      className={cn(align === "right" && "text-right", className)}
      aria-sort={active ? (currentDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <Link
        href={`${pathname}?${next.toString()}`}
        scroll={false}
        replace
        className={cn(
          "inline-flex items-center gap-1 rounded-sm hover:text-foreground",
          align === "right" && "flex-row-reverse",
          active && "text-foreground",
        )}
      >
        {children}
        <Icon className={cn("size-3.5", !active && "opacity-50")} />
      </Link>
    </TableHead>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  label,
}: {
  page: number;
  pageCount: number;
  total: number;
  /** Nom des éléments au pluriel, ex. « clients ». */
  label: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function href(target: number): string {
    const next = new URLSearchParams(searchParams.toString());
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span className="tabular-nums">
        {total} {label}
      </span>
      {pageCount > 1 ? (
        <div className="flex items-center gap-2">
          <span className="tabular-nums">
            Page {page} sur {pageCount}
          </span>
          <Button asChild={page > 1} variant="outline" size="icon-sm" disabled={page <= 1}>
            {page > 1 ? (
              <Link href={href(page - 1)} aria-label="Page précédente">
                <ChevronLeftIcon />
              </Link>
            ) : (
              <ChevronLeftIcon />
            )}
          </Button>
          <Button asChild={page < pageCount} variant="outline" size="icon-sm" disabled={page >= pageCount}>
            {page < pageCount ? (
              <Link href={href(page + 1)} aria-label="Page suivante">
                <ChevronRightIcon />
              </Link>
            ) : (
              <ChevronRightIcon />
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Barre d'outils d'une liste : recherche et filtres à gauche, actions à droite. */
export function ListToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}
