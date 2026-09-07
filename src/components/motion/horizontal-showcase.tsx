"use client";
import { useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP, desktopMotionQuery } from "./gsap";
export function HorizontalShowcase({
  children,
  count,
}: {
  children: ReactNode;
  count: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (count < 3) return;
      const mm = gsap.matchMedia();
      mm.add(desktopMotionQuery, () => {
        const root = ref.current!;
        const track = root.querySelector<HTMLElement>(".showcase-track")!;
        const distance = () =>
          Math.max(0, track.scrollWidth - root.clientWidth);
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top 125px",
            end: () => `+=${Math.max(350, distance())}`,
            pin: true,
            scrub: 0.55,
            invalidateOnRefresh: true,
          },
        });
        const focus = (event: FocusEvent) => {
          const item = (event.target as HTMLElement).closest<HTMLElement>(
            ".trainer-card",
          );
          const trigger = tween.scrollTrigger;
          if (item && trigger && distance() > 0) {
            const progress = Math.min(
              1,
              Math.max(0, item.offsetLeft / distance()),
            );
            window.scrollTo({
              top: trigger.start + progress * (trigger.end - trigger.start),
              behavior: "instant",
            });
          }
        };
        root.addEventListener("focusin", focus);
        const resize = new ResizeObserver(() => ScrollTrigger.refresh());
        resize.observe(root);
        return () => {
          resize.disconnect();
          root.removeEventListener("focusin", focus);
        };
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [count], revertOnUpdate: true },
  );
  return (
    <div
      ref={ref}
      className={`horizontal-showcase ${count >= 3 ? "showcase-wide" : ""}`}
    >
      <div className="showcase-track">{children}</div>
    </div>
  );
}
