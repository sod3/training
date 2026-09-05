import { HeroSection } from "@/components/marketplace/hero-section"
import { SocialProof } from "@/components/marketplace/social-proof"
import { GoalDiscovery } from "@/components/marketplace/goal-discovery"
import { TrainersNearYou } from "@/components/marketplace/trainers-near-you"
import { HowItWorks } from "@/components/marketplace/how-it-works"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function Home() {
  return (
    <>
      <HeroSection />
      <SocialProof />
      <GoalDiscovery />
      <TrainersNearYou />
      <HowItWorks />
      
      {/* Featured Transformation Placeholder Section */}
      <section className="py-16 bg-foreground text-background">
        <div className="container px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Real results. <br/> Real transformations.
              </h2>
              <p className="text-muted text-lg max-w-[500px]">
                "Working with Ahmed changed my life. In 8 weeks, I lost 9kg, gained muscle, and learned how to train properly."
              </p>
              <div className="flex gap-8 border-t border-border/20 pt-6">
                <div>
                  <p className="text-2xl font-bold">8 weeks</p>
                  <p className="text-sm text-muted">Duration</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">-9kg</p>
                  <p className="text-sm text-muted">Weight lost</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">24</p>
                  <p className="text-sm text-muted">Sessions</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               {/* Placeholders for Before/After */}
               <div className="aspect-[3/4] bg-muted/20 rounded-2xl flex items-center justify-center">
                 <span className="text-muted font-medium">Before</span>
               </div>
               <div className="aspect-[3/4] bg-muted/30 rounded-2xl flex items-center justify-center relative overflow-hidden">
                 <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=600&auto=format&fit=crop" className="object-cover w-full h-full opacity-80" alt="After" />
                 <span className="absolute bottom-4 left-4 bg-background/90 text-foreground px-3 py-1 rounded-full text-sm font-semibold">After</span>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent" />
        <div className="container relative z-10 px-4 md:px-6 flex flex-col items-center text-center space-y-8">
          <h2 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl max-w-[800px]">
            Your goal deserves the right trainer.
          </h2>
          <p className="text-lg opacity-90 max-w-[600px]">
            Join thousands of others who found their perfect match. Start your journey today with a verified professional.
          </p>
          <Link href="/match" className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "font-bold text-base h-14 px-8 mt-4")}>
            FIND MY TRAINER
          </Link>
        </div>
      </section>
    </>
  )
}
