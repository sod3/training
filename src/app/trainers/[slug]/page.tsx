import { getTrainerBySlug } from "@/lib/services/trainers"
import { notFound } from "next/navigation"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ShieldCheck, Star, MapPin, Heart, Share, Calendar, CheckCircle2 } from "lucide-react"
import Link from "next/link"

interface Props {
  params: {
    slug: string
  }
}

export default async function TrainerProfilePage({ params }: Props) {
  const trainer = await getTrainerBySlug(params.slug)

  if (!trainer) {
    notFound()
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(price)
  }

  return (
    <div className="bg-muted/10 min-h-screen pb-20">
      {/* Top Banner / Media Area */}
      <div className="w-full h-[30vh] md:h-[40vh] relative overflow-hidden bg-muted">
        {trainer.coverImage ? (
          <img src={trainer.coverImage} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary/80 to-primary/40" />
        )}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative -mt-24 sm:-mt-32 flex flex-col lg:flex-row gap-8 items-start">
        {/* Main Content Column */}
        <div className="flex-1 w-full flex flex-col gap-8">
          
          {/* Header Info Card */}
          <div className="bg-background rounded-2xl shadow-sm border p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center relative">
            <div className="w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-2xl overflow-hidden border-4 border-background shadow-lg relative -mt-16 sm:-mt-0 sm:self-auto">
              <img src={trainer.profileImage} alt={trainer.firstName} className="w-full h-full object-cover" />
            </div>
            
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-2">
                    {trainer.firstName} {trainer.lastName}
                    {trainer.verifiedIdentity && (
                      <ShieldCheck className="h-6 w-6 text-primary" aria-label="Identity Verified" />
                    )}
                  </h1>
                  <p className="text-muted-foreground text-lg font-medium">{trainer.headline}</p>
                </div>
                <div className="hidden sm:flex gap-2">
                  <Button variant="outline" size="icon" className="rounded-full"><Share className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="rounded-full"><Heart className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-1.5 font-medium">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {trainer.rating} <span className="text-muted-foreground underline decoration-muted-foreground/30 underline-offset-4 cursor-pointer">{trainer.reviewCount} reviews</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  {trainer.sessionsCompleted} sessions completed
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {trainer.locations.join(" • ")}
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                {trainer.trainingTypes.map(type => (
                  <Badge key={type} variant="secondary" className="capitalize">{type}</Badge>
                ))}
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-background rounded-2xl shadow-sm border p-6 md:p-8 space-y-6">
            <h2 className="text-2xl font-bold">About {trainer.firstName}</h2>
            <div className="prose prose-neutral max-w-none text-muted-foreground leading-relaxed">
              <p>{trainer.bio}</p>
            </div>
            
            <Separator />
            
            <div className="grid sm:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-4 uppercase tracking-wider text-sm text-foreground">Specialties</h3>
                <div className="flex flex-wrap gap-2">
                  {trainer.specialties.map(spec => (
                    <Badge key={spec} variant="outline" className="bg-muted/50">{spec}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-4 uppercase tracking-wider text-sm text-foreground">Certifications</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {trainer.certifications.map(cert => (
                    <li key={cert} className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{cert}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Packages Section */}
          <div className="space-y-6" id="packages">
            <h2 className="text-2xl font-bold px-1">Training Packages</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {trainer.packages.map(pkg => (
                <div key={pkg.id} className={`bg-background rounded-2xl p-6 border flex flex-col ${pkg.isPopular ? 'border-primary ring-1 ring-primary/20 shadow-md' : 'shadow-sm'}`}>
                  {pkg.isPopular && <Badge className="w-fit mb-4 bg-primary text-primary-foreground">Most Popular</Badge>}
                  <h3 className="text-xl font-bold">{pkg.title}</h3>
                  <div className="mt-2 mb-4">
                    <span className="text-3xl font-extrabold">{formatPrice(pkg.price)}</span>
                    <span className="text-muted-foreground ml-1">/ {pkg.sessions} {pkg.sessions === 1 ? 'session' : 'sessions'}</span>
                  </div>
                  <p className="text-muted-foreground text-sm flex-1">{pkg.description}</p>
                  <Link href={`/checkout?package=${pkg.id}`} className={cn(buttonVariants({ className: "w-full mt-6" }), pkg.isPopular ? 'bg-primary text-primary-foreground' : 'variant-outline')}>
                    Choose Package
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="bg-background rounded-2xl shadow-sm border p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Reviews</h2>
              <div className="text-xl font-bold flex items-center gap-2">
                <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" /> {trainer.rating}
              </div>
            </div>
            
            {trainer.reviews.length > 0 ? (
              <div className="space-y-6 divide-y">
                {trainer.reviews.map(review => (
                  <div key={review.id} className="pt-6 first:pt-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{review.clientName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {review.verified && <span className="text-primary font-medium flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Verified Booking</span>}
                          <span>•</span>
                          <span>{review.date}</span>
                        </div>
                      </div>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-muted text-muted'}`} />
                        ))}
                      </div>
                    </div>
                    <Badge variant="secondary" className="mb-3 font-normal text-xs">{review.goal}</Badge>
                    <p className="text-muted-foreground text-sm leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No reviews yet.</p>
            )}
          </div>
        </div>

        {/* Sticky Sidebar */}
        <div className="w-full lg:w-[400px] shrink-0 sticky top-24 space-y-6">
          <div className="bg-background rounded-2xl shadow-lg border p-6 border-t-4 border-t-primary">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Starting at</p>
                <p className="text-3xl font-extrabold">{formatPrice(trainer.basePrice)}</p>
              </div>
              <p className="text-muted-foreground">/ session</p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 text-sm text-foreground bg-muted/50 p-3 rounded-lg border">
                <Calendar className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-semibold">Next Available</p>
                  <p className="text-muted-foreground">{trainer.nextAvailable}</p>
                </div>
              </div>
            </div>

            <Link href="#packages" className={cn(buttonVariants({ size: "lg" }), "w-full font-bold h-12")}>
              Book a Session
            </Link>
            
            <Button variant="outline" size="lg" className="w-full h-12 mt-3 bg-muted/20">
              Message {trainer.firstName}
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Free cancellation up to 12 hours before
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
