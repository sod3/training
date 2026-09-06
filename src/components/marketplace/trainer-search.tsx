"use client";
import { useState } from "react";

import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  MapPin,
  Search,
  SlidersHorizontal,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useApi } from "@/lib/client-api";
import type { Trainer } from "@/types/trainer";
import { goals, locations, money } from "@/lib/marketplace";
import { TrainerCard } from "./trainer-card";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
export function TrainerSearch({
  initial,
}: {
  initial: Record<string, string>;
}) {
  const [filters, setFilters] = useState({
    q: initial.q || "",
    goal: initial.goal || "",
    availability: initial.availability || "",
    price: initial.price || "5000",
    rating: initial.rating || "0",
    experience: initial.experience || "0",
    verified: initial.verified === "false" ? "" : "true",
  });
  const [sort, setSort] = useState(initial.sort || "recommended");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const set = (key: string, value: string) => {
    setPage(1);
    const next = { ...filters, [key]: value };
    setFilters(next);
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (k === "verified") params.set(k, v || "false");
      else if (v) params.set(k, v);
    });
    window.history.replaceState(null, "", `/trainers?${params}`);
  };
  const clear = () => {
    setFilters({
      q: "",
      goal: "",
      availability: "",
      price: "5000",
      rating: "0",
      experience: "0",
      verified: "true",
    });
    window.history.replaceState(null, "", "/trainers");
  };
  const { data, error, loading } = useApi<{
    trainers: Trainer[];
    total: number;
    pages: number;
  }>(
    `trainers?${new URLSearchParams({ ...filters, sort, page: String(page) })}`,
  );
  const results = data?.trainers || [];
  const chips = Object.entries(filters).filter(
    ([k, v]) => v && !["price", "rating", "experience", "verified"].includes(k),
  );
  const count =
    chips.length +
    Number(filters.price !== "5000") +
    Number(filters.rating !== "0") +
    Number(filters.experience !== "0");
  const filterUI = (
    <>
      <div className="filter-title">
        <h3>Refine your search</h3>
        <button onClick={clear}>Reset</button>
      </div>

      <label className="field">
        Your goal
        <select
          value={filters.goal}
          onChange={(e) => set("goal", e.target.value)}
        >
          <option value="">All goals</option>
          {goals.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </label>

      <label className="field">
        Up to {money(Number(filters.price))} / session
        <input
          aria-label="Maximum session price"
          type="range"
          min="1500"
          max="5000"
          step="500"
          value={filters.price}
          onChange={(e) => set("price", e.target.value)}
        />
        <span className="range-labels">
          <span>Rs. 1,500</span>
          <span>Rs. 5,000</span>
        </span>
      </label>
      <label className="field">
        Availability
        <select
          value={filters.availability}
          onChange={(e) => set("availability", e.target.value)}
        >
          <option value="">Any time</option>
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="week">This week</option>
        </select>
      </label>
      <label className="field">
        Rating
        <select
          value={filters.rating}
          onChange={(e) => set("rating", e.target.value)}
        >
          <option value="0">All ratings</option>
          <option value="4.5">4.5 and above</option>
          <option value="4.9">4.9 and above</option>
        </select>
      </label>
      <label className="field">
        Experience
        <select
          value={filters.experience}
          onChange={(e) => set("experience", e.target.value)}
        >
          <option value="0">Any experience</option>
          <option value="3">3+ years</option>
          <option value="5">5+ years</option>
        </select>
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={!!filters.verified}
          onChange={(e) => set("verified", e.target.checked ? "true" : "")}
        />
        Identity verified
      </label>
    </>
  );
  return (
    <MotionConfig reducedMotion="user">
      <div className="container search-page">
        <div className="page-heading">
          <p className="eyebrow">YOUR PEOPLE ARE OUT THERE</p>
          <h1>Find your trainer.</h1>
          <p>Professionals matched to your goals.</p>
        </div>
        <div className="search-input">
          <Search size={19} />
          <input
            aria-label="Search trainers or specialties"
            placeholder="Search by name or specialty…"
            value={filters.q}
            onChange={(e) => set("q", e.target.value)}
          />
          <span>
            1-on-1 Online
          </span>
        </div>
        <div className="search-layout">
          <div className="desktop-filter-bar compact-filter-bar">
            {!open && (
              <>

                <label className="field">
                  Goal
                  <select
                    value={filters.goal}
                    onChange={(e) => set("goal", e.target.value)}
                  >
                    <option value="">All goals</option>
                    {goals.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Price · up to {money(Number(filters.price))}
                  <input
                    aria-label="Maximum session price"
                    type="range"
                    min="1500"
                    max="5000"
                    step="500"
                    value={filters.price}
                    onChange={(e) => set("price", e.target.value)}
                  />
                </label>
                <label className="field">
                  Availability
                  <select
                    value={filters.availability}
                    onChange={(e) => set("availability", e.target.value)}
                  >
                    <option value="">Any time</option>
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="week">This week</option>
                  </select>
                </label>

              </>
            )}
          </div>
          <div className="results-area">
            <div className="result-toolbar">
              <div>
                <h2>
                  Meet your next coach
                </h2>
                <p aria-live="polite">
                  {data?.total || 0} trainers · Prices shown per session
                </p>
              </div>
              <div className="result-controls">
                <button
                  className="btn outline small all-filters"
                  onClick={() => setOpen(true)}
                >
                  <SlidersHorizontal size={15} />
                  Filters {count || ""}
                </button>
                <select
                  aria-label="Sort trainers"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="recommended">Recommended</option>
                  <option value="experience">Most experienced</option>
                  <option value="rating">Highest rated</option>
                  <option value="soon">Available soonest</option>
                  <option value="low">Price: low to high</option>
                  <option value="high">Price: high to low</option>
                </select>
              </div>
            </div>
            {count > 0 && (
              <div className="active-filters">
                {chips.map(([k, v]) => (
                  <button key={k} onClick={() => set(k, "")}>
                    {v}
                    <X size={12} />
                  </button>
                ))}
                {filters.price !== "5000" && (
                  <button onClick={() => set("price", "5000")}>
                    Up to {money(Number(filters.price))}
                    <X size={12} />
                  </button>
                )}
                {filters.rating !== "0" && (
                  <button onClick={() => set("rating", "0")}>
                    {filters.rating}+ stars
                    <X size={12} />
                  </button>
                )}
                {filters.experience !== "0" && (
                  <button onClick={() => set("experience", "0")}>
                    {filters.experience}+ years
                    <X size={12} />
                  </button>
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
              <div className="empty-state" role="status">
                Finding your trainers…
              </div>
            ) : results.length === 0 ? (
              <div className="empty-state">
                <Search size={36} />
                <h2>No exact matches yet.</h2>
                <p>
                  Try another area, a higher budget, or a different training
                  preference.
                </p>
                <button onClick={clear} className="btn">
                  Clear filters <ArrowUpRight size={17} />
                </button>
              </div>
            ) : (
              <motion.div layout className="search-results">
                <AnimatePresence>
                  {results.map((t) => (
                    <motion.div
                      layout
                      key={t.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TrainerCard trainer={t} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
        {data && data.pages > 1 && (
          <div className="pagination">
            <button
              className="btn outline small"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>
              {page} / {data.pages}
            </span>
            <button
              className="btn outline small"
              disabled={page >= data.pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="filter-sheet">
            <SheetTitle>Find your fit</SheetTitle>
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
