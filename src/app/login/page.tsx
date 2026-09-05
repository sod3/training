"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { siteConfig } from "@/config/site"
import { Dumbbell } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()

  const handleMockLogin = (e: React.FormEvent, role: "customer" | "trainer" | "admin") => {
    e.preventDefault()
    // In a real app, this would use NextAuth or similar.
    // For the prototype, we use localStorage to mock the session
    localStorage.setItem("app_role", role)
    if (role === "customer") router.push("/dashboard/customer")
    else if (role === "trainer") router.push("/dashboard/trainer")
    else if (role === "admin") router.push("/admin")
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <Link href="/" className="relative z-10 flex items-center space-x-2 w-fit">
          <div className="bg-background flex h-8 w-8 items-center justify-center rounded-lg text-primary">
            <Dumbbell className="h-5 w-5" />
          </div>
          <span className="font-bold text-xl">{siteConfig.name}</span>
        </Link>
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold mb-4">Your goals, realized.</h2>
          <p className="text-lg opacity-90">
            Log in to manage your bookings, connect with your trainer, and track your progress.
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden mb-12 flex justify-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground">
                <Dumbbell className="h-5 w-5" />
              </div>
              <span className="font-bold text-2xl">{siteConfig.name}</span>
            </Link>
          </div>
          
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground mt-2">Enter your details to access your account.</p>
          </div>

          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" type="password" />
            </div>
            <Button className="w-full h-11 text-base mt-2" onClick={(e) => handleMockLogin(e, "customer")}>
              Log In
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue as (Mock)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-11" onClick={(e) => handleMockLogin(e, "trainer")}>
              Trainer Login
            </Button>
            <Button variant="outline" className="h-11" onClick={(e) => handleMockLogin(e, "admin")}>
              Admin Login
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
