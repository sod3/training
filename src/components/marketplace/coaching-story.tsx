import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Video, Dumbbell, ShieldCheck } from "lucide-react";
import { Reveal, SplitHeading, ImageReveal } from "@/components/motion/reveal";

interface CoachingStoryProps {
  imageSrc?: string;
  imageAlt?: string;
}

export function CoachingStory({ imageSrc, imageAlt }: CoachingStoryProps) {
  const benefits = [
    "No gym required",
    "Private live coaching",
    "Train with equipment you already own",
    "Sessions built around your level",
    "Strength and muscle-building from home",
  ];

  return (
    <section className="coaching-story" aria-labelledby="coaching-story-title">
      <div className="coaching-story-grid">
        <ImageReveal className="coaching-story-media">
          {imageSrc ? (
            <>
              <Image
                src={imageSrc}
                alt={
                  imageAlt ||
                  "Woman strength training from home with online personal trainer"
                }
                fill
                sizes="(max-width: 800px) 100vw, 58vw"
                className="premium-image"
              />
              <span className="editorial-caption">TRAIN FROM HOME</span>
            </>
          ) : (
            <div className="coaching-story-visual-card">
              <div className="visual-card-ambient" />
              <div className="visual-card-content">
                <div className="visual-card-badge">
                  <span className="live-dot" />
                  <span>FOR WOMEN / TRAIN FROM HOME</span>
                </div>
                <h3 className="visual-card-title">
                  Real strength training. <br />
                  In the comfort of home.
                </h3>
                <p className="visual-card-subtitle">
                  Live 1-on-1 video sessions with expert trainers dedicated to
                  progressive overload, proper form, and long-term results.
                </p>
                <div className="visual-card-highlights">
                  <div className="visual-card-highlight">
                    <Video size={18} className="highlight-icon" />
                    <div>
                      <strong>1-on-1 Live Video</strong>
                      <span>Real-time cues & form feedback</span>
                    </div>
                  </div>
                  <div className="visual-card-highlight">
                    <Dumbbell size={18} className="highlight-icon" />
                    <div>
                      <strong>Your Own Space</strong>
                      <span>Dumbbells, bands or bodyweight</span>
                    </div>
                  </div>
                  <div className="visual-card-highlight">
                    <ShieldCheck size={18} className="highlight-icon" />
                    <div>
                      <strong>100% Private</strong>
                      <span>Zero gym anxiety or wait times</span>
                    </div>
                  </div>
                </div>
                <div className="visual-card-footer">
                  <span className="footer-tag">
                    ✦ PERSONALIZED HYPERTROPHY & STRENGTH
                  </span>
                </div>
              </div>
            </div>
          )}
        </ImageReveal>

        <Reveal className="coaching-story-copy">
          <p className="eyebrow coaching-story-eyebrow">
            <span className="section-index">03 /</span> FOR WOMEN / TRAIN FROM HOME
          </p>
          <SplitHeading
            id="coaching-story-title"
            lines={["Build strength.", "On your terms.", "From home."]}
            className="coaching-story-heading"
          />
          <p className="coaching-story-lead">
            Live one-to-one coaching built around your goals, your space, your
            equipment and your schedule.
          </p>

          <ul className="coaching-story-benefits" role="list">
            {benefits.map((benefit) => (
              <li key={benefit} className="coaching-story-benefit-item">
                <span className="benefit-check-icon">
                  <Check size={13} strokeWidth={2.8} />
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="coaching-story-actions">
            <Link href="/match" className="btn lime coaching-story-cta">
              <span>FIND MY TRAINER</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
