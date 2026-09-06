"use client";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  MapPin,
  Star,
  BadgeCheck,
  ArrowUpRight,
  Plus,
  Check,
} from "lucide-react";
import { Trainer } from "@/types/trainer";
import { useStore } from "./store";
import { money } from "@/lib/marketplace";
import { VerifiedBadge } from "./verified-badge";
export function TrainerCard({
  trainer: t,
  variant = "default",
}: {
  trainer: Trainer;
  variant?: "default" | "compact" | "horizontal";
}) {
  const { state, update, notify, toggleSaved } = useStore();
  const saved = state.saved.includes(t.id);
  const compared = state.compare.includes(t.id);
  return (
    <article className={"trainer-card " + variant}>
      <div className="trainer-photo">
        <Link
          href={`/trainers/${t.slug}`}
          aria-label={`View ${t.firstName} ${t.lastName}'s profile`}
        >
          <Image
            src={t.profileImage}
            alt={`${t.firstName} ${t.lastName}, personal trainer`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1100px) 45vw, 33vw"
          />
        </Link>
        {t.matchScore !== undefined ? (
          <span className="photo-label match-label">{t.matchScore}% match</span>
        ) : t.verifiedIdentity ? (
          <VerifiedBadge
            className="photo-label"
            credentials={t.verifiedCredentials}
          />
        ) : null}
        <button
          className={`favorite ${saved ? "saved" : ""}`}
          aria-label={`${saved ? "Unsave" : "Save"} ${t.firstName}`}
          aria-pressed={saved}
          onClick={() => void toggleSaved(t.id)}
        >
          <Heart size={19} fill={saved ? "currentColor" : "none"} />
        </button>
        <span className="photo-availability">
          <i />
          {t.nextAvailable}
        </span>
      </div>
      <div className="trainer-content">
        <div className="trainer-name">
          <Link href={`/trainers/${t.slug}`}>
            <h3>
              {t.firstName} {t.lastName}{" "}
              {t.verifiedIdentity && <BadgeCheck size={18} />}
            </h3>
          </Link>
          <span>
            <Star size={13} fill="currentColor" /> {t.rating.toFixed(1)}
          </span>
        </div>
        <p className="trainer-specialty">
          {t.headline.replace(/Certified | Coach| Specialist/g, "")}
        </p>
        <p className="trainer-location">
          <MapPin size={14} />
          1-on-1 Online
        </p>
        <p className="trainer-meta">
          {t.reviewCount} reviews <span>·</span> {t.experienceYears} yrs
          experience
        </p>
        <div className="trainer-price">
          <p>
            <span>From </span>
            <strong>{money(t.basePrice)}</strong>
            <small> / session</small>
          </p>
          <Link href={`/booking?trainer=${t.slug}`} className="trial-link">
            Book session <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="card-secondary">
          <Link href={`/trainers/${t.slug}`}>View profile</Link>
          <button
            aria-pressed={compared}
            onClick={() => {
              if (!compared && state.compare.length >= 3)
                return notify(
                  "Compare up to 3 trainers. Remove one to add another.",
                );
              update({
                compare: compared
                  ? state.compare.filter((id) => id !== t.id)
                  : [...state.compare, t.id],
              });
              notify(
                compared ? "Removed from comparison." : "Added to comparison.",
              );
            }}
          >
            {compared ? <Check size={13} /> : <Plus size={13} />}Compare
          </button>
        </div>
      </div>
    </article>
  );
}
