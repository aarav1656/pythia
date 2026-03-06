'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, X, Sparkles, Shield, Eye, Brain, Globe } from 'lucide-react'

interface OnboardingStep {
    title: string
    description: string
    icon: React.ReactNode
    image?: string
}

const STEPS: OnboardingStep[] = [
    {
        title: "Swipe to Bet",
        description: "Right for YES, left for NO. It's that simple.",
        icon: <span className="text-4xl">👉</span>,
    },
    {
        title: "World ID Verified",
        description: "One person = One bet. No whales, no bots.",
        icon: <Shield size={40} className="text-[var(--accent-yes)]" />,
    },
    {
        title: "Private & Secure",
        description: "Your bets are hidden with Chainlink ACE encryption.",
        icon: <Eye size={40} className="text-[var(--accent-purple)]" />,
    },
    {
        title: "AI Resolved",
        description: "Markets resolve automatically via Chainlink CRE + AI.",
        icon: <Brain size={40} className="text-[var(--accent-blue)]" />,
    },
    {
        title: "World Mini App",
        description: "Gas-free betting inside World App.",
        icon: <Globe size={40} className="text-[var(--accent-yes)]" />,
    },
]

export function Onboarding() {
    const [isOpen, setIsOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true)

    useEffect(() => {
        // Check localStorage (in production, check backend)
        const seen = localStorage.getItem('pythia_onboarding_seen')
        if (!seen) {
            setHasSeenOnboarding(false)
            setIsOpen(true)
        }
    }, [])

    const complete = () => {
        localStorage.setItem('pythia_onboarding_seen', 'true')
        setIsOpen(false)
        setHasSeenOnboarding(true)
    }

    const next = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            complete()
        }
    }

    const skip = () => {
        complete()
    }

    if (hasSeenOnboarding) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="solid-card p-8 max-w-sm w-full text-center"
                    >
                        {/* Progress */}
                        <div className="flex gap-1 mb-6 justify-center">
                            {STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1 rounded-full transition-all ${
                                        i <= currentStep 
                                            ? 'w-6 bg-[var(--accent-purple)]' 
                                            : 'w-2 bg-white/20'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Icon */}
                        <div className="mb-6 flex justify-center">
                            {STEPS[currentStep].icon}
                        </div>

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {STEPS[currentStep].title}
                        </h2>

                        {/* Description */}
                        <p className="text-zinc-400 mb-8">
                            {STEPS[currentStep].description}
                        </p>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={skip}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-400 text-sm font-semibold"
                            >
                                Skip
                            </button>
                            <button
                                onClick={next}
                                className="flex-1 py-3 rounded-xl bg-[var(--accent-purple)] text-white text-sm font-semibold flex items-center justify-center gap-2"
                            >
                                {currentStep < STEPS.length - 1 ? 'Next' : 'Start'}
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
