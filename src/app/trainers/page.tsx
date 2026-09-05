import { getTrainers } from "@/lib/services/trainers"
import { TrainerCard } from "@/components/marketplace/trainer-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, MapPin, SlidersHorizontal } from "lucide-react"

export default async function TrainersPage() {
  const trainers = await getTrainers()

  return (
    <div className="container mx-auto px-4 md:px-6 py-8">
      {/* Header & Mobile Search */}
      <div className="flex flex-col gap-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Find Personal Trainers</h1>
        <div className="flex flex-col sm:flex-row gap-3 lg:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search trainers, goals..." className="pl-9" />
          </div>
          <Button variant="outline">
            <SlidersHorizontal className="mr-2 h-4 w-4" /> Filters
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 space-y-6">
          <div className="space-y-3">
            <Label>Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="e.g. DHA, Clifton" className="pl-9" />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Goal</Label>
            <div className="space-y-2">
              {["Weight Loss", "Muscle Building", "Strength", "Mobility"].map(goal => (
                <div key={goal} className="flex items-center space-x-2">
                  <Checkbox id={`goal-${goal}`} />
                  <label htmlFor={`goal-${goal}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {goal}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Trainer Gender</Label>
            <div className="space-y-2">
              {["Male", "Female", "No Preference"].map(gender => (
                <div key={gender} className="flex items-center space-x-2">
                  <Checkbox id={`gender-${gender}`} />
                  <label htmlFor={`gender-${gender}`} className="text-sm font-medium leading-none">
                    {gender}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />
          
          <Button className="w-full">Apply Filters</Button>
        </aside>

        {/* Results Area */}
        <div className="flex-1 space-y-6">
          <div className="hidden lg:flex justify-between items-center bg-muted/30 p-2 rounded-lg border">
            <div className="text-sm text-muted-foreground pl-2">
              Showing <span className="font-medium text-foreground">{trainers.length}</span> trainers
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground">Sort by:</Label>
              <select className="text-sm border-none bg-transparent font-medium focus:ring-0 cursor-pointer">
                <option>Recommended</option>
                <option>Highest Rated</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {trainers.map(trainer => (
              <TrainerCard key={trainer.id} trainer={trainer} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
