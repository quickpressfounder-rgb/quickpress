import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Clock, SearchIcon, Tag, Store, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import {
  SEARCH_SCOPES,
  readRecentSearches,
  rememberSearch,
  search,
  type SearchResult,
  type SearchScope,
} from "@/api/customer/services/search-service";

type SearchParams = { q: string; scope: SearchScope | "all" };

export const Route = createFileRoute("/search")({
  validateSearch: (raw: Record<string, unknown>): SearchParams => {
    const q = typeof raw["q"] === "string" ? raw["q"] : "";
    const scope = raw["scope"];
    const valid = ["partners", "categories", "services", "offers", "all"];
    return { q, scope: (typeof scope === "string" && valid.includes(scope) ? scope : "all") as SearchParams["scope"] };
  },
  head: () => ({
    meta: [
      { title: "Search Laundry Services, Stores & Offers — QuickPress" },
      {
        name: "description",
        content:
          "Search QuickPress for laundry services, nearby stores, areas and live offers. Results update as you type, with your recent searches saved.",
      },
      { property: "og:title", content: "Search Laundry Services & Offers — QuickPress" },
      {
        property: "og:description",
        content: "Find laundry services, nearby partners and offers on QuickPress in seconds.",
      },
    ],
  }),
  component: SearchScreen,
});

const SCOPE_ICONS: Record<SearchScope, typeof Store> = {
  partners: Store,
  categories: Sparkles,
  services: Sparkles,
  offers: Tag,
};

const SCOPE_CHIPS: { id: SearchScope | "all"; label: string }[] = [
  { id: "all", label: "All" },
  ...SEARCH_SCOPES.map((scope) => ({ id: scope.id, label: scope.label })),
];

function SearchScreen() {
  const navigate = useNavigate();
  const { q, scope } = Route.useSearch();
  const [term, setTerm] = useState(q);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecent(readRecentSearches());
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const needle = term.trim();
    if (!needle) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      // GET /api/search?q=&scopes=
      void search(needle, {
        scopes: scope === "all" ? undefined : [scope],
        signal: controller.signal,
      }).then(
        (next) => {
          setResults(next);
          setLoading(false);
          rememberSearch(needle);
          setRecent(readRecentSearches());
        },
        () => {
          setResults([]);
          setLoading(false);
        },
      );
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term, scope]);

  const grouped = useMemo(() => {
    const map = new Map<SearchScope, SearchResult[]>();
    for (const result of results ?? []) {
      const bucket = map.get(result.scope) ?? [];
      if (bucket.some((entry) => entry.id === result.id)) continue;
      map.set(result.scope, [...bucket, result]);
    }
    return [...map.entries()];
  }, [results]);

  const open = (result: SearchResult) => {
    if (result.scope === "partners")
      return navigate({ to: "/partner/$partnerId", params: { partnerId: result.id }, search: { highlightService: undefined } });
    if (result.scope === "offers") return navigate({ to: "/offers" });
    return navigate({ to: "/services/$serviceId", params: { serviceId: result.id } });
  };

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 pb-16">
      <div className="mx-auto w-full max-w-md">
        <header className="sticky top-0 z-30 bg-white/85 dark:bg-zinc-950/85 px-5 py-3.5 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Go back"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate({ to: "/home" });
                }
              }}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.94]"
            >
              <ArrowLeft className="size-5" />
            </button>
            <label className="flex h-11 flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-3.5">
              <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                placeholder="Search services, stores or offers"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {term ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setTerm("")}
                  className="text-muted-foreground"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </label>
          </div>

          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {SCOPE_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() =>
                  void navigate({ to: "/search", search: { q: term, scope: chip.id } })
                }
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 active:scale-[0.95] ${
                  scope === chip.id
                    ? "border-primary bg-primary/12 text-brand-dark"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </header>

        <div className="px-5 pt-2">
          {!term.trim() ? (
            recent.length > 0 ? (
              <section className="mt-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <Clock className="size-3" /> Recent searches
                </p>
                <div className="stagger-children mt-3 flex flex-wrap gap-2">
                  {recent.map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => setTerm(entry)}
                      className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {entry}
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <EmptyState
                icon={SearchIcon}
                title="Search QuickPress"
                description="Look up a laundry service, a nearby store or an active offer code."
              />
            )
          ) : loading ? (
            <div className="stagger-children mt-2 space-y-3">
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="card-soft border border-border p-4">
                  <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
                  <div className="mt-2 h-2.5 w-3/4 animate-pulse rounded-full bg-muted" />
                </div>
              ))}
            </div>
          ) : (results?.length ?? 0) === 0 ? (
            <EmptyState
              icon={SearchIcon}
              title={`No results for "${term.trim()}"`}
              description="Check the spelling or try a broader term like wash, iron or dry clean."
              actionLabel="Clear search"
              onAction={() => setTerm("")}
            />
          ) : (
            <div className="space-y-6 pb-6">
              {grouped.map(([groupScope, entries]) => {
                const Icon = SCOPE_ICONS[groupScope];
                return (
                  <section key={groupScope}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {groupScope}
                    </p>
                    <div className="stagger-children mt-3 space-y-2.5">
                      {entries.map((result) => (
                        <button
                          key={`${result.scope}-${result.id}`}
                          type="button"
                          onClick={() => open(result)}
                          className="card-soft ripple flex w-full items-center gap-3 border border-border p-3.5 text-left transition-all duration-300 hover:border-primary/60 active:scale-[0.98]"
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-brand-dark">
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-foreground">
                              {result.title}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {result.subtitle}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
