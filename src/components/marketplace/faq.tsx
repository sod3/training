"use client";
import { useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Plus } from "lucide-react";
export const faqs = [
  [
    "How are trainers verified?",
    "Trainer profiles show separate identity and credential checks. Spotter reviews submitted evidence before approving badges.",
  ],
  [
    "Can I book a trial session?",
    "Yes. Choose a trainer, select a trial or single session, then pick an available date and time. You can try one session before choosing a package.",
  ],
  [
    "How much do trainers charge?",
    "Each trainer sets their prices. Session rates and package totals appear on their profile, and the complete total is shown before you confirm.",
  ],
  [
    "Can trainers come to my home?",
    "Yes, when a trainer offers home sessions in your area. Choose Home when searching and add your address during booking.",
  ],
  [
    "What happens if I cancel?",
    "Your booking shows the cancellation deadline saved at purchase. Cancel before that deadline for an eligible refund. Late cancellations forfeit the affected session’s share of the package.",
  ],
  [
    "How do verified reviews work?",
    "Only customers who completed a session with that trainer through Spotter can publish a review.",
  ],
  [
    "Can I train online?",
    "Yes. Select Online to find trainers who offer remote coaching. Your trainer can coordinate session details through messages.",
  ],
];
export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <MotionConfig reducedMotion="user">
      <section className="section container faq-section">
        <div>
          <p className="eyebrow">A LITTLE CLARITY</p>
          <h2>
            Good questions.
            <br />
            Straight answers.
          </h2>
          <p className="section-copy">
            The things you might be wondering
            <br />
            before your first session.
          </p>
        </div>
        <div>
          {faqs.map(([q, a], i) => (
            <div className="faq-item" key={q}>
              <h3>
                <button
                  aria-expanded={open === i}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  {q}
                  <Plus size={20} className={open === i ? "rotate-45" : ""} />
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    id={`faq-${i}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <p>{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>
    </MotionConfig>
  );
}
