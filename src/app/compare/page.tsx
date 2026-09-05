"use client";
import Link from "next/link";
import Image from "next/image";
import { X, Columns3 } from "lucide-react";
import { useStore } from "@/components/marketplace/store";
import { trainers } from "@/data/trainers";
import { money } from "@/lib/marketplace";
export default function Page() {
  const { state, update } = useStore();
  const selected = trainers.filter((t) => state.compare.includes(t.id));
  return (
    <div className="container section">
      <div className="page-heading">
        <p className="eyebrow">A LITTLE PERSPECTIVE HELPS</p>
        <h1>Find your best fit.</h1>
        <p>Compare up to three coaches, side by side.</p>
      </div>
      {!selected.length ? (
        <div className="empty-state">
          <Columns3 size={38} />
          <h2>Meet a few good options first.</h2>
          <p>Add trainers to compare from any trainer card.</p>
          <Link href="/trainers" className="btn">
            Explore trainers →
          </Link>
        </div>
      ) : (
        <div className="comparison-scroll">
          <div
            className="comparison-grid"
            style={{
              gridTemplateColumns: `repeat(${selected.length}, minmax(245px, 1fr))`,
            }}
          >
            {selected.map((t) => (
              <article className="panel" key={t.id}>
                <button
                  className="float-right icon-button"
                  aria-label={`Remove ${t.firstName} from comparison`}
                  onClick={() =>
                    update({
                      compare: state.compare.filter((id) => id !== t.id),
                    })
                  }
                >
                  <X size={17} />
                </button>
                <Image
                  src={t.profileImage}
                  alt={t.firstName}
                  width={80}
                  height={90}
                  className="rounded-xl mb-5"
                />
                <h2>
                  {t.firstName} {t.lastName}
                </h2>
                <dl className="comparison-details">
                  {[
                    ["Session price", money(t.basePrice)],
                    ["Rating", `${t.rating} · ${t.reviewCount} reviews`],
                    ["Experience", `${t.experienceYears} years`],
                    ["Specialties", t.specialties.join(", ")],
                    ["Locations", t.locations.join(", ")],
                    ["Training", t.trainingTypes.join(" · ")],
                    ["Next available", t.nextAvailable],
                    [
                      "Verification",
                      t.verifiedCredentials
                        ? "Identity & credentials"
                        : "Identity verified",
                    ],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <Link
                  href={`/booking?trainer=${t.slug}`}
                  className="btn w-full"
                >
                  Book trial ↗
                </Link>
                <Link href={`/trainers/${t.slug}`} className="text-link mt-4">
                  View profile →
                </Link>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
