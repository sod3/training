import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowDown, Check, MapPin } from "lucide-react";
export function HeroSection() {
  return <section className="spotter-hero">
    <div className="spotter-hero-media"><Image src="/images/coaching.webp" alt="A professional male trainer guiding a male client through a dumbbell exercise" fill fetchPriority="high" loading="eager" sizes="100vw"/><div className="spotter-hero-shade"/></div>
    <div className="container spotter-hero-content">
      <p className="eyebrow hero-enter"><span className="live-dot"/> PERSONAL TRAINING · MADE PERSONAL</p>
      <h1>{["Find the trainer", "who gets you", "there."].map((line,i)=><span className="masked-line" key={line}><span style={{animationDelay:(.08+i*.1)+"s"}}>{line}</span></span>)}</h1>
      <div className="hero-enter hero-enter-copy"><p className="spotter-hero-description">Your goals. Your pace. Your kind of coach.<br/>Personal trainers, matched to your life.</p><Link href="/match" className="btn lime hero-main-cta">Find my trainer <ArrowRight size={20}/></Link><div className="spotter-hero-trust"><span><Check size={14}/> Clear profiles</span><span><Check size={14}/> Personal matches</span><span><Check size={14}/> Upfront pricing</span></div></div>
    </div>
    <div className="container hero-bottom"><a href="#trainers" aria-label="A better way to train: explore featured trainers"><ArrowDown size={17}/> A BETTER WAY TO TRAIN</a><span><MapPin size={14}/> STARTING IN KARACHI <i/> BUILT AROUND YOU</span></div>
    <div className="hero-photo-note"><span className="live-dot"/> IN YOUR CORNER. EVERY REP.</div>
  </section>;
}
