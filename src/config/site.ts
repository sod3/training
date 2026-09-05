export const siteConfig = {
  name: "Elevate",
  description: "Find the trainer who gets you there. Meet verified personal trainers matched to your goals, schedule and location.",
  mainNav: [
    {
      title: "Find Trainers",
      href: "/trainers",
    },
    {
      title: "How It Works",
      href: "/how-it-works",
    },
    {
      title: "For Trainers",
      href: "/become-a-trainer",
    },
    {
      title: "About",
      href: "/about",
    },
  ],
  links: {
    twitter: "https://twitter.com/elevate",
    github: "https://github.com/elevate",
    docs: "https://elevate.com",
  },
}

export type SiteConfig = typeof siteConfig
