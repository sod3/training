"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  CalendarCheck, 
  Users, 
  Heart, 
  MessageCircle, 
  LineChart, 
  CreditCard, 
  Star, 
  User 
} from "lucide-react"

const sidebarNav = [
  { title: "Overview", href: "/dashboard/customer", icon: LayoutDashboard },
  { title: "Bookings", href: "/dashboard/customer/bookings", icon: CalendarCheck },
  { title: "My Trainers", href: "/dashboard/customer/trainers", icon: Users },
  { title: "Saved", href: "/dashboard/customer/saved", icon: Heart },
  { title: "Messages", href: "/dashboard/customer/messages", icon: MessageCircle },
  { title: "Progress", href: "/dashboard/customer/progress", icon: LineChart },
  { title: "Payments", href: "/dashboard/customer/payments", icon: CreditCard },
  { title: "Reviews", href: "/dashboard/customer/reviews", icon: Star },
  { title: "Profile", href: "/dashboard/customer/profile", icon: User },
]

export default function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row gap-8 min-h-[80vh]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col gap-2 shrink-0 border-r pr-6">
        <div className="mb-4 px-2">
          <h2 className="text-xl font-bold tracking-tight">Customer Portal</h2>
          <p className="text-sm text-muted-foreground">Manage your training</p>
        </div>
        <nav className="flex flex-col gap-1">
          {sidebarNav.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Nav (Bottom Bar simulation for now, or just a simplified view) */}
      <div className="md:hidden flex overflow-x-auto pb-4 gap-2 border-b no-scrollbar scroll-smooth">
        {sidebarNav.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all border",
                  isActive 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-background text-muted-foreground border-input"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.title}
              </Link>
            )
          })}
      </div>

      <main className="flex-1 w-full max-w-full overflow-hidden">
        {children}
      </main>
    </div>
  )
}
