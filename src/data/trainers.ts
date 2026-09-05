import { Trainer } from "@/types/trainer"

export const trainers: Trainer[] = [
  {
    id: "t1",
    slug: "ahmed-raza",
    firstName: "Ahmed",
    lastName: "Raza",
    gender: "male",
    profileImage: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2070&auto=format&fit=crop",
    coverImage: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop",
    headline: "Certified Strength & Transformation Coach",
    bio: "Training should fit your life, not take it over. With over 6 years of experience helping clients in Karachi achieve their dream physiques, I focus on sustainable habits, progressive overload, and making the journey enjoyable.",
    verifiedIdentity: true,
    verifiedCredentials: true,
    rating: 4.9,
    reviewCount: 84,
    sessionsCompleted: 124,
    experienceYears: 6,
    responseTime: "within 15 min",
    locations: ["DHA Phase 6", "Clifton", "Bahria Town Karachi"],
    trainingTypes: ["home", "gym", "outdoor"],
    specialties: ["Strength Training", "Fat Loss", "Muscle Building", "Functional Fitness", "Mobility"],
    certifications: ["NASM Certified Personal Trainer", "Level 3 Strength Coaching", "First Aid & CPR"],
    basePrice: 2500,
    nextAvailable: "Today, 6:00 PM",
    packages: [
      {
        id: "p1_t1",
        title: "Trial Session",
        price: 1500,
        sessions: 1,
        duration: 60,
        description: "1 x 60-minute session. Fitness assessment and goal consultation."
      },
      {
        id: "p2_t1",
        title: "Starter",
        price: 9000,
        sessions: 4,
        duration: 60,
        description: "4 sessions. Personal workout structure and progress check."
      },
      {
        id: "p3_t1",
        title: "Transformation",
        price: 17000,
        sessions: 8,
        duration: 60,
        description: "8 sessions. Custom program, progress tracking, and weekly assessment.",
        isPopular: true
      },
      {
        id: "p4_t1",
        title: "Monthly Coaching",
        price: 30000,
        sessions: 12,
        duration: 60,
        description: "12 sessions. Ongoing programming, progress dashboard, and trainer messaging."
      }
    ],
    reviews: [
      {
        id: "r1_t1",
        clientName: "Hamza M.",
        rating: 5,
        date: "2023-10-15",
        goal: "Build Muscle",
        comment: "Ahmed completely changed my approach to fitness. Highly recommend!",
        verified: true
      },
      {
        id: "r2_t1",
        clientName: "Bilal K.",
        rating: 5,
        date: "2023-09-22",
        goal: "Strength",
        comment: "Professional, punctual, and very knowledgeable.",
        verified: true
      }
    ]
  },
  {
    id: "t2",
    slug: "hira-khan",
    firstName: "Hira",
    lastName: "Khan",
    gender: "female",
    profileImage: "https://images.unsplash.com/photo-1548690312-e3b507d8c110?q=80&w=1974&auto=format&fit=crop",
    headline: "Women's Fitness & Weight Loss Specialist",
    bio: "Empowering women to feel strong and confident. I specialize in weight loss, post-pregnancy fitness, and general wellness. I create a safe, supportive environment for all my clients.",
    verifiedIdentity: true,
    verifiedCredentials: true,
    rating: 5.0,
    reviewCount: 112,
    sessionsCompleted: 450,
    experienceYears: 8,
    responseTime: "within 1 hour",
    locations: ["PECHS", "Gulshan-e-Iqbal", "KDA"],
    trainingTypes: ["home", "online", "gym"],
    specialties: ["Weight Loss", "Post-Pregnancy Fitness", "General Fitness", "Core Strength"],
    certifications: ["ACE Certified Personal Trainer", "Pre & Postnatal Coaching", "Nutrition Specialist"],
    basePrice: 3000,
    nextAvailable: "Tomorrow, 8:00 AM",
    packages: [
       {
        id: "p1_t2",
        title: "Trial Session",
        price: 2000,
        sessions: 1,
        duration: 60,
        description: "Assessment and introductory workout."
      },
      {
        id: "p2_t2",
        title: "Transform 8",
        price: 22000,
        sessions: 8,
        duration: 60,
        description: "8 sessions focused on sustainable weight loss.",
        isPopular: true
      }
    ],
    reviews: []
  },
  {
    id: "t3",
    slug: "omar-siddiqui",
    firstName: "Omar",
    lastName: "Siddiqui",
    gender: "male",
    profileImage: "https://images.unsplash.com/photo-1583465584518-e9915152a5c8?q=80&w=2071&auto=format&fit=crop",
    headline: "Athletic Performance & Mobility Coach",
    bio: "Whether you are a weekend warrior or looking to move pain-free, I build resilient bodies. Let's unlock your athletic potential.",
    verifiedIdentity: true,
    verifiedCredentials: false,
    rating: 4.7,
    reviewCount: 34,
    sessionsCompleted: 89,
    experienceYears: 4,
    responseTime: "within a few hours",
    locations: ["North Nazimabad", "Bahadurabad"],
    trainingTypes: ["gym", "outdoor"],
    specialties: ["Sports Performance", "Mobility", "Conditioning"],
    certifications: ["ISSA Certified Fitness Trainer"],
    basePrice: 2000,
    nextAvailable: "Wednesday, 5:00 PM",
    packages: [
      {
        id: "p1_t3",
        title: "Single Session",
        price: 2000,
        sessions: 1,
        duration: 60,
        description: "1 x 60-minute targeted session."
      }
    ],
    reviews: []
  },
  {
    id: "t4",
    slug: "sara-ali",
    firstName: "Sara",
    lastName: "Ali",
    gender: "female",
    profileImage: "https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=1974&auto=format&fit=crop",
    headline: "Yoga & Holistic Health Coach",
    bio: "Mindful movement for a stressful world. I combine yoga, Pilates, and functional training to help you find balance.",
    verifiedIdentity: true,
    verifiedCredentials: true,
    rating: 4.9,
    reviewCount: 67,
    sessionsCompleted: 210,
    experienceYears: 5,
    responseTime: "within 30 min",
    locations: ["DHA Phase 5", "DHA Phase 8", "Clifton"],
    trainingTypes: ["home", "online"],
    specialties: ["Yoga", "Mobility", "Pilates", "General Fitness"],
    certifications: ["RYT 200", "Pilates Mat Certification"],
    basePrice: 3500,
    nextAvailable: "Today, 7:00 PM",
    packages: [
      {
        id: "p1_t4",
        title: "Holistic Month",
        price: 25000,
        sessions: 8,
        duration: 60,
        description: "8 sessions of mindful movement.",
        isPopular: true
      }
    ],
    reviews: []
  }
]
