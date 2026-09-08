"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { ArrowRight, Check, Search, SlidersHorizontal, X } from "lucide-react";
import { useApi } from "@/lib/client-api";
import type { Trainer } from "@/types/trainer";
import { TrainerCard } from "./trainer-card";
import { TrainerCardSkeleton } from "./trainer-card-skeleton";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BUDGET_OPTIONS } from "@/lib/catalog";

type Facet = { name: string; count: number };
type TrainerResponse = {
  trainers: Trainer[];
  total: number;
  pages: number;
  facets: { categories: Facet[]; specialties: Facet[] };
};

export function TrainerSearch({ initial }: { initial: Record<string, string> }) {
  const [filters, setFilters] = useState({
    q: initial.q || "",
    category: initial.category || "",
    specialty: initial.specialty || "",
    maxPrice: initial.maxPrice || "",
  });
  const [sort, setSort] = useState(initial.sort || "recommended");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  const updateUrl = (next: typeof filters, nextSort = sort) => {
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => value && params.set(key, value));
    if (nextSort !== "recommended") params.set("sort", nextSort);
    const query = params.toString();
    window.history.replaceState(null, "", `/trainers${query ? `?${query}` : ""}`);
  };

  const set = (key: keyof typeof filters, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    updateUrl(next);
  };

  const clear = () => {
    const next = { q: "", category: "", specialty: "", maxPrice: "" };
    setFilters(next);
    setSort("recommended");
    setPage(1);
    window.history.replaceState(null, "", "/trainers");
  };

  const query = useMemo(
    () =>
      new URLSearchParams({
        ...Object.fromEntries(Object.entries(filters).filter(([, value]) => !!value)),
        sort,
        page: String(page),
      }).toString(),
    [filters, sort, page],
  );
  const { data, error, loading } = useApi<TrainerResponse>(`trainers?${query}`);
  const results = data?.trainers || [];
  const categories = data?.facets?.categories || [];
  const specialties = data?.facets?.specialties || [];
  const showCategory = categories.length > 1 || !!filters.category;
  const showSpecialty = specialties.length > 1 || !!filters.specialty;
  const hasDynamicFilters = showCategory || showSpecialty || BUDGET_OPTIONS.length > 0;
  const activeCount =
    Number(!!filters.category) +
    Number(!!filters.specialty) +
    Number(!!filters.maxPrice);

  const filterUI = (
    <>
      <div className="filter-title">
        <div>
          <h3>Available trainer filters</h3>
          <p className="fine-print">Only options offered by approved trainers appear here.</p>
        </div>
        {activeCount > 0 && <button onClick={clear}>Reset</button>}
      </div>
      {showCategory && (
        <fieldset className="directory-filter-group">
          <legend>Goal</legend>
          <button type="button" className={!filters.category ? "selected" : ""} onClick={() => set("category", "")}>
            <span>All goals</span>{!filters.category && <Check size={14} />}
          </button>
          {categories.map((item) => (
            <button type="button" key={item.name} className={filters.category === item.name ? "selected" : ""} onClick={() => set("category", item.name)}>
              <span>{item.name}<small>{item.count}</small></span>{filters.category === item.name && <Check size={14} />}
            </button>
          ))}
        </fieldset>
      )}
      {showSpecialty && (
        <fieldset className="directory-filter-group">
          <legend>Specialty</legend>
          <button type="button" className={!filters.specialty ? "selected" : ""} onClick={() => set("specialty", "")}>
            <span>All specialties</span>{!filters.specialty && <Check size={14} />}
          </button>
          {specialties.slice(0, 8).map((item) => (
            <button type="button" key={item.name} className={filters.specialty === item.name ? "selected" : ""} onClick={() => set("specialty", item.name)}>
              <span>{item.name}<small>{item.count}</small></span>{filters.specialty === item.name && <Check size={14} />}
            </button>
          ))}
        </fieldset>
      )}
      <fieldset className="directory-filter-group">
        <legend>Price</legend>
        <button type="button" className={!filters.maxPrice ? "selected" : ""} onClick={() => set("maxPrice", "")}>
          <span>Any price</span>{!filters.maxPrice && <Check size={14} />}
        </button>
        {BUDGET_OPTIONS.filter((item) => item.value).map((item) => (
          <button type="button" key={item.value} className={filters.maxPrice === item.value ? "selected" : ""} onClick={() => set("maxPrice", item.value)}>
            <span>{item.label}</span>{filters.maxPrice === item.value && <Check size={14} />}
          </button>
        ))}
      </fieldset>
    </>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="container search-page">
        <div className="page-heading">
          <p className="eyebrow">VERIFIED ONLINE COACHING</p>
          <h1>Find the coach who fits you.</h1>
          <p>Search by goal, specialty and coaching style, then compare approved trainers without the noise.</p>
        </div>

        <div className="search-input">
          <Search size={19} />
          <input
            aria-label="Search trainers or specialties"
            placeholder="Search by trainer, category or specialty…"
            value={filters.q}
            onChange={(e) => set("q", e.target.value)}
          />
          <span>1-on-1 Online</span>
        </div>

        <div className="search-layout">
          <aside className="desktop-filter-rail" aria-label="Trainer filters">
            {filterUI}
          </aside>

          <div className="results-area">
            <div className="result-toolbar">
              <div>
                <h2>Approved trainers</h2>
                <p aria-live="polite">{data?.total || 0} available · starting prices shown</p>
              </div>
              <div className="result-controls">
                {hasDynamicFilters && (
                  <button className="btn outline small all-filters" onClick={() => setOpen(true)}>
                    <SlidersHorizontal size={15} /> Filters {activeCount || ""}
                  </button>
                )}
                <select
                  aria-label="Sort trainers"
                  value={sort}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSort(value);
                    setPage(1);
                    updateUrl(filters, value);
                  }}
                >
                  <option value="recommended">Recommended</option>
                  <option value="experience">Most experienced</option>
                  <option value="rating">Highest rated</option>
                  <option value="low">Price: low to high</option>
                  <option value="high">Price: high to low</option>
                </select>
              </div>
            </div>

            {activeCount > 0 && (
              <div className="active-filters">
                {filters.category && (
                  <button onClick={() => set("category", "")}>{filters.category}<X size={12} /></button>
                )}
                {filters.specialty && (
                  <button onClick={() => set("specialty", "")}>{filters.specialty}<X size={12} /></button>
                )}
                {filters.maxPrice && (
                  <button onClick={() => set("maxPrice", "")}>Up to PKR {Number(filters.maxPrice).toLocaleString("en-PK")}<X size={12} /></button>
                )}
                <button onClick={clear}>Clear all</button>
              </div>
            )}

            {error ? (
              <div className="empty-state" role="alert">
                <h2>Unable to load trainers.</h2>
                <p>{error}</p>
              </div>
            ) : loading ? (
              <div className="search-results" role="status" aria-label="Loading approved trainers">
                {Array.from({ length: 6 }).map((_, index) => <TrainerCardSkeleton key={index} />)}
              </div>
            ) : results.length === 0 ? (
              <div className="empty-state">
                <Search size={36} />
                <h2>{activeCount || filters.q ? "No trainers match that choice yet." : "Trainer profiles are coming soon."}</h2>
                <p>
                  {activeCount || filters.q
                    ? "Clear the current selection to see every approved trainer."
                    : "Approved trainer profiles will appear here as soon as onboarding and verification are complete."}
                </p>
                {(activeCount > 0 || filters.q) && (
                  <button onClick={clear} className="btn">Show all trainers <ArrowRight size={17} /></button>
                )}
              </div>
            ) : (
              <motion.div layout className="search-results">
                <AnimatePresence>
                  {results.map((trainer) => (
                    <motion.div
                      layout
                      key={trainer.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TrainerCard trainer={trainer} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>

        {data && data.pages > 1 && (
          <div className="pagination">
            <button className="btn outline small" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>{page} / {data.pages}</span>
            <button className="btn outline small" disabled={page >= data.pages} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        )}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="filter-sheet">
            <SheetTitle>Filter available trainers</SheetTitle>
            <div className="filter-sheet-scroll">{filterUI}</div>
            <button className="btn" onClick={() => setOpen(false)}>
              Show {results.length} trainers <ArrowRight size={16} />
            </button>
          </SheetContent>
        </Sheet>
      </div>
    </MotionConfig>
  );
}
