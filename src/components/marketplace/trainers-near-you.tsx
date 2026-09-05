import { getFeaturedTrainers } from "@/lib/services/trainers"
import { TrainerCard } from "@/components/marketplace/trainer-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export async function TrainersNearYou() {
  const trainers = await getFeaturedTrainers()

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Top trainers near you</h2>
            <p className="text-muted-foreground mt-2 max-w-[600px]">
              Discover highly-rated verified professionals in your area.
            </p>
          </div>
          <Button variant="outline" className="shrink-0" asChild>
            <Link href="/trainers">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {trainers.map((trainer) => (
            <TrainerCard key={trainer.id} trainer={trainer} />
          ))}
        </div>
      </div>
    </section>
  )
}
