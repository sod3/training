"use client";
import Link from "next/link";
import { useRef } from "react";
import {
  ArrowRight,
  Target,
  Users,
  BadgeCheck,
  CalendarCheck,
} from "lucide-react";
import { gsap, useGSAP, desktopMotionQuery } from "@/components/motion/gsap";
import { SplitHeading } from "@/components/motion/reveal";
const stages = [
  {
    title: "Tell us what you're working toward.",
    copy: "Your goals. Your pace. Your kind of coaching. Start with what matters to you.",
    icon: Target,
    label: "YOUR STARTING POINT",
    tags: ["Build strength", "Move better", "Find consistency"],
  },
  {
    title: "We search trainers built around your goals.",
    copy: "Explore approved coaches through the lens of your preferences, experience and budget.",
    icon: Users,
    label: "A MORE PERSONAL SEARCH",
    tags: ["Your goal", "Your experience", "Your budget"],
  },
  {
    title: "Meet your match.",
    copy: "Real profiles. Clear pricing. Compare the people behind the credentials and find your fit.",
    icon: BadgeCheck,
    label: "CONNECTION, BEFORE COMMITMENT",
    tags: ["Coaching approach", "Reviewed identity", "Session reviews"],
  },
  {
    title: "Book. Train. Progress.",
    copy: "Choose an available session and show up online. Your next chapter starts with one good connection.",
    icon: CalendarCheck,
    label: "MAKE ROOM FOR PROGRESS",
    tags: ["Choose a session", "Meet online", "Keep showing up"],
  },
];
export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(desktopMotionQuery, () => {
        ref.current!.classList.add("story-pinned");
        const panels = gsap.utils.toArray<HTMLElement>(".story-panel");
        gsap.set(panels.slice(1), { autoAlpha: 0, y: 25 });
        const panelsContainer = ref.current!.querySelector<HTMLElement>(".story-panels")!;
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: panelsContainer,
            start: "top 180px",
            end: "+=1900",
            pin: ".story-shell",
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
        stages.slice(1).forEach((_, index) => {
          const at = index + 0.75;
          timeline
            .to(panels[index], { autoAlpha: 0, y: -22, duration: 0.25 }, at)
            .to(
              panels[index + 1],
              { autoAlpha: 1, y: 0, duration: 0.45 },
              at + 0.15,
            )
            .to(
              ".story-progress-fill",
              { scaleX: (index + 2) / 4, duration: 0.5 },
              at,
            );
        });
        timeline.to({}, { duration: 0.3 });
        return () => ref.current?.classList.remove("story-pinned");
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <section ref={ref} className="performance-story" id="how-it-works">
      <div className="container story-shell">
        <div className="story-heading">
          <p className="eyebrow">THE SPOTTER APPROACH</p>
          <SplitHeading
            lines={["A better connection.", "A stronger beginning."]}
          />
        </div>
        <div className="story-panels">
          {stages.map(({ title, copy, icon: Icon, label, tags }, index) => (
            <article className="story-panel" key={title}>
              <div className="story-copy">
                <span className="story-number">0{index + 1} / 04</span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <Link href="/match" className="text-link">
                  Find your fit <ArrowRight size={17} />
                </Link>
              </div>
              <div className={`story-visual stage-${index}`} aria-hidden="true">
                <div className="story-orbit">
                  <Icon size={46} strokeWidth={1} />
                </div>
                <span className="story-visual-label">{label}</span>
                <div className="story-tags">
                  {tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <span className="story-visual-caption">
                  SPOTTER / BUILT AROUND YOU
                </span>
              </div>
            </article>
          ))}
        </div>
        <div className="story-progress" aria-hidden="true">
          <span className="story-progress-fill" />
        </div>
      </div>
    </section>
  );
}
