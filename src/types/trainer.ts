export type TrainingType = "home" | "gym" | "outdoor" | "online";

export interface TrainerPackage {
  id: string;
  title: string;
  price: number;
  sessions: number;
  duration: number; // in minutes
  description: string;
  isPopular?: boolean;
}

export interface Review {
  id: string;
  clientName: string;
  rating: number;
  date: string;
  goal: string;
  comment: string;
  verified: boolean;
}

export interface Trainer {
  timezone?: string;
  city?: string;
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  profileImage: string;
  coverImage?: string;
  headline: string;
  bio: string;
  verifiedIdentity: boolean;
  verifiedCredentials: boolean;
  rating: number;
  reviewCount: number;
  sessionsCompleted: number;
  experienceYears: number;
  responseTime: string;
  locations: string[];
  trainingTypes: TrainingType[];
  specialties: string[];
  certifications: string[];
  packages: TrainerPackage[];
  reviews: Review[];
  basePrice: number;
  nextAvailable: string;
  matchScore?: number;
  distanceKm?: number;
}
