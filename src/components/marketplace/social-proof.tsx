export function SocialProof() {
  return (
    <section className="border-y bg-muted/30 py-12">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 divide-x divide-border/50 text-center">
          <div className="flex flex-col justify-center space-y-1">
            <h3 className="text-3xl font-bold text-foreground">100+</h3>
            <p className="text-sm text-muted-foreground font-medium">Verified Trainers</p>
          </div>
          <div className="flex flex-col justify-center space-y-1">
            <h3 className="text-3xl font-bold text-foreground">2,500+</h3>
            <p className="text-sm text-muted-foreground font-medium">Sessions Booked</p>
          </div>
          <div className="flex flex-col justify-center space-y-1">
            <h3 className="text-3xl font-bold text-foreground">4.9</h3>
            <p className="text-sm text-muted-foreground font-medium">Average Rating</p>
          </div>
          <div className="flex flex-col justify-center space-y-1">
            <h3 className="text-3xl font-bold text-foreground">92%</h3>
            <p className="text-sm text-muted-foreground font-medium">Would Book Again</p>
          </div>
        </div>
      </div>
    </section>
  )
}
