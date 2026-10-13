"use client";

import {
  FilePlusIcon,
  FileTextIcon,
  LightbulbIcon,
  ReceiptTextIcon,
  SearchIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { globalSearch } from "@/app/(app)/actions";
import { NAV_GROUPS } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { formatMoney } from "@/lib/format";
import type { SearchResults } from "@/lib/validation/search";

const QUICK_ACTIONS = [
  { title: "Nouveau client", href: "/clients/nouveau", icon: UserPlusIcon },
  { title: "Nouveau pré-devis", href: "/pre-devis/nouveau", icon: LightbulbIcon },
  { title: "Nouveau devis", href: "/devis/nouveau", icon: FilePlusIcon },
  { title: "Nouvelle facture", href: "/factures/nouveau", icon: ReceiptTextIcon },
];

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const current = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      const result = await globalSearch({ q });
      // Ignore une réponse arrivée après une frappe plus récente.
      if (current !== requestId.current) return;
      setResults(result.ok ? result.data : null);
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  function onQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      requestId.current++;
      setResults(null);
      setLoading(false);
    }
  }

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(href);
  }

  const searching = query.trim().length >= 2;
  const hasResults =
    results !== null &&
    results.clients.length +
      results.preQuotes.length +
      results.quotes.length +
      results.invoices.length >
      0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full max-w-64 justify-start gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <SearchIcon data-icon="inline-start" />
        <span className="flex-1 text-left">Rechercher…</span>
        <Kbd className="hidden sm:inline-flex">Ctrl K</Kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Recherche"
        description="Rechercher un client, un devis ou une facture"
      >
        <Command shouldFilter={!searching}>
          <CommandInput
            placeholder="Client, numéro de devis ou de facture…"
            value={query}
            onValueChange={onQueryChange}
          />
          <CommandList>
            {searching ? (
              <>
                {!hasResults ? (
                  <CommandEmpty>{loading || results === null ? "Recherche…" : "Aucun résultat."}</CommandEmpty>
                ) : null}
                {results && results.clients.length > 0 ? (
                  <CommandGroup heading="Clients">
                    {results.clients.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={`client-${client.id}`}
                        onSelect={() => go(`/clients/${client.id}`)}
                      >
                        <UsersIcon />
                        <span className="truncate">{client.name}</span>
                        {client.city ? (
                          <span className="ml-auto text-xs text-muted-foreground">{client.city}</span>
                        ) : null}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
                {results && results.invoices.length > 0 ? (
                  <CommandGroup heading="Factures">
                    {results.invoices.map((invoice) => (
                      <CommandItem
                        key={invoice.id}
                        value={`invoice-${invoice.id}`}
                        onSelect={() => go(`/factures/${invoice.id}`)}
                      >
                        <ReceiptTextIcon />
                        <span className="font-medium tabular-nums">{invoice.number ?? "Brouillon"}</span>
                        <span className="truncate text-muted-foreground">
                          {invoice.clientName} — {invoice.title}
                        </span>
                        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                          {formatMoney(invoice.netCents)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
                {results && results.quotes.length > 0 ? (
                  <CommandGroup heading="Devis">
                    {results.quotes.map((quote) => (
                      <CommandItem
                        key={quote.id}
                        value={`quote-${quote.id}`}
                        onSelect={() => go(`/devis/${quote.id}`)}
                      >
                        <FileTextIcon />
                        <span className="font-medium tabular-nums">{quote.number}</span>
                        <span className="truncate text-muted-foreground">
                          {quote.clientName} — {quote.title}
                        </span>
                        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                          {formatMoney(quote.totalCents)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
                {results && results.preQuotes.length > 0 ? (
                  <CommandGroup heading="Pré-devis">
                    {results.preQuotes.map((preQuote) => (
                      <CommandItem
                        key={preQuote.id}
                        value={`prequote-${preQuote.id}`}
                        onSelect={() => go(`/pre-devis/${preQuote.id}`)}
                      >
                        <LightbulbIcon />
                        <span className="font-medium tabular-nums">{preQuote.number}</span>
                        <span className="truncate text-muted-foreground">
                          {preQuote.clientName} — {preQuote.title}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
              </>
            ) : (
              <>
                <CommandEmpty>Aucun résultat.</CommandEmpty>
                <CommandGroup heading="Actions rapides">
                  {QUICK_ACTIONS.map((item) => (
                    <CommandItem key={item.href} onSelect={() => go(item.href)}>
                      <item.icon />
                      {item.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup heading="Aller à">
                  {NAV_GROUPS.flatMap((group) => group.items).map((item) => (
                    <CommandItem key={item.href} onSelect={() => go(item.href)}>
                      <item.icon />
                      {item.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
