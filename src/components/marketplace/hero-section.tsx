import Link from "next/link";
import { ArrowRight, ArrowDown, Check, MapPin } from "lucide-react";

export function HeroSection() {
  return (
    <section className="spotter-hero">
      <div className="spotter-hero-media" aria-hidden="true">
        <video
          src="/Trainer.mp4"
          poster="/images/coaching.webp"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
        <div className="spotter-hero-shade" />
      </div>
      <div className="container spotter-hero-content">
        <p className="eyebrow hero-enter">
          <span className="live-dot" /> VERIFIED PERSONAL TRAINING · KARACHI
        </p>
        <h1>
          {["Your trainer.", "Your schedule.", "Your city."].map((line, i) => (
            <span className="masked-line" key={line}>
              <span style={{ animationDelay: `${0.08 + i * 0.1}s` }}>{line}</span>
            </span>
          ))}
        </h1>
        <div className="hero-enter hero-enter-copy">
          <p className="spotter-hero-description">
            Find a personal trainer who fits your goals, location and the way
            you actually want to train.
          </p>
          <div className="hero-actions">
            <Link href="/match" className="btn lime hero-main-cta">
              Find my trainer <ArrowRight size={20} />
            </Link>
            <Link href="/trainers" className="hero-secondary-link">
              Browse trainers <ArrowRight size={16} />
            </Link>
          </div>
          <div className="spotter-hero-trust">
            <span>
              <Check size={14} /> Identity status
            </span>
            <span>
              <Check size={14} /> Clear pricing
            </span>
            <span>
              <Check size={14} /> Flexible training
            </span>
          </div>
        </div>
      </div>
      <div className="container hero-bottom">
        <a href="#trainers" aria-label="Explore featured trainers">
          <ArrowDown size={17} /> MEET THE COACHES
        </a>
        <span>
          <MapPin size={14} /> STARTING IN KARACHI <i /> BUILT AROUND YOU
        </span>
      </div>
    </section>
  );
}
