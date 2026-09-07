"use client";
import { usePathname } from "next/navigation";
import { MotionConfig } from "framer-motion";
import { type ReactNode } from "react";
import { gsap, useGSAP, desktopMotionQuery } from "./gsap";

export function SiteMotion({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(desktopMotionQuery, () => {
        const cleanups = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".btn.lime, .trial-link, .home-match-cta",
          ),
        ).map((button) => {
          let bounds: DOMRect;
          const x = gsap.quickTo(button, "x", {
            duration: 0.5,
            ease: "power3.out",
          });
          const y = gsap.quickTo(button, "y", {
            duration: 0.5,
            ease: "power3.out",
          });
          const enter = () => {
            bounds = button.getBoundingClientRect();
          };
          const move = (e: PointerEvent) => {
            if (bounds) {
              x(((e.clientX - bounds.left) / bounds.width - 0.5) * 10);
              y(((e.clientY - bounds.top) / bounds.height - 0.5) * 8);
            }
          };
          const leave = () => {
            x(0);
            y(0);
          };
          button.addEventListener("pointerenter", enter);
          button.addEventListener("pointermove", move);
          button.addEventListener("pointerleave", leave);
          return () => {
            button.removeEventListener("pointerenter", enter);
            button.removeEventListener("pointermove", move);
            button.removeEventListener("pointerleave", leave);
            gsap.killTweensOf(button);
            gsap.set(button, { clearProps: "transform" });
          };
        });
        return () => cleanups.forEach((cleanup) => cleanup());
      });
      return () => mm.revert();
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
