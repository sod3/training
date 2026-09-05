"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dumbbell, Menu, X } from "lucide-react"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"

export function Navbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        <div className="flex flex-1 items-center justify-between md:justify-start">
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground">
              <Dumbbell className="h-5 w-5" />
            </div>
            <span className="inline-block font-bold sm:text-xl text-lg tracking-tight">
              {siteConfig.name}
            </span>
          </Link>
          
          {/* Desktop Nav */}
          <nav className="hidden md:ml-8 md:flex md:gap-6">
            {siteConfig.mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground/80",
                  pathname === item.href ? "text-foreground" : "text-foreground/60"
                )}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex md:items-center md:space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/match">Find My Trainer</Link>
          </Button>
        </div>

        {/* Mobile Nav */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="pr-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <Link
              href="/"
              className="flex items-center space-x-2"
              onClick={() => setIsOpen(false)}
            >
              <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground">
                <Dumbbell className="h-5 w-5" />
              </div>
              <span className="font-bold">{siteConfig.name}</span>
            </Link>
            <div className="my-8 flex flex-col space-y-4">
              {siteConfig.mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-lg font-medium",
                    pathname === item.href ? "text-primary" : "text-foreground/70"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {item.title}
                </Link>
              ))}
            </div>
            <div className="flex flex-col space-y-4 pr-6">
              <Button variant="outline" className="w-full" asChild onClick={() => setIsOpen(false)}>
                <Link href="/login">Log In</Link>
              </Button>
              <Button className="w-full" asChild onClick={() => setIsOpen(false)}>
                <Link href="/match">Find My Trainer</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
