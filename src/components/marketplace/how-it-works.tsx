"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight, BadgeCheck, CalendarDays } from "lucide-react";
export function HowItWorks() {
  const [active, setActive] = useState(0);
  const steps = [
    {
      title: "Tell us what moves you.",
      text: "Your goals, your location, your kind of training. A few questions help us get to know you.",
    },
    {
      title: "Find your kind of coach.",
      text: "Explore your matches. Read reviews, compare approaches, and find someone you connect with.",
    },
    {
      title: "One session. A fresh start.",
      text: "Choose a time that works. Book a trial before committing to anything more.",
    },
  ];
  return (
    <section className="section story-section" id="how-it-works">
      <div className="container story-grid">
        <div className="story-intro">
          <p className="eyebrow">FROM “ONE DAY” TO DAY ONE</p>
          <h2>
            Finding your trainer
            <br />
            should feel simple.
          </h2>
          <p className="section-copy">
            Three small steps.
            <br />A very different kind of fitness journey.
          </p>
          <Link href="/match" className="btn">
            Let’s find your fit <ArrowRight size={17} />
          </Link>
          <div
            className="story-demo"
            aria-label={`Example: ${steps[active].title}`}
          >
            <span className="eyebrow">YOUR ELEVATE EXPERIENCE</span>
            {active === 0 ? (
              <>
                <h3>Make it yours.</h3>
                {["Build muscle", "At home", "DHA, Karachi"].map((t) => (
                  <div className="demo-option" key={t}>
                    {t}
                    <Check size={17} />
                  </div>
                ))}
              </>
            ) : active === 1 ? (
              <>
                <h3>A few good matches.</h3>
                {["Ahmed Raza", "Hira Khan", "Sara Ali"].map((n, i) => (
                  <div className="demo-option" key={n}>
                    <span>
                      {n} <BadgeCheck size={15} />
                    </span>
                    <strong>{96 - i * 3}%</strong>
                  </div>
                ))}
              </>
            ) : (
              <>
                <CalendarDays size={32} className="text-primary my-5" />
                <h3>You’re booked.</h3>
                <p>Saturday · 6:30 PM</p>
                <div className="demo-option">
                  Your first session <Check size={17} />
                </div>
              </>
            )}
            <small>Illustrative product preview</small>
          </div>
        </div>
        <div className="story-steps">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              onViewportEnter={() => setActive(i)}
              viewport={{ amount: 0.7 }}
              className={`story-step ${active === i ? "active" : ""}`}
            >
              <span className="step-number">0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <div className="mobile-step-preview">
                <Check size={18} />
                {
                  [
                    "Your preferences, all in one place",
                    "Personalized recommendations",
                    "Clear pricing. A time that fits.",
                  ][i]
                }
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
