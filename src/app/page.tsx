import type { Metadata } from "next";
export const metadata: Metadata = { alternates: { canonical: "/" } };
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroSection } from "@/components/marketplace/hero-section";
import { TrainerCard } from "@/components/marketplace/trainer-card";
import { Reveal } from "@/components/motion/reveal";
import { HomeMatchExperience } from "@/components/marketplace/home-match-experience";
import { TrustSection } from "@/components/marketplace/trust-section";
import { CoachingStory } from "@/components/marketplace/coaching-story";
import { getFeaturedTrainers } from "@/lib/services/trainers";
export const dynamic = "force-dynamic";

export default async function Home() {
  const baseUrl = (process.env.APP_URL || "https://training-seven-taupe.vercel.app").replace(/\/$/, "");
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "Spotter",
        url: baseUrl,
        description: "Online marketplace for discovering and booking verified personal trainers.",
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: "Spotter",
        publisher: { "@id": `${baseUrl}/#organization` },
      },
    ],
  };
  let trainers: import("@/types/trainer").Trainer[] = [];
  let unavailable = false;
  try {
    trainers = await getFeaturedTrainers();
  } catch {
    unavailable = true;
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <HeroSection />
      <section className="section container featured-section" id="trainers">
        <Reveal>
          <div className="featured-intro-grid">
            <div>
              <p className="eyebrow">
                <span className="section-index">01 /</span> FEATURED COACHES
              </p>
              <h2>
                Find someone worth
                <span className="quiet-heading"> showing up for.</span>
              </h2>
            </div>
            <div className="featured-intro-copy">
              <p>
                Approved online trainers selected around your goals, schedule
                and coaching style.
              </p>
              <Link href="/trainers" className="text-link">
                Explore all trainers <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </Reveal>
        <div className={`featured-grid count-${Math.min(trainers.length, 3)}`}>
          {trainers.slice(0, 3).map((t) => (
            <TrainerCard key={t.id} trainer={t} variant="featured" />
          ))}
          {trainers.length > 0 && trainers.length < 3 && (
            <p className="featured-availability-note">
              More approved trainer profiles will appear here as they become
              available.
            </p>
          )}
        </div>
        {!trainers.length && (
          <div className="empty-state compact">
            <h3>
              {unavailable
                ? "Trainer discovery is temporarily unavailable."
                : "Your next coach is on the way."}
            </h3>
            <p>
              {unavailable
                ? "Please try again shortly."
                : "Approved trainers will appear here when they are ready to take bookings."}
            </p>
            <Link href="/become-a-trainer" className="text-link">
              Join as a trainer →
            </Link>
          </div>
        )}
      </section>
      <HomeMatchExperience trainers={trainers} />
      <CoachingStory />
      <TrustSection />
      <section className="spotter-final">
        <div className="container">
          <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
          <div>
            <h2>
              The right trainer
              <br />
              changes everything<span>.</span>
            </h2>
            <div className="spotter-final-actions">
              <Link href="/match" className="btn lime">
                Get Matched <ArrowRight size={20} />
              </Link>
              <Link href="/trainers" className="spotter-final-secondary">
                Explore Trainers <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <p>One good match. A better way to train.</p>
        </div>
      </section>
    </>
  );
}
