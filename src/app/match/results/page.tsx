import { getTrainers } from "@/lib/services/trainers"
import { TrainerCard } from "@/components/marketplace/trainer-card"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Check, SlidersHorizontal } from "lucide-react"

export default async function MatchResultsPage() {
  const allTrainers = await getTrainers()
  // Simulate top matched trainers
  const matchedTrainers = allTrainers.map(t => ({
    ...t,
    matchScore: Math.floor(Math.random() * 15) + 85 // random between 85-99
  })).sort((a, b) => b.matchScore - a.matchScore)

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
          We found {matchedTrainers.length} trainers for you.
        </h1>
        <p className="text-muted-foreground md:text-lg">
          These verified professionals match your goal, location, schedule, and budget.
        </p>
        
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <div className="flex items-center gap-1.5 text-sm bg-muted/50 px-3 py-1.5 rounded-full border">
            <Check className="h-4 w-4 text-primary" /> Your goal
          </div>
          <div className="flex items-center gap-1.5 text-sm bg-muted/50 px-3 py-1.5 rounded-full border">
            <Check className="h-4 w-4 text-primary" /> Your location
          </div>
          <div className="flex items-center gap-1.5 text-sm bg-muted/50 px-3 py-1.5 rounded-full border">
            <Check className="h-4 w-4 text-primary" /> Your schedule
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9">
            <SlidersHorizontal className="mr-2 h-4 w-4" /> Edit Filters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {matchedTrainers.map(trainer => (
          <TrainerCard key={trainer.id} trainer={trainer} />
        ))}
      </div>
      
      <div className="mt-12 flex justify-center">
        <Link href="/trainers" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
          View all trainers in your area
        </Link>
      </div>
    </div>
  )
}
