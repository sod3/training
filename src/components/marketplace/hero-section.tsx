import { HeroMotion } from "@/components/motion/hero-motion";
import { Atmosphere } from "@/components/three/atmosphere";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Check } from "lucide-react";

export function HeroSection() {
  return (
    <HeroMotion>
      <div className="spotter-hero-media" aria-hidden="true">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/media/hero-poster.webp"
          className="premium-video hero-desktop-video"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <Image
          src="/media/how-it-works.avif"
          alt=""
          fill
          priority
          quality={90}
          className="hero-mobile-image"
          sizes="100vw"
        />
        <div className="spotter-hero-shade" />
      </div>

      <Atmosphere className="hero-atmosphere" />
      <div className="container spotter-hero-content">
        <div className="spotter-hero-copy">
          <p className="eyebrow hero-enter">
            <span className="live-dot" /> VERIFIED ONLINE PERSONAL TRAINING
          </p>
          <h1 id="spotter-hero-title">
            {["Train Better.", "Wherever", "You Are."].map((line) => (
              <span className="masked-line" key={line}>
                <span>{line}</span>
              </span>
            ))}
          </h1>
          <div className="hero-enter hero-enter-copy">
            <p className="spotter-hero-description">
              Find a trainer matched to your goals, schedule and training style.
            </p>
            <div className="hero-actions">
              <Link href="/match" className="btn lime hero-main-cta">
                Get Matched <ArrowRight size={18} />
              </Link>
              <Link href="/trainers" className="hero-secondary-link">
                Explore trainers <ArrowRight size={15} />
              </Link>
            </div>
            <div
              className="spotter-hero-trust"
              aria-label="Spotter trust features"
            >
              <span>
                <Check size={13} /> Identity reviewed
              </span>
              <span>
                <Check size={13} /> Transparent pricing
              </span>
              <span>
                <Check size={13} /> Live 1-on-1 coaching
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container hero-bottom">
        <a href="#trainers" aria-label="Explore featured trainers">
          <ArrowDown size={16} /> MEET THE COACHES
        </a>
        <span>
          ONLINE COACHING <i /> BUILT AROUND YOU
        </span>
      </div>
    </HeroMotion>
  );
}
