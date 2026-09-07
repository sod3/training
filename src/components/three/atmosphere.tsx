"use client";
import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
const Scene = dynamic(() => import("./performance-orb"), { ssr: false });
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function Atmosphere({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const query = matchMedia(
      "(min-width: 769px) and (prefers-reduced-motion: no-preference)",
    );
    let visible = false;
    const update = () =>
      setActive(visible && query.matches && !document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        update();
      },
      { threshold: 0.01 },
    );
    if (ref.current) observer.observe(ref.current);
    query.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      query.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <div
      ref={ref}
      className={`performance-atmosphere ${className}`}
      aria-hidden="true"
    >
      <div className="orb-fallback" />
      {active && (
        <SceneBoundary>
          <Scene />
        </SceneBoundary>
      )}
    </div>
  );
}
