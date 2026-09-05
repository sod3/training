"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ShieldCheck, Calendar, MapPin, Clock } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

export default function CheckoutPage() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  // Hardcoded for demo purposes
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(price)
  }

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setTimeout(() => {
      router.push("/booking/success")
    }, 2000)
  }

  return (
    <div className="bg-muted/10 min-h-screen">
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Complete your booking</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Form */}
          <div className="lg:col-span-2 space-y-8">
            <form id="checkout-form" onSubmit={handleCheckout} className="space-y-8">
              {/* Contact Information */}
              <div className="bg-background border rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Contact Information</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" required />
                  </div>
                </div>
              </div>

              {/* Training Location */}
              <div className="bg-background border rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Training Location</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-2 border-primary bg-primary/5 rounded-lg p-4 cursor-pointer">
                    <div className="font-semibold mb-1">Trainer's Gym</div>
                    <div className="text-sm text-muted-foreground">DHA Phase 6</div>
                  </div>
                  <div className="border rounded-lg p-4 cursor-pointer hover:border-primary/50">
                    <div className="font-semibold mb-1">At Home</div>
                    <div className="text-sm text-muted-foreground">Your address</div>
                  </div>
                </div>
              </div>

              {/* Payment Section (Mock) */}
              <div className="bg-background border rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Payment Method</h2>
                <div className="space-y-4">
                  <div className="border-2 border-primary bg-primary/5 rounded-lg p-4 flex items-center gap-3 cursor-pointer">
                    <div className="h-4 w-4 rounded-full border-4 border-primary bg-background flex-shrink-0" />
                    <span className="font-medium">Debit / Credit Card (Mock)</span>
                  </div>
                  <div className="border rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:border-primary/50">
                    <div className="h-4 w-4 rounded-full border border-input bg-background flex-shrink-0" />
                    <span className="font-medium">Bank Transfer</span>
                  </div>
                  
                  <div className="pt-4 grid gap-4">
                    <div className="space-y-2">
                      <Label>Card Number</Label>
                      <Input placeholder="0000 0000 0000 0000" disabled />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Expiry Date</Label>
                        <Input placeholder="MM/YY" disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>CVC</Label>
                        <Input placeholder="123" disabled />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column: Summary */}
          <div className="lg:col-span-1">
            <div className="bg-background border rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="text-xl font-bold mb-4">Booking Summary</h2>
              
              <div className="flex gap-4 mb-6">
                <img 
                  src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200&auto=format&fit=crop" 
                  alt="Ahmed Raza" 
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <h3 className="font-semibold flex items-center gap-1">
                    Ahmed Raza <ShieldCheck className="h-4 w-4 text-primary" />
                  </h3>
                  <p className="text-sm text-muted-foreground">Transformation Package</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3 mb-6">
                <div className="flex gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">First Session:</span> Monday, 7 September
                  </div>
                </div>
                <div className="flex gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Time:</span> 6:00 PM – 7:00 PM
                  </div>
                </div>
                <div className="flex gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium">Location:</span> Trainer's Gym, DHA Phase 6
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Package (8 Sessions)</span>
                  <span>{formatPrice(17000)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service fee</span>
                  <span>{formatPrice(0)}</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between font-bold text-lg mb-6">
                <span>Total</span>
                <span>{formatPrice(17000)}</span>
              </div>

              <Button 
                type="submit" 
                form="checkout-form" 
                className="w-full h-12 text-base font-bold relative overflow-hidden"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                  />
                ) : (
                  `Confirm & Pay ${formatPrice(17000)}`
                )}
              </Button>

              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                  <span className="text-primary text-base">🔒</span> Secure checkout
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Free cancellation up to 12 hours before the first session.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
