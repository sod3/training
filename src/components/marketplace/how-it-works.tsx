import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
export function HowItWorks() {
  return (
    <section className="spotter-steps" id="how-it-works">
      <div className="container">
        <Reveal>
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <span className="section-index">02 /</span> SIMPLE BY DESIGN
              </p>
              <h2>From search to session.</h2>
            </div>
            <Link href="/match" className="text-link">
              Let’s find your fit <ArrowUpRight size={18} />
            </Link>
          </div>
        </Reveal>
        <div className="steps-grid">
          {[
            [
              "Tell us your goal.",
              "A few questions. A more personal starting point.",
            ],
            ["Meet your matches.", "Compare the people who fit your life."],
            [
              "Book. Train. Progress.",
              "Choose your session. We’ll take it from there.",
            ],
          ].map(([title, copy], i) => (
            <Reveal key={title}>
              <article>
                <span className="step-number">
                  0{i + 1}
                  <ArrowUpRight size={22} />
                </span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
