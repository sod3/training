"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Search } from "lucide-react"

type Answer = { [key: string]: string }

const questions = [
  {
    id: "goal",
    question: "What is your main goal?",
    options: ["Lose weight", "Build muscle", "Increase strength", "Improve fitness", "Mobility", "Sports performance", "Other"]
  },
  {
    id: "location_type",
    question: "Where do you prefer to train?",
    options: ["At my home", "At trainer's gym", "Outdoor", "Online"]
  },
  {
    id: "location",
    question: "Where are you located?",
    isSearch: true
  },
  {
    id: "gender",
    question: "Do you have a trainer preference?",
    options: ["Male", "Female", "No preference"]
  },
  {
    id: "budget",
    question: "What's your budget?",
    options: ["Rs. 1,500–2,500", "Rs. 2,500–4,000", "Rs. 4,000+", "Flexible"]
  },
  {
    id: "time",
    question: "When do you usually want to train?",
    options: ["Morning", "Afternoon", "Evening", "Flexible"]
  }
]

export default function MatchQuiz() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Answer>({})
  const [isProcessing, setIsProcessing] = useState(false)
  
  const question = questions[currentStep]

  const handleSelect = (value: string) => {
    setAnswers({ ...answers, [question.id]: value })
    
    if (currentStep < questions.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300)
    } else {
      processResults()
    }
  }

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    handleSelect(fd.get("location") as string)
  }

  const processResults = () => {
    setIsProcessing(true)
    setTimeout(() => {
      router.push("/match/results")
    }, 2000)
  }

  if (isProcessing) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mb-8"
        />
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-bold mb-2"
        >
          Finding your best matches...
        </motion.h2>
        <p className="text-muted-foreground">Analyzing trainers in your area based on your preferences.</p>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex flex-col pt-12 md:pt-24 px-4 pb-20">
      <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col">
        {/* Progress and Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {currentStep > 0 ? (
              <Button variant="ghost" size="icon" onClick={() => setCurrentStep(currentStep - 1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            ) : (
              <div className="w-10" />
            )}
            <span className="text-sm font-medium text-muted-foreground">
              {currentStep + 1} of {questions.length}
            </span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: `${(currentStep / questions.length) * 100}%` }}
              animate={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Questions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col justify-center"
          >
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8 text-center">
              {question.question}
            </h1>

            {question.isSearch ? (
              <form onSubmit={handleSearchSubmit} className="w-full max-w-md mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input 
                    name="location"
                    defaultValue={answers[question.id] || ""}
                    placeholder="e.g. DHA Phase 6, Clifton" 
                    className="pl-12 h-14 text-lg bg-background rounded-xl shadow-sm border-2 focus-visible:ring-0 focus-visible:border-primary"
                    autoFocus
                  />
                </div>
                <Button type="submit" size="lg" className="w-full mt-6 h-12 text-base">Continue</Button>
              </form>
            ) : (
              <div className="grid gap-3 max-w-md mx-auto w-full">
                {question.options?.map((option) => (
                  <Card 
                    key={option}
                    onClick={() => handleSelect(option)}
                    className={`cursor-pointer p-4 transition-all hover:border-primary hover:shadow-md
                      ${answers[question.id] === option ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}
                    `}
                  >
                    <div className="font-medium text-center md:text-lg">{option}</div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
