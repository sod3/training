export function TrainerCardSkeleton() {
  return (
    <article className="trainer-card trainer-card-skeleton" aria-hidden="true">
      <div className="trainer-photo skeleton-block" />
      <div className="trainer-content">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line skeleton-copy" />
        <div className="skeleton-line skeleton-meta" />
        <div className="skeleton-price-row">
          <div className="skeleton-line skeleton-price" />
          <div className="skeleton-line skeleton-link" />
        </div>
      </div>
    </article>
  );
}
