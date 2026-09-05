import { Trainer } from "@/types/trainer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Heart, MapPin, Star, ShieldCheck } from "lucide-react"
import Link from "next/link"

interface TrainerCardProps {
  trainer: Trainer
  variant?: "default" | "compact" | "horizontal"
}

export function TrainerCard({ trainer, variant = "default" }: TrainerCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(price)
  }

  return (
    <Card className="group overflow-hidden border transition-all hover:shadow-md hover:border-border/80 flex flex-col h-full bg-card">
      <div className="relative aspect-[4/5] overflow-hidden">
        <Link href={`/trainers/${trainer.slug}`}>
          <img 
            src={trainer.profileImage} 
            alt={`${trainer.firstName} ${trainer.lastName}`} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {trainer.matchScore && (
            <Badge variant="default" className="bg-primary hover:bg-primary text-primary-foreground font-semibold shadow-sm">
              {trainer.matchScore}% Match
            </Badge>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 bg-background/50 backdrop-blur text-foreground hover:bg-background/90 rounded-full h-8 w-8"
        >
          <Heart className="h-4 w-4" />
          <span className="sr-only">Save trainer</span>
        </Button>
      </div>
      
      <CardContent className="p-5 flex flex-col flex-1 gap-4">
        <div className="space-y-1.5">
          <div className="flex justify-between items-start gap-2">
            <Link href={`/trainers/${trainer.slug}`} className="hover:underline">
              <h3 className="font-bold text-xl leading-none flex items-center gap-1.5">
                {trainer.firstName} {trainer.lastName}
                {trainer.verifiedIdentity && (
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" aria-label="Verified" />
                )}
              </h3>
            </Link>
            <div className="flex items-center gap-1 text-sm font-medium">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>{trainer.rating}</span>
              <span className="text-muted-foreground font-normal">({trainer.reviewCount})</span>
            </div>
          </div>
          <p className="text-sm font-medium text-foreground line-clamp-1">{trainer.headline}</p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-auto">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {trainer.locations[0]} {trainer.locations.length > 1 && `+${trainer.locations.length - 1}`}
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
            {trainer.sessionsCompleted} sessions
          </span>
        </div>

        <div className="border-t pt-4 flex items-center justify-between mt-1">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Starting from</p>
            <p className="font-semibold">{formatPrice(trainer.basePrice)} <span className="text-xs font-normal text-muted-foreground">/session</span></p>
          </div>
          <Link href={`/trainers/${trainer.slug}`} className={buttonVariants({ variant: "default", size: "sm" })}>
            View Profile
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
