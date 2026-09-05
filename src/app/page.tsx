import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  CalendarDays,
  Fingerprint,
  MapPin,
  BadgeCheck,
  Check,
  Star,
  Target,
  Wallet,
} from "lucide-react";
import { HeroSection } from "@/components/marketplace/hero-section";
import { SocialProof } from "@/components/marketplace/social-proof";
import { GoalDiscovery } from "@/components/marketplace/goal-discovery";
import { TrainersNearYou } from "@/components/marketplace/trainers-near-you";
import { HowItWorks } from "@/components/marketplace/how-it-works";
import { FAQ } from "@/components/marketplace/faq";
import { TrainerCard } from "@/components/marketplace/trainer-card";
import { Reveal } from "@/components/motion/reveal";
import { trainers } from "@/data/trainers";
import { locations } from "@/lib/marketplace";
export default function Home() {
  return (
    <>
      <HeroSection />
      <SocialProof />
      <GoalDiscovery />
      <TrainersNearYou />
      <section className="evening-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <span className="live-dot" /> WHY WAIT FOR MONDAY?
              </p>
              <h2>Available this evening.</h2>
            </div>
            <Link href="/trainers?availability=today" className="text-link">
              See today’s availability <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="availability-grid">
            {trainers
              .filter((t) => t.nextAvailable.startsWith("Today"))
              .map((t) => (
                <Link
                  className="availability-card"
                  key={t.id}
                  href={`/booking?trainer=${t.slug}`}
                >
                  <div className="availability-avatar">
                    <Image
                      src={t.profileImage}
                      fill
                      sizes="64px"
                      alt={t.firstName}
                    />
                  </div>
                  <div>
                    <h3>
                      {t.firstName} {t.lastName} <BadgeCheck size={16} />
                    </h3>
                    <p>
                      {t.specialties[0]} · {t.locations[0]}
                    </p>
                  </div>
                  <span>
                    {t.nextAvailable.split(", ")[1]} <ArrowUpRight size={16} />
                  </span>
                </Link>
              ))}
          </div>
          <p className="fine-print">
            Sample availability. Choose a date to see the demo schedule.
          </p>
        </div>
      </section>
      <HowItWorks />
      <section className="section container">
        <Reveal>
          <div className="section-heading">
            <div>
              <p className="eyebrow">LESS GUESSWORK. MORE GOOD TRAINING.</p>
              <h2>
                Feel good about
                <br />
                who you train with.
              </h2>
            </div>
            <p>
              We make the important things clear.
              <br />
              So you can focus on showing up.
            </p>
          </div>
        </Reveal>
        <div className="bento-grid">
          <div className="bento bento-large">
            <Fingerprint size={42} />
            <h3>
              Real people.
              <br />
              Proper credentials.
            </h3>
            <p>
              Know who’s coaching you, with identity and credential checks shown
              clearly.
            </p>
            <div className="verification-demo">
              <span>
                <ShieldCheck /> Identity verified <Check />
              </span>
              <span>
                <BadgeCheck /> Credentials verified <Check />
              </span>
            </div>
          </div>
          <div className="bento">
            <Star size={28} />
            <h3>
              Reviews with a reason
              <br />
              to trust them.
            </h3>
            <p>From people who’ve actually booked.</p>
            <span className="bento-rating">
              4.9 <span>★★★★★</span>
            </span>
          </div>
          <div className="bento bento-green">
            <Wallet size={28} />
            <h3>
              No pricing
              <br />
              guesswork.
            </h3>
            <p>Know what you’ll pay before you book.</p>
            <strong className="bento-price">
              Rs. 2,500 <small>/ session</small>
            </strong>
          </div>
          <div className="bento">
            <MapPin size={28} />
            <h3>
              Your place.
              <br />
              Your pace.
            </h3>
            <p>At home, in the gym, outdoors or online.</p>
          </div>
          <div className="bento bento-wide">
            <CalendarDays size={28} />
            <h3>A calendar that fits your life.</h3>
            <div className="mini-calendar">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span className={i === 4 ? "selected" : ""} key={i}>
                  {d}
                  <strong>{14 + i}</strong>
                </span>
              ))}
            </div>
          </div>
          <div className="bento">
            <Target size={28} />
            <h3>Built around you.</h3>
            <p>
              Your goal is personal.
              <br />
              Your training should be, too.
            </p>
          </div>
        </div>
      </section>
      <section className="editorial">
        <div className="container editorial-grid">
          <div className="editorial-photo">
            <Image
              src="https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=85"
              alt="A woman focusing on her training session"
              fill
              sizes="(max-width:768px) 100vw, 50vw"
            />
            <span>SHOW UP AS YOU ARE.</span>
          </div>
          <div className="editorial-copy">
            <p className="eyebrow">MORE THAN A WORKOUT</p>
            <h2>
              The right trainer
              <br />
              changes
              <br />
              <em>everything.</em>
            </h2>
            <div className="editorial-quote">
              <span className="stars">★★★★★</span>
              <blockquote>
                “For the first time, I didn’t feel like I had to figure it all
                out on my own.”
              </blockquote>
              <p>
                Mariam A. <span>· Training with Hira</span>
              </p>
              <small>Illustrative client experience</small>
            </div>
          </div>
        </div>
      </section>
      <section className="section container progress-story">
        <div>
          <p className="eyebrow">SMALL STEPS. SOMETHING BIGGER.</p>
          <h2>
            Real people.
            <br />
            Real progress.
          </h2>
          <p className="section-copy">
            Progress isn’t just a number. It’s feeling stronger, finding a
            routine, and looking forward to the next session.
          </p>
          <Link href="/match" className="text-link">
            Find someone in your corner <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="progress-quote">
          <p className="eyebrow">SARA’S STORY · ILLUSTRATIVE</p>
          <blockquote>
            “Training finally became something I could actually stick to.”
          </blockquote>
          <div className="progress-numbers">
            <div>
              <strong>8</strong>
              <span>weeks of consistency</span>
            </div>
            <div>
              <strong>24</strong>
              <span>sessions together</span>
            </div>
            <div>
              <strong>1</strong>
              <span>very good decision</span>
            </div>
          </div>
          <p className="muted text-sm">
            With Ahmed Raza · Strength & transformation
            <br />
            Individual experiences vary. No results are guaranteed.
          </p>
        </div>
      </section>
      <section className="section soft-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">COMFORT COMES FIRST</p>
              <h2>
                Train where you
                <br />
                feel comfortable.
              </h2>
            </div>
            <div>
              <p>
                Discover female coaches for home,
                <br />
                gym and online sessions.
              </p>
              <Link href="/trainers?gender=female" className="text-link mt-5">
                Explore female trainers <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
          <div className="trainer-grid swipe-row">
            {trainers
              .filter((t) => t.gender === "female")
              .map((t) => (
                <TrainerCard key={t.id} trainer={t} />
              ))}
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FITNESS THAT FITS YOUR LIFE</p>
            <h2>Train your way.</h2>
          </div>
          <p>
            There’s no one right place to start.
            <br />
            There’s just yours.
          </p>
        </div>
        <div className="ways-grid">
          {[
            [
              "home",
              "At home",
              "Your space. Your schedule.",
              "1594381898411-846e7d193883",
            ],
            [
              "gym",
              "At the gym",
              "A little structure. A lot of support.",
              "1534438327276-14e5300c3a48",
            ],
            [
              "outdoor",
              "Out in the open",
              "Move beyond four walls.",
              "1552674605-db6ffd4facb5",
            ],
            [
              "online",
              "Anywhere, online",
              "Good coaching travels with you.",
              "1544367567-0f2fcb009e0b",
            ],
          ].map(([type, title, copy, photo]) => (
            <Link
              href={`/trainers?type=${type}`}
              className="way-card"
              key={type}
            >
              <Image
                src={`https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=650&q=80`}
                alt={title}
                fill
                sizes="(max-width:640px) 50vw,25vw"
              />
              <div className="image-gradient" />
              <div>
                <h3>
                  {title}
                  <ArrowUpRight size={20} />
                </h3>
                <p>{copy}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="section container reviews-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE PEOPLE MAKE THE DIFFERENCE</p>
            <h2>
              A good fit.
              <br />
              In their words.
            </h2>
          </div>
          <div className="review-summary">
            <strong>
              4.9<span className="stars">★★★★★</span>
            </strong>
            <p>Illustrative verified session reviews</p>
          </div>
        </div>
        <div className="reviews-grid">
          {[
            [
              "Mariam A.",
              "Hira Khan",
              "Weight loss",
              "Hira understood that I had never trained before and made my first session comfortable rather than intimidating.",
            ],
            [
              "Hamza M.",
              "Ahmed Raza",
              "Build muscle",
              "A clear plan, a coach who listens, and sessions I actually look forward to. That’s made all the difference.",
            ],
            [
              "Zainab R.",
              "Sara Ali",
              "Mobility",
              "Having someone adapt the session to how I’m feeling has helped me stay consistent, even on busy weeks.",
            ],
          ].map(([name, trainer, goal, quote], i) => (
            <article className="review-card" key={name}>
              <span className="stars">★★★★★</span>
              <blockquote>“{quote}”</blockquote>
              <div className="review-person">
                <span>{name.slice(0, 1)}</span>
                <div>
                  <strong>{name}</strong>
                  <p>
                    {goal} · with {trainer}
                  </p>
                </div>
              </div>
              <small>
                <BadgeCheck size={13} /> Sample verified booking · Aug {18 + i},
                2026
              </small>
            </article>
          ))}
        </div>
      </section>
      <section className="location-section container">
        <div>
          <p className="eyebrow">CLOSER THAN YOU THINK</p>
          <h2>All across Karachi.</h2>
        </div>
        <div className="location-links">
          {locations.map((l) => (
            <Link href={`/trainers?location=${encodeURIComponent(l)}`} key={l}>
              <MapPin size={16} />
              {l}
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
      </section>
      <section className="trainer-promo">
        <div className="container promo-grid">
          <div>
            <p className="eyebrow">FOR THE PEOPLE WHO COACH</p>
            <h2>
              You build stronger people.
              <br />
              We help build
              <br />
              <em>your business.</em>
            </h2>
            <p>
              Find your clients. Fill your calendar.
              <br />
              Spend more time doing what you love.
            </p>
            <Link href="/become-a-trainer" className="btn lime">
              Join as a trainer <ArrowRight size={18} />
            </Link>
          </div>
          <div className="dashboard-preview">
            <div className="preview-header">
              <span>
                elevate. <small>FOR TRAINERS</small>
              </span>
              <span>September ↗</span>
            </div>
            <p className="muted text-sm">YOU’RE MAKING MOVES, AHMED.</p>
            <h3>A good month for good coaching.</h3>
            <div className="preview-kpis">
              <div>
                <small>Monthly earnings</small>
                <strong>Rs. 84,500</strong>
                <span>↑ 18.4% this month</span>
              </div>
              <div>
                <small>Sessions</small>
                <strong>37</strong>
              </div>
            </div>
            <div
              className="bar-chart"
              role="img"
              aria-label="Illustrative weekly earnings increasing over eight weeks"
            >
              {[30, 45, 37, 65, 50, 78, 65, 95].map((h, i) => (
                <div key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="preview-footer">
              <span>12 active clients</span>
              <span>★ 4.9 rating</span>
              <BadgeCheck size={20} />
            </div>
            <small className="muted">Illustrative dashboard preview</small>
          </div>
        </div>
      </section>
      <FAQ />
      <section className="final-cta">
        <div className="container">
          <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
          <h2>
            Your goal deserves
            <br />
            the <em>right trainer.</em>
            <span aria-hidden>↗</span>
          </h2>
          <div>
            <p>
              Start with one session.
              <br />
              See where it takes you.
            </p>
            <Link href="/match" className="btn">
              Find my trainer <ArrowRight size={20} />
            </Link>
            <Link href="/trainers" className="text-link">
              Browse trainers <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
