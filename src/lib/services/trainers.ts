import { Trainer } from "@/types/trainer"
import { trainers } from "@/data/trainers"

export async function getTrainers(): Promise<Trainer[]> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800))
  return trainers
}

export async function getTrainerBySlug(slug: string): Promise<Trainer | null> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  const trainer = trainers.find((t) => t.slug === slug)
  return trainer || null
}

export async function getFeaturedTrainers(): Promise<Trainer[]> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  return trainers.slice(0, 3)
}

export async function searchTrainers(query: string): Promise<Trainer[]> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  const lowerQuery = query.toLowerCase()
  return trainers.filter(
    (t) =>
      t.firstName.toLowerCase().includes(lowerQuery) ||
      t.lastName.toLowerCase().includes(lowerQuery) ||
      t.specialties.some((s) => s.toLowerCase().includes(lowerQuery)) ||
      t.locations.some((l) => l.toLowerCase().includes(lowerQuery))
  )
}
