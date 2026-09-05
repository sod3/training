import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { goals, matchesGoal } from "@/lib/marketplace";
import { trainers } from "@/data/trainers";
import { Reveal } from "@/components/motion/reveal";
const photos = [
  "1518611012118-696072aa579a",
  "1581009146145-b5ef050c2e1e",
  "1534438327276-14e5300c3a48",
  "1544367567-0f2fcb009e0b",
  "1571019614242-c5c5dee9f50b",
  "1552674605-db6ffd4facb5",
  "1574680096145-d05b474e2155",
  "1594381898411-846e7d193883",
];
export function GoalDiscovery() {
  return (
    <section className="section container">
      <Reveal>
        <div className="section-heading">
          <div>
            <p className="eyebrow">A GOAL IS A GOOD PLACE TO START</p>
            <h2>
              What are you
              <br />
              working toward?
            </h2>
          </div>
          <p>
            Start with your goal.
            <br />
            We’ll help with the rest.
          </p>
        </div>
      </Reveal>
      <div className="goal-grid swipe-row">
        {goals.map((g, i) => (
          <Link
            className="goal-card"
            href={`/trainers?goal=${encodeURIComponent(g)}`}
            key={g}
          >
            <Image
              src={`https://images.unsplash.com/photo-${photos[i]}?auto=format&fit=crop&w=600&q=80`}
              alt={`${g} training`}
              fill
              sizes="(max-width: 640px) 65vw, 25vw"
            />
            <div className="image-gradient" />
            <div>
              <span className="goal-index">0{i + 1}</span>
              <h3>{g}</h3>
              <p>
                {trainers.filter((t) => matchesGoal(t, g)).length} trainers{" "}
                <ArrowUpRight size={20} />
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
