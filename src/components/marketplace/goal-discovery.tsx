import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

const goals = [
  { name: "Lose Weight", image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop" },
  { name: "Build Muscle", image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop" },
  { name: "Get Stronger", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop" },
  { name: "Improve Mobility", image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop" },
  { name: "Body Transformation", image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=800&auto=format&fit=crop" },
  { name: "Sports Performance", image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=800&auto=format&fit=crop" },
  { name: "General Fitness", image: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=800&auto=format&fit=crop" },
  { name: "Post-Pregnancy", image: "https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=800&auto=format&fit=crop" },
]

export function GoalDiscovery() {
  return (
    <section className="py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            What are you working toward?
          </h2>
          <p className="max-w-[700px] text-muted-foreground md:text-lg">
            Select a goal to find trainers specializing in what you need.
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {goals.map((goal) => (
            <Link key={goal.name} href={`/trainers?goal=${encodeURIComponent(goal.name.toLowerCase())}`}>
              <Card className="group overflow-hidden border-0 cursor-pointer h-full relative aspect-square shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
                <img 
                  src={goal.image} 
                  alt={goal.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <CardContent className="absolute bottom-0 left-0 w-full p-4 flex flex-col justify-end text-white">
                  <h3 className="font-semibold text-lg leading-tight md:text-xl">
                    {goal.name}
                  </h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
