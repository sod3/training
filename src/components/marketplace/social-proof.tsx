"use client";
import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
function Counter({
  end,
  suffix,
  decimal = 0,
}: {
  end: number;
  suffix: string;
  decimal?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const [n, setN] = useState(end);
  useEffect(() => {
    if (!visible || reduced) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 950, 1);
      setN(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, reduced, end]);
  return (
    <span ref={ref} aria-label={`${end}${suffix}`}>
      <span aria-hidden>
        {n.toLocaleString("en-US", {
          minimumFractionDigits: decimal,
          maximumFractionDigits: decimal,
        })}
        {suffix}
      </span>
    </span>
  );
}
export function SocialProof() {
  return (
    <>
      <section
        className="container metrics"
        aria-label="Illustrative marketplace statistics"
      >
        {[
          [100, "+", "Verified trainers"],
          [2500, "+", "Sessions booked"],
          [4.9, "★", "Average client rating"],
          [92, "%", "Would book again"],
        ].map(([n, s, l]) => (
          <div key={l}>
            <strong>
              <Counter
                end={Number(n)}
                suffix={String(s)}
                decimal={n === 4.9 ? 1 : 0}
              />
            </strong>
            <span>{l}</span>
          </div>
        ))}
        <small className="metrics-note">Illustrative demo figures</small>
      </section>
      <div
        className="marquee"
        aria-label="Verified trainers. Real reviews. Train at home. Transparent pricing. Online coaching. Book in minutes."
      >
        <div aria-hidden>
          {[0, 1].map((i) => (
            <span key={i}>
              VERIFIED TRAINERS <b>✳</b> REAL REVIEWS <b>✳</b> TRAIN AT HOME{" "}
              <b>✳</b> TRANSPARENT PRICING <b>✳</b> ONLINE COACHING <b>✳</b>{" "}
              BOOK IN MINUTES <b>✳</b>{" "}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
