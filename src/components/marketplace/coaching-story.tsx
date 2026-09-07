import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal, ImageReveal } from "@/components/motion/reveal";

export function CoachingStory() {
  return (
    <section className="coaching-story" aria-labelledby="coaching-story-title">
      <div className="coaching-story-grid">
        <ImageReveal className="coaching-story-media">
          <Image
            src="/images/coaching.webp"
            alt="A personal trainer coaching a client through an exercise"
            fill
            sizes="(max-width: 800px) 100vw, 58vw"
            className="premium-image"
          />
          <span className="editorial-caption">COACHING, NOT CONTENT</span>
        </ImageReveal>
        <Reveal className="coaching-story-copy">
          <p className="eyebrow"><span className="section-index">03 /</span> PERSONAL BY DESIGN</p>
          <h2 id="coaching-story-title">
            Personal coaching,
            <span> actually personal.</span>
          </h2>
          <p>
            A trainer who understands your goal, adapts the session and shows up
            live — with attention that a generic workout plan cannot give you.
          </p>
          <Link href="/how-it-works" className="text-link editorial-link">
            See how Spotter works <ArrowUpRight size={16} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
