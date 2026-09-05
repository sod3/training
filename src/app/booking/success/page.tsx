"use client"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CheckCircle, Calendar, MapPin, MessageCircle, Home } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function BookingSuccessPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 md:px-6">
      <div className="max-w-md w-full bg-background border rounded-2xl shadow-lg p-8 text-center relative overflow-hidden">
        {/* Confetti / Celebration effect placeholder */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-emerald-400 to-primary" />
        
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="mx-auto w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle className="w-10 h-10" />
        </motion.div>
        
        <h1 className="text-3xl font-bold mb-2">You're booked!</h1>
        <p className="text-muted-foreground mb-8">
          Your training session with Ahmed Raza has been confirmed. A confirmation email has been sent to you.
        </p>

        <div className="bg-muted/30 rounded-xl p-4 mb-8 text-left space-y-4 border">
          <div className="flex gap-3 text-sm">
            <Calendar className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Monday, 7 September</p>
              <p className="text-muted-foreground">6:00 PM – 7:00 PM</p>
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            <MapPin className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Trainer's Gym</p>
              <p className="text-muted-foreground">DHA Phase 6</p>
            </div>
          </div>
          <div className="border-t pt-4 mt-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Booking Reference</p>
            <p className="font-mono text-sm">#ELV-849201</p>
          </div>
        </div>

        <div className="space-y-3">
          <Link href="/dashboard/customer" className={cn(buttonVariants(), "w-full")}>
            Go to Dashboard
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <Link href="#" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
              <Calendar className="mr-2 h-4 w-4" /> Add to Cal
            </Link>
            <Link href="/dashboard/customer/messages" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
              <MessageCircle className="mr-2 h-4 w-4" /> Message
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
