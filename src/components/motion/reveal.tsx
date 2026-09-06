import type { ReactNode, CSSProperties } from "react";
/** Native scroll-driven reveals; unsupported browsers render content immediately. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={"reveal " + className}
      style={{ "--reveal-delay": delay + "s" } as CSSProperties}
    >
      {children}
    </div>
  );
}
export function ImageReveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={"image-reveal " + className}>{children}</div>;
}
