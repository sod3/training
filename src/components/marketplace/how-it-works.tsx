import { Target, Search, CalendarCheck } from "lucide-react"

export function HowItWorks() {
  return (
    <section className="py-16 md:py-32">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">How it works</h2>
          <p className="mt-4 text-muted-foreground md:text-lg max-w-[600px] mx-auto">
            Your fitness journey shouldn't be complicated. We've made finding the right coach as simple as possible.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-12 md:gap-8 relative">
          <div className="hidden md:block absolute top-1/4 left-[15%] right-[15%] h-0.5 bg-border -z-10" />
          
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-2 shadow-lg">
              <Target className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Step 01</span>
              <h3 className="text-xl font-bold">Tell us your goal.</h3>
              <p className="text-muted-foreground leading-relaxed">
                Whether you want to lose weight, build strength, or improve mobility, we'll ask a few questions to understand your needs.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-2 shadow-lg">
              <Search className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Step 02</span>
              <h3 className="text-xl font-bold">Meet your matches.</h3>
              <p className="text-muted-foreground leading-relaxed">
                Browse verified profiles, read reviews, and compare packages from top-rated trainers in your area.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-2 shadow-lg">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Step 03</span>
              <h3 className="text-xl font-bold">Book. Train. Progress.</h3>
              <p className="text-muted-foreground leading-relaxed">
                Securely book a trial session or full package. Manage your schedule and track your progress all in one place.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
