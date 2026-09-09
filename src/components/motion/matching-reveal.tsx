"use client";
import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, motionQuery } from "./gsap";
export function MatchingReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(motionQuery, () => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: ref.current,
            start: "top 80%",
            once: true,
          },
        });
        timeline
          .from(".matching-node", {
            scale: 0.4,
            opacity: 0,
            stagger: 0.04,
            duration: 0.4,
            ease: "power3.out",
          })
          .to(
            ".matching-node",
            {
              x: 0,
              y: 0,
              scale: 0.2,
              opacity: 0,
              duration: 0.5,
              ease: "power4.inOut",
            },
            0.55,
          )
          .to(".matching-label", { opacity: 0, duration: 0.2 }, 0.85)
          .from(
            ".matched-content",
            { opacity: 0.25, y: 12, duration: 0.6, ease: "power3.out" },
            0.75,
          )
          .to(".matching-signature", { autoAlpha: 0, duration: 0.2 }, 1.25);
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className="matching-reveal">
      <div className="matching-signature" aria-hidden="true">
        <div className="matching-network">
          {Array.from({ length: 7 }, (_, i) => (
            <i
              key={i}
              className="matching-node"
              style={{
                transform: `translate(${Math.cos((i * Math.PI * 2) / 7) * 48}px, ${Math.sin((i * Math.PI * 2) / 7) * 26}px)`,
              }}
            />
          ))}
        </div>
        <span className="matching-label">YOUR GOALS. YOUR COACHES.</span>
      </div>
      <div className="matched-content">{children}</div>
    </div>
  );
}
