import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { trainers } from "@/data/trainers";
import { TrainerCard } from "./trainer-card";
import { Reveal } from "@/components/motion/reveal";
export function TrainersNearYou() {
  return (
    <section className="section container">
      <Reveal>
        <div className="section-heading">
          <div>
            <p className="eyebrow">GOOD COACHES. GREAT CONNECTIONS.</p>
            <h2>
              Your next chapter.
              <br />
              Their expertise.
            </h2>
          </div>
          <Link href="/trainers" className="text-link">
            Meet all trainers <ArrowUpRight size={18} />
          </Link>
        </div>
      </Reveal>
      <div className="trainer-grid swipe-row">
        {trainers.slice(0, 4).map((t) => (
          <TrainerCard key={t.id} trainer={t} />
        ))}
      </div>
    </section>
  );
}
