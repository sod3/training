import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Calendar, Search, MessageCircle, Activity, MapPin, Clock, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function CustomerDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Good evening, Sara 👋</h1>
        <p className="text-muted-foreground text-lg">You're 63% toward your current fitness goal.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Next Session Card */}
        <Card className="lg:col-span-2 border-primary/20 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Calendar className="w-32 h-32" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Next Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <img 
                src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop" 
                alt="Ahmed Raza" 
                className="w-16 h-16 rounded-xl object-cover"
              />
              <div>
                <h3 className="text-xl font-bold">Ahmed Raza</h3>
                <p className="text-primary font-medium">Transformation Package</p>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/50 p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Date</div>
                <div className="font-semibold">Tomorrow</div>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time</div>
                <div className="font-semibold">6:00 PM</div>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</div>
                <div className="font-semibold truncate">DHA Phase 6</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 relative z-10">
              <Button asChild>
                <Link href="/dashboard/customer/bookings">View Booking</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/customer/messages"><MessageCircle className="mr-2 h-4 w-4" /> Message Ahmed</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Goal Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fitness Goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-3xl font-extrabold text-foreground">88.4<span className="text-lg text-muted-foreground font-semibold">kg</span></p>
                <p className="text-sm text-muted-foreground mt-1">Current Weight</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">82kg</p>
                <p className="text-xs text-muted-foreground">Target</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span className="font-bold text-primary">63%</span>
              </div>
              <Progress value={63} className="h-2.5 bg-primary/20" />
            </div>
            
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg border">
              You are <strong className="text-foreground">6.4kg</strong> closer to your goal. Keep it up!
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/trainers" className="flex flex-col items-center justify-center p-6 bg-muted/30 hover:bg-muted/80 transition-colors rounded-xl border border-dashed border-muted-foreground/30 gap-3 text-center group">
                <div className="bg-background p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <span className="font-medium text-sm">Find a Trainer</span>
              </Link>
              <Link href="/dashboard/customer/messages" className="flex flex-col items-center justify-center p-6 bg-muted/30 hover:bg-muted/80 transition-colors rounded-xl border gap-3 text-center group">
                <div className="bg-background p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <span className="font-medium text-sm">Messages (1 new)</span>
              </Link>
              <Link href="/dashboard/customer/progress" className="flex flex-col items-center justify-center p-6 bg-muted/30 hover:bg-muted/80 transition-colors rounded-xl border gap-3 text-center group">
                <div className="bg-background p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <span className="font-medium text-sm">Log Progress</span>
              </Link>
              <Link href="/dashboard/customer/bookings" className="flex flex-col items-center justify-center p-6 bg-muted/30 hover:bg-muted/80 transition-colors rounded-xl border gap-3 text-center group">
                <div className="bg-background p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <span className="font-medium text-sm">All Bookings</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 gap-1">View all <ArrowRight className="h-3 w-3" /></Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {/* Activity Item */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-background shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">Session Completed</span>
                    <span className="text-xs text-muted-foreground">2 days ago</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Transformation Package session with Ahmed Raza.</p>
                </div>
              </div>
              
              {/* Activity Item */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-muted text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-background shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">New Message</span>
                    <span className="text-xs text-muted-foreground">3 days ago</span>
                  </div>
                  <p className="text-sm text-muted-foreground">"Great work today! Make sure you stretch..."</p>
                </div>
              </div>

              {/* Activity Item */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-muted text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-background shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">Progress Logged</span>
                    <span className="text-xs text-muted-foreground">1 week ago</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Updated weight to 88.4kg.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
