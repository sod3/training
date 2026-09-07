"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, Heart, Plus, Star } from "lucide-react";
import type { Trainer } from "@/types/trainer";
import { useStore } from "./store";
import { localAvailabilityLabel, money } from "@/lib/marketplace";
import { VerifiedBadge } from "./verified-badge";

export function TrainerCard({
  trainer: t,
  variant = "default",
}: {
  trainer: Trainer;
  variant?: "default" | "compact" | "horizontal" | "featured";
}) {
  const { state, update, notify, toggleSaved } = useStore();
  const saved = state.saved.includes(t.id);
  const compared = state.compare.includes(t.id);
  const specialty = t.specialties.slice(0, 2).join(" · ") || t.category || t.headline;

  return (
    <article className={`trainer-card ${variant}`}>
      <div className="trainer-photo">
        <Link href={`/trainers/${t.slug}`} aria-label={`View ${t.firstName} ${t.lastName}'s profile`}>
          <Image
            src={t.profileImage || "/media/fallback-trainer-profile.avif"}
            alt={`${t.firstName} ${t.lastName}, personal trainer`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1100px) 48vw, 33vw"
          />
        </Link>
        {t.matchScore !== undefined ? (
          <span className="photo-label match-label">{t.matchScore}% match</span>
        ) : t.verifiedIdentity ? (
          <VerifiedBadge className="photo-label" credentials={t.verifiedCredentials} />
        ) : null}
        <button
          className={`favorite ${saved ? "saved" : ""}`}
          aria-label={`${saved ? "Unsave" : "Save"} ${t.firstName}`}
          aria-pressed={saved}
          onClick={() => void toggleSaved(t.id)}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        <span className="photo-availability"><i /> {localAvailabilityLabel(t)}</span>
      </div>

      <div className="trainer-content">
        <div className="trainer-name">
          <div>
            <Link href={`/trainers/${t.slug}`}>
              <h3>
                {t.firstName} {t.lastName}
                {t.verifiedIdentity && <BadgeCheck size={16} aria-label="Identity reviewed" />}
              </h3>
            </Link>
            <p className="trainer-specialty">{specialty}</p>
          </div>
          {t.reviewCount > 0 && (
            <span className="trainer-rating"><Star size={12} fill="currentColor" /> {t.rating.toFixed(1)}</span>
          )}
        </div>

        <div className="trainer-card-facts">
          {t.experienceYears > 0 && <span>{t.experienceYears} yrs experience</span>}
          {t.reviewCount > 0 && <span>{t.reviewCount} verified-session {t.reviewCount === 1 ? "review" : "reviews"}</span>}
          <span>Live online</span>
        </div>

        <div className="trainer-price">
          {t.packages.length ? (
            <p><span>From</span> <strong>{money(t.basePrice)}</strong><small> / session</small></p>
          ) : (
            <p><span>Packages coming soon</span></p>
          )}
          <Link href={`/trainers/${t.slug}`} className="trial-link">View profile <ArrowRight size={15} /></Link>
        </div>

        <div className="card-secondary" aria-label="Trainer card secondary actions">
          {t.packages.length > 0 && <Link href={`/booking?trainer=${t.slug}`}>Book session</Link>}
          <button
            aria-pressed={compared}
            onClick={() => {
              if (!compared && state.compare.length >= 3) {
                return notify("Compare up to 3 trainers. Remove one to add another.");
              }
              update({
                compare: compared
                  ? state.compare.filter((id) => id !== t.id)
                  : [...state.compare, t.id],
              });
              notify(compared ? "Removed from comparison." : "Added to comparison.");
            }}
          >
            {compared ? <Check size={12} /> : <Plus size={12} />}
            {compared ? "Compared" : "Compare"}
          </button>
        </div>
      </div>
    </article>
  );
}
