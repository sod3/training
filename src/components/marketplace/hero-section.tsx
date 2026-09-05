"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MapPin, Target } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background pt-16 md:pt-24 lg:pt-32 pb-16 lg:pb-32">
      <div className="container px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col justify-center space-y-8"
          >
            <div className="space-y-6">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl xl:text-6xl/none">
                Find the trainer <br className="hidden sm:block" />
                <span className="text-primary">who gets you there.</span>
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl leading-relaxed">
                Meet verified personal trainers matched to your goals, schedule and location. 
                Your premium fitness journey starts here.
              </p>
            </div>
            
            <div className="w-full max-w-md space-y-4">
              <div className="flex flex-col gap-2 p-2 bg-card border rounded-xl shadow-sm">
                <div className="flex items-center gap-2 px-3 py-2 border-b">
                  <Target className="w-5 h-5 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder="What is your goal?" 
                    className="border-0 shadow-none focus-visible:ring-0 px-1"
                  />
                </div>
                <div className="flex items-center gap-2 px-3 py-2 border-b">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder="Where are you located?" 
                    className="border-0 shadow-none focus-visible:ring-0 px-1"
                  />
                </div>
                <Button size="lg" className="w-full mt-2" asChild>
                  <Link href="/match">
                    <Search className="mr-2 h-4 w-4" /> FIND MY TRAINER
                  </Link>
                </Button>
              </div>
              <div className="flex items-center justify-center pt-2">
                <Button variant="link" asChild className="text-muted-foreground">
                  <Link href="/trainers">Or browse all trainers</Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground font-medium">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">✓</span>
                Identity Verified
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">✓</span>
                Real Client Reviews
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">✓</span>
                Transparent Pricing
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto flex w-full max-w-[500px] items-center justify-center lg:max-w-none lg:justify-end"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl md:aspect-square lg:aspect-[4/5]">
              {/* Using a premium fitness placeholder */}
              <img
                src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop"
                alt="Personal Trainer coaching a client"
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              
              <div className="absolute bottom-6 left-6 right-6 p-4 bg-background/95 backdrop-blur rounded-xl border shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    <img className="inline-block h-10 w-10 rounded-full border-2 border-background object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt=""/>
                    <img className="inline-block h-10 w-10 rounded-full border-2 border-background object-cover" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80" alt=""/>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-medium text-primary-foreground">
                      4.9★
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Join 2,500+ users</p>
                    <p className="text-xs text-muted-foreground">who found their perfect match.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
