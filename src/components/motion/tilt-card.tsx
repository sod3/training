"use client";
import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, desktopMotionQuery } from "./gsap";

export function TiltCard({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(desktopMotionQuery, () => {
        const card = ref.current!;
        const x = gsap.quickTo(card, "rotationY", {
          duration: 0.65,
          ease: "power3.out",
        });
        const y = gsap.quickTo(card, "rotationX", {
          duration: 0.65,
          ease: "power3.out",
        });
        let bounds: DOMRect;
        const enter = () => {
          bounds = card.getBoundingClientRect();
          gsap.to(card, { y: -4, duration: 0.4 });
        };
        const move = (e: PointerEvent) => {
          if (!bounds) return;
          const px = (e.clientX - bounds.left) / bounds.width;
          const py = (e.clientY - bounds.top) / bounds.height;
          x((px - 0.5) * 5);
          y((0.5 - py) * 5);
          card.style.setProperty("--light-x", `${px * 100}%`);
          card.style.setProperty("--light-y", `${py * 100}%`);
        };
        const leave = () => {
          x(0);
          y(0);
          gsap.to(card, { y: 0, duration: 0.6 });
        };
        card.addEventListener("pointerenter", enter);
        card.addEventListener("pointermove", move);
        card.addEventListener("pointerleave", leave);
        return () => {
          card.removeEventListener("pointerenter", enter);
          card.removeEventListener("pointermove", move);
          card.removeEventListener("pointerleave", leave);
          gsap.killTweensOf(card);
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <article ref={ref} className={`${className} motion-tilt`}>
      {children}
    </article>
  );
}
