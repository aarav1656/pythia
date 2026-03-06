'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Loader2, ArrowRight } from 'lucide-react'

interface AIMarketSuggestion {
    question: string
    category: string
    rationale: string
}

interface CreateMarketModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (question: string, category: string) => void
}

export function CreateMarketModal({ isOpen, onClose, onSubmit }: CreateMarketModalProps) {
    const [question, setQuestion] = useState('')
    const [category, setCategory] = useState('crypto')
    const [isGenerating, setIsGenerating] = useState(false)
    const [suggestion, setSuggestion] = useState<AIMarketSuggestion | null>(null)

    const generateWithAI = async () => {
        if (!question.trim()) return
        
        setIsGenerating(true)
        
        // Simulate AI generation (in production, call OpenRouter API)
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Mock AI suggestions based on input
        const suggestions: AIMarketSuggestion[] = [
            {
                question: `Will ${question}?`,
                category: category,
                rationale: 'Based on current market trends and on-chain data, this has high trading volume potential.'
            },
            {
                question: `Will ${question} happen by Q2 2026?`,
                category: category,
                rationale: 'Timeline-specific markets have higher resolution clarity.'
            }
        ]
        
        setSuggestion(suggestions[Math.floor(Math.random() * suggestions.length)])
        setIsGenerating(false)
    }

    const handleSubmit = () => {
        const finalQuestion = suggestion?.question || question
        onSubmit(finalQuestion, category)
        setQuestion('')
        setSuggestion(null)
        onClose()
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="solid-card p-6 max-w-sm w-full"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Sparkles size={18} className="text-[var(--accent-purple)]" />
                            <h3 className="text-lg font-bold text-white">Create Market</h3>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
                            <X size={18} className="text-zinc-400" />
                        </button>
                    </div>

                    {/* Category Selection */}
                    <div className="mb-4">
                        <label className="text-xs text-zinc-500 uppercase mb-2 block">Category</label>
                        <div className="flex flex-wrap gap-2">
                            {['crypto', 'sports', 'politics', 'weather', 'entertainment', 'other'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                                        category === cat
                                            ? 'bg-[var(--accent-purple)] text-white'
                                            : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Question Input */}
                    <div className="mb-4">
                        <label className="text-xs text-zinc-500 uppercase mb-2 block">
                            What do you want to predict?
                        </label>
                        <textarea
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            placeholder="e.g., ETH reach $5,000"
                            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-zinc-600 resize-none focus:outline-none focus:border-[var(--accent-purple)]"
                            rows={2}
                        />
                    </div>

                    {/* AI Generate Button */}
                    <button
                        onClick={generateWithAI}
                        disabled={!question.trim() || isGenerating}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-blue)] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 mb-4"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Enhance with AI
                            </>
                        )}
                    </button>

                    {/* AI Suggestion */}
                    <AnimatePresence>
                        {suggestion && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mb-4 overflow-hidden"
                            >
                                <div className="p-3 rounded-xl bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20">
                                    <p className="text-sm text-white font-medium mb-1">{suggestion.question}</p>
                                    <p className="text-[10px] text-zinc-400">{suggestion.rationale}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        className="w-full py-3 rounded-xl bg-[var(--accent-yes)] text-black text-sm font-semibold flex items-center justify-center gap-2 hover:brightness-110"
                    >
                        Create Market
                        <ArrowRight size={16} />
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

// Floating Action Button to create market
export function CreateMarketFAB({ onClick }: { onClick: () => void }) {
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-yes)] flex items-center justify-center shadow-lg shadow-[var(--accent-purple)]/30 z-40"
        >
            <Sparkles size={24} className="text-white" />
        </motion.button>
    )
}
