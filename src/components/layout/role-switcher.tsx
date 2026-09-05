"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export type AppRole = "visitor" | "customer" | "trainer" | "admin"

export function RoleSwitcher() {
  const [role, setRole] = useState<AppRole>("visitor")
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const savedRole = localStorage.getItem("app_role") as AppRole
    if (savedRole) {
      setRole(savedRole)
    }
  }, [])

  const handleRoleChange = (newRole: AppRole) => {
    setRole(newRole)
    localStorage.setItem("app_role", newRole)
    
    // Auto-navigate to the right dashboard for convenience
    if (newRole === "customer") router.push("/dashboard/customer")
    else if (newRole === "trainer") router.push("/dashboard/trainer")
    else if (newRole === "admin") router.push("/admin")
    else router.push("/")
  }

  if (!isMounted) return null

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="shadow-md bg-background flex items-center gap-2 border-primary/20">
            <Settings2 className="h-4 w-4" />
            <span className="capitalize hidden sm:inline-block">Dev: {role}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleRoleChange("visitor")}>
            Visitor
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleRoleChange("customer")}>
            Customer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleRoleChange("trainer")}>
            Trainer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleRoleChange("admin")}>
            Admin
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
