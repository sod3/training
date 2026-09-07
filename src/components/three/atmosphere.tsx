export function Atmosphere({ className = "" }: { className?: string }) {
  return (
    <div className={`performance-atmosphere ${className}`} aria-hidden="true">
      <div className="orb-fallback" />
    </div>
  );
}
