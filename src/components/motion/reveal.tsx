"use client";
import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, motionQuery } from "./gsap";
export function Reveal({
  children,
  className = "",
  delay = 0,
  start = "top 82%",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(motionQuery, () => {
        gsap.from(ref.current, {
          opacity: 0,
          y: 18,
          duration: 0.8,
          delay,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start, once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={"motion-reveal " + className}>
      {children}
    </div>
  );
}
export function SplitHeading({
  lines,
  className = "",
  id,
  start = "top 85%",
}: {
  lines: string[];
  className?: string;
  id?: string;
  start?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(motionQuery, () => {
        gsap.from(".heading-line", {
          yPercent: 110,
          duration: 1,
          stagger: 0.08,
          ease: "power4.out",
          scrollTrigger: { trigger: ref.current, start, once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <h2 ref={ref} id={id} className={className}>
      {lines.map((line) => (
        <span className="heading-mask" key={line}>
          <span className="heading-line">{line}</span>
        </span>
      ))}
    </h2>
  );
}
export function ImageReveal({
  children,
  className = "",
  start = "top 78%",
}: {
  children: ReactNode;
  className?: string;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(motionQuery, () => {
        gsap.from(ref.current, {
          clipPath: "inset(8% 0 8% 0)",
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start, once: true },
        });
        gsap.from("img", {
          scale: 1.08,
          duration: 1.3,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start, once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={"motion-image " + className}>
      {children}
    </div>
  );
}
export function AnimatedCounter({
  value,
  suffix = "",
  start = "top 85%",
}: {
  value: number;
  suffix?: string;
  start?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(motionQuery, () => {
        const counter = { value: 0 };
        gsap.to(counter, {
          value,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start, once: true },
          onUpdate: () => {
            if (ref.current)
              ref.current.textContent = `${Math.round(counter.value)}${suffix}`;
          },
        });
      });
      return () => {
        mm.revert();
        if (ref.current) ref.current.textContent = `${value}${suffix}`;
      };
    },
    { dependencies: [value, suffix], revertOnUpdate: true },
  );
  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}
