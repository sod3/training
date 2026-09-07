"use client";
import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, motionQuery, desktopMotionQuery } from "./gsap";
export function HeroMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(motionQuery, () => {
        const timeline = gsap.timeline({
          defaults: { ease: "power4.out", duration: 0.9 },
        });
        timeline
          .from(
            ".spotter-hero-media",
            { scale: 1.07, opacity: 0.6, duration: 1.4 },
            0,
          )
          .from(".eyebrow", { y: 12, opacity: 0 }, 0.1)
          .from(".masked-line > span", { yPercent: 110, stagger: 0.085 }, 0.17)
          .from(".spotter-hero-description", { y: 16, opacity: 0 }, 0.38)
          .from(".hero-actions", { y: 12, opacity: 0 }, 0.48)
          .from(
            ".spotter-hero-trust > span",
            { y: 8, opacity: 0, stagger: 0.07 },
            0.6,
          );
        const video = ref.current?.querySelector("video");
        const observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting && !document.hidden)
            void video?.play().catch(() => {});
          else video?.pause();
        });
        if (ref.current) observer.observe(ref.current);
        const visibility = () => {
          if (document.hidden) video?.pause();
          else if (
            ref.current &&
            ref.current.getBoundingClientRect().bottom > 0
          )
            void video?.play().catch(() => {});
        };
        document.addEventListener("visibilitychange", visibility);
        return () => {
          observer.disconnect();
          video?.pause();
          document.removeEventListener("visibilitychange", visibility);
        };
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        ref.current?.querySelector("video")?.pause();
      });
      mm.add(desktopMotionQuery, () => {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: ref.current,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          })
          .to(".spotter-hero-copy", { y: -65, opacity: 0.15, ease: "none" }, 0)
          .to(".spotter-hero-media", { scale: 1.04, ease: "none" }, 0)
          .to(".spotter-hero-shade", { opacity: 0.95, ease: "none" }, 0);
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <section
      ref={ref}
      className="spotter-hero cinematic-hero"
      aria-labelledby="spotter-hero-title"
    >
      {children}
    </section>
  );
}
