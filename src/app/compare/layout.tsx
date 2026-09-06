import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Online Personal Trainers",
  description: "Compare selected Spotter trainers side by side before booking.",
  robots: { index: false, follow: true },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
