"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./navbar";
const groups = [
  {
    title: "Find your fit",
    links: [
      ["Find trainers", "/trainers"],
      ["Female trainers", "/trainers?gender=female"],
      ["Online coaching", "/trainers?type=online"],
      ["Karachi locations", "/locations"],
    ],
  },
  {
    title: "Elevate",
    links: [
      ["Our story", "/about"],
      ["How it works", "/how-it-works"],
      ["Become a trainer", "/become-a-trainer"],
      ["Trainer login", "/login?role=trainer"],
    ],
  },
  {
    title: "We're here to help",
    links: [
      ["Help & contact", "/help"],
      ["Trust & safety", "/safety"],
      ["Cancellation policy", "/cancellation"],
      ["Contact us", "/contact"],
    ],
  },
];
export function Footer() {
  const path = usePathname();
  if (
    ["/match", "/checkout", "/login", "/signup"].includes(path) ||
    path.startsWith("/dashboard") ||
    path.startsWith("/admin")
  )
    return null;
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo />
            <p>
              A little guidance.
              <br />A stronger you.
            </p>
            <span className="muted text-sm">
              Personal training, made personal.
              <br />
              Made for Karachi.
            </span>
          </div>
          {groups.map((g) => (
            <div key={g.title}>
              <h3>{g.title}</h3>
              {g.links.map(([title, url]) => (
                <Link href={url} key={url}>
                  {title}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Elevate. Move forward.</span>
          <span className="demo-note">
            Demo marketplace · Sample trainers & reviews
          </span>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
