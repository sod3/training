"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ShieldCheck,
  Star,
  MapPin,
  Target,
  Check,
} from "lucide-react";
import { goals, locations } from "@/lib/marketplace";
import { ease } from "@/lib/motion";
export function HeroSection() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [goal, setGoal] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const x = useSpring(0, { stiffness: 120, damping: 30 });
  const y = useSpring(0, { stiffness: 120, damping: 30 });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const scrollY = useTransform(scrollYProgress, [0, 1], [0, 30]);
  return (
    <section className="hero" ref={ref}>
      <div className="container hero-grid">
        <div className="hero-copy">
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="live-dot" /> PERSONAL TRAINING, MATCHED TO YOU
          </motion.p>
          <h1>
            {["Find the trainer", "who gets you", "there."].map((line, i) => (
              <span className="masked-line" key={line}>
                <motion.span
                  initial={{ y: reduced ? 0 : "105%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.65, delay: 0.08 + i * 0.1, ease }}
                  className={i === 2 ? "hero-emphasis" : ""}
                >
                  {line}
                  {i === 2 && (
                    <span className="heading-arrow" aria-hidden>
                      ↗
                    </span>
                  )}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            className="hero-description"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            Your goals. Your schedule. Your kind of coach.
            <br className="desktop-break" /> Meet verified personal trainers who
            make it personal.
          </motion.p>
          <motion.form
            className="hero-search"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            onSubmit={(e) => {
              e.preventDefault();
              router.push(
                `/match?${new URLSearchParams({ goal, location, type })}`,
              );
            }}
          >
            <div className="search-fields">
              <label>
                <span>
                  <Target size={15} /> Your goal
                </span>
                <select
                  aria-label="Your goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                >
                  <option value="">What moves you?</option>
                  {goals.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>
                  <MapPin size={15} /> Location
                </span>
                <select
                  aria-label="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  <option value="">Karachi, anywhere</option>
                  {locations.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>
                  <ShieldCheck size={15} /> Train your way
                </span>
                <select
                  aria-label="Training type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="">Home, gym or online</option>
                  {["home", "gym", "outdoor", "online"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            <button className="btn">
              Find my trainer <ArrowRight size={18} />
            </button>
          </motion.form>
          <div className="hero-browse">
            <Link href="/trainers" className="text-link">
              Just looking? Browse trainers <ArrowUpRight size={16} />
            </Link>
            <span>It starts with one session.</span>
          </div>
          <div className="hero-trust">
            {[
              "Identity verified",
              "Real client reviews",
              "Transparent pricing",
            ].map((t) => (
              <span key={t}>
                <Check size={14} />
                {t}
              </span>
            ))}
          </div>
        </div>
        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, scale: reduced ? 1 : 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease }}
          style={{ y: reduced ? 0 : scrollY }}
          onPointerMove={(e) => {
            if (reduced || e.pointerType !== "mouse") return;
            const r = e.currentTarget.getBoundingClientRect();
            x.set(((e.clientX - r.left - r.width / 2) / r.width) * 7);
            y.set(((e.clientY - r.top - r.height / 2) / r.height) * 7);
          }}
          onPointerLeave={() => {
            x.set(0);
            y.set(0);
          }}
        >
          <motion.div className="hero-image" style={{ x, y }}>
            <Image
              src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1400&q=85"
              alt="Personal trainer guiding a client through a strength exercise"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 47vw"
            />
            <div className="hero-image-shade" />
            <span className="image-kicker">
              <span className="live-dot" /> GOOD PEOPLE. REAL PROGRESS.
            </span>
            <div className="image-caption">
              <span>
                A stronger you.
                <br />
                Starts with the right person.
              </span>
              <ArrowUpRight size={38} />
            </div>
          </motion.div>
          <motion.div
            className="hero-rating"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.4 }}
          >
            <span className="rating-star">★</span>
            <div>
              <strong>
                4.9 <small>/ 5</small>
              </strong>
              <p>84 verified reviews</p>
            </div>
          </motion.div>
          <motion.div
            className="hero-coach"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
          >
            <div className="coach-top">
              <div className="coach-avatar">
                <Image
                  src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80"
                  alt="Ahmed Raza"
                  fill
                  sizes="44px"
                />
              </div>
              <div>
                <strong>
                  Ahmed Raza <BadgeCheck size={17} />
                </strong>
                <p>Strength & transformation</p>
              </div>
              <span className="coach-rating">
                <Star size={13} fill="currentColor" /> 4.9
              </span>
            </div>
            <div className="coach-bottom">
              <span>
                <i className="live-dot" /> Available today{" "}
                <small>From Rs. 2,500 / session</small>
              </span>
              <Link href="/booking?trainer=ahmed-raza" className="btn small">
                Book trial <ArrowUpRight size={15} />
              </Link>
            </div>
          </motion.div>
          <span className="hero-side-note">
            KARACHI, MEET YOUR NEXT CHAPTER.
          </span>
        </motion.div>
      </div>
    </section>
  );
}
