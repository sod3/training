"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { ArrowUpRight, Search, SlidersHorizontal, X } from "lucide-react";
import { useApi } from "@/lib/client-api";
import type { Trainer } from "@/types/trainer";
import { TrainerCard } from "./trainer-card";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

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
    const next = { q: "", category: "", specialty: "" };
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
  const hasDynamicFilters = showCategory || showSpecialty;
  const activeCount = Number(!!filters.category) + Number(!!filters.specialty);

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
        <label className="field">
          Category
          <select value={filters.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name} ({item.count})
              </option>
            ))}
          </select>
        </label>
      )}
      {showSpecialty && (
        <label className="field">
          Specialty
          <select value={filters.specialty} onChange={(e) => set("specialty", e.target.value)}>
            <option value="">All specialties</option>
            {specialties.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name} ({item.count})
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="container search-page">
        <div className="page-heading">
          <p className="eyebrow">VERIFIED ONLINE COACHING</p>
          <h1>Meet your trainer.</h1>
          <p>Browse approved trainers and choose the coaching style that fits you.</p>
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
          {hasDynamicFilters && (
            <div className="desktop-filter-bar compact-filter-bar">
              {showCategory && (
                <label className="field">
                  Category
                  <select value={filters.category} onChange={(e) => set("category", e.target.value)}>
                    <option value="">All categories</option>
                    {categories.map((item) => (
                      <option key={item.name} value={item.name}>{item.name} ({item.count})</option>
                    ))}
                  </select>
                </label>
              )}
              {showSpecialty && (
                <label className="field">
                  Specialty
                  <select value={filters.specialty} onChange={(e) => set("specialty", e.target.value)}>
                    <option value="">All specialties</option>
                    {specialties.map((item) => (
                      <option key={item.name} value={item.name}>{item.name} ({item.count})</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          <div className="results-area">
            <div className="result-toolbar">
              <div>
                <h2>Approved trainers</h2>
                <p aria-live="polite">{data?.total || 0} available · prices shown per session</p>
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
                <button onClick={clear}>Clear all</button>
              </div>
            )}

            {error ? (
              <div className="empty-state" role="alert">
                <h2>Unable to load trainers.</h2>
                <p>{error}</p>
              </div>
            ) : loading ? (
              <div className="empty-state" role="status">Loading approved trainers…</div>
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
                  <button onClick={clear} className="btn">Show all trainers <ArrowUpRight size={17} /></button>
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
              Show {results.length} trainers <ArrowUpRight size={16} />
            </button>
          </SheetContent>
        </Sheet>
      </div>
    </MotionConfig>
  );
}
