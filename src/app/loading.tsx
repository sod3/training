export default function Loading() {
  return (
    <div className="container section" aria-label="Loading page" role="status">
      <div className="skeleton-heading" />
      <div className="trainer-grid">
        {[0, 1, 2].map((i) => (
          <div className="skeleton-panel" key={i}>
            <div className="skeleton-image" />
            <div className="skeleton-heading" />
            <div className="skeleton-line" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading your next chapter…</span>
    </div>
  );
}
