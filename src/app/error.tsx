"use client";
import Link from "next/link";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container section empty-state">
      <h1>A little pause in the plan.</h1>
      <p>Something went wrong loading this page. Give it another try.</p>
      <button className="btn" onClick={reset}>
        Try again
      </button>
      <Link href="/trainers" className="text-link">
        Explore trainers →
      </Link>
    </div>
  );
}
