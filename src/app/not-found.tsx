import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export default function NotFound() {
  return (
    <div className="container not-found">
      <p className="eyebrow">404 / A SMALL DETOUR</p>
      <span className="not-found-number">404↗</span>
      <h1>Looks like this workout moved.</h1>
      <p>Let’s get you back to a good starting point.</p>
      <div className="flex gap-4 flex-wrap">
        <Link className="btn" href="/">
          Back home
        </Link>
        <Link className="btn outline" href="/trainers">
          Find a trainer <ArrowUpRight size={17} />
        </Link>
      </div>
    </div>
  );
}
