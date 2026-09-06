import type { Metadata } from "next";
export const metadata: Metadata = { alternates: { canonical: "/" } };
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { HeroSection } from "@/components/marketplace/hero-section";
import { TrainerCard } from "@/components/marketplace/trainer-card";
import { Reveal } from "@/components/motion/reveal";
import { HomeMatchExperience } from "@/components/marketplace/home-match-experience";
import { TrustSection } from "@/components/marketplace/trust-section";
import { getFeaturedTrainers } from "@/lib/services/trainers";
export const dynamic = "force-dynamic";

export default async function Home() {
  let trainers: import("@/types/trainer").Trainer[] = [];
  let unavailable = false;
  try {
    trainers = await getFeaturedTrainers();
  } catch {
    unavailable = true;
  }
  return (
    <>
      <HeroSection />
      <section className="section container featured-section" id="trainers">
        <Reveal>
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <span className="section-index">01 /</span> TRAIN WITH THE BEST
              </p>
              <h2>
                Good people.{" "}
                <span className="quiet-heading">Great training.</span>
              </h2>
            </div>
            <Link href="/trainers" className="text-link">
              Explore all trainers <ArrowUpRight size={18} />
            </Link>
          </div>
        </Reveal>
        <div className="featured-grid">
          {trainers.slice(0, 3).map((t) => (
            <TrainerCard key={t.id} trainer={t} />
          ))}
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
            <Link href="/match" className="btn lime">
              Get Matched <ArrowRight size={20} />
            </Link>
          </div>
          <p>One good match. A better way to train.</p>
        </div>
      </section>
    </>
  );
}
