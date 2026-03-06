'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion'
import { type Market, CATEGORY_COLORS, CATEGORY_ICONS, getOdds, getTimeRemaining, getPotentialPayout } from '@/lib/markets'
import { Clock, Users, TrendingUp, Shield, ChevronDown, Zap } from 'lucide-react'

const SWIPE_THRESHOLD = 100

// Haptic + Sound feedback hook
function useSwipeFeedback() {
    const audioContextRef = useRef<AudioContext | null>(null)

    const playFeedback = useCallback((direction: 'yes' | 'no') => {
        // Haptic feedback (mobile)
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(direction === 'yes' ? 30 : 20)
        }

        // Sound effect (Web Audio API - no external files)
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            }
            const ctx = audioContextRef.current
            
            // Create oscillator for swipe sound
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            
            osc.connect(gain)
            gain.connect(ctx.destination)
            
            // Different tone for yes/no
            osc.frequency.value = direction === 'yes' ? 880 : 440
            osc.type = 'sine'
            
            gain.gain.setValueAtTime(0.15, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
            
            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.1)
        } catch (e) {
            // Audio not supported, ignore
        }
    }, [])

    return playFeedback
}

interface SwipeCardProps {
    market: Market
    onSwipe: (marketId: number, direction: 'yes' | 'no') => void
    isTop: boolean
}

export function SwipeCard({ market, onSwipe, isTop }: SwipeCardProps) {
    const [expanded, setExpanded] = useState(false)
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15])
    const yesOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
    const noOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])

    const odds = getOdds(market)
    const timeLeft = getTimeRemaining(market.endTime)
    const playFeedback = useSwipeFeedback()

    const handleDragEnd = useCallback((_: any, info: PanInfo) => {
        if (info.offset.x > SWIPE_THRESHOLD) {
            playFeedback('yes')
            onSwipe(market.id, 'yes')
        } else if (info.offset.x < -SWIPE_THRESHOLD) {
            playFeedback('no')
            onSwipe(market.id, 'no')
        }
    }, [market.id, onSwipe, playFeedback])

    return (
        <motion.div
            className={`absolute inset-0 flex items-center justify-center ${isTop ? 'z-10' : 'z-0'}`}
            initial={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 15 }}
            animate={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 15 }}
            exit={{
                x: x.get() > 0 ? 400 : -400,
                opacity: 0,
                rotate: x.get() > 0 ? 20 : -20,
                transition: { duration: 0.3 }
            }}
        >
            <motion.div
                className="solid-card w-full max-w-[380px] mx-4 cursor-grab active:cursor-grabbing select-none"
                style={{ x, rotate }}
                drag={isTop ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                whileTap={{ scale: 1.02 }}
            >
                {/* YES/NO Overlay Indicators */}
                <motion.div
                    className="absolute inset-0 rounded-2xl flex items-center justify-center pointer-events-none z-20"
                    style={{ opacity: yesOpacity }}
                >
                    <div className="absolute inset-0 rounded-2xl swipe-yes" />
                    <div className="bg-[var(--accent-yes)]/15 rounded-lg px-6 py-3 border border-[var(--accent-yes)]/40 rotate-[-10deg]">
                        <span className="text-[var(--accent-yes)] text-2xl font-bold tracking-widest">YES</span>
                    </div>
                </motion.div>
                <motion.div
                    className="absolute inset-0 rounded-2xl flex items-center justify-center pointer-events-none z-20"
                    style={{ opacity: noOpacity }}
                >
                    <div className="absolute inset-0 rounded-2xl swipe-no" />
                    <div className="bg-[var(--accent-no)]/15 rounded-lg px-6 py-3 border border-[var(--accent-no)]/40 rotate-[10deg]">
                        <span className="text-[var(--accent-no)] text-2xl font-bold tracking-widest">NO</span>
                    </div>
                </motion.div>

                {/* Card Content */}
                <div className="p-5 relative z-10">
                    {/* Header: Category + Timer */}
                    <div className="flex items-center justify-between mb-4">
                        <span className={`badge ${CATEGORY_COLORS[market.category]}`}>
                            {CATEGORY_ICONS[market.category]} {market.category}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <Clock size={12} />
                            <span>{timeLeft}</span>
                        </div>
                    </div>

                    {/* Question */}
                    <h2 className="text-lg font-semibold leading-tight text-white mb-4">
                        {market.question}
                    </h2>

                    {/* Odds Bar */}
                    <div className="mb-3">
                        <div className="flex justify-between text-xs font-medium mb-2">
                            <span className="text-[var(--accent-yes)]">YES {odds.yes}%</span>
                            <span className="text-[var(--accent-no)]">NO {odds.no}%</span>
                        </div>
                        <div className="odds-bar flex">
                            <div className="odds-fill-yes" style={{ width: `${odds.yes}%` }} />
                            <div className="odds-fill-no ml-auto" style={{ width: `${odds.no}%` }} />
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mb-4">
                        <div className="flex items-center gap-1">
                            <Users size={12} />
                            <span>{market.betCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <TrendingUp size={12} />
                            <span>{(market.yesPool + market.noPool).toFixed(2)} ETH</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Shield size={12} className="text-[var(--accent-yes)]" />
                            <span className="text-[var(--accent-yes)]">World ID</span>
                        </div>
                    </div>

                    {/* Expandable Details */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
                        className="w-full flex items-center justify-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors py-1"
                    >
                        <span>{expanded ? 'Less' : 'More'} details</span>
                        <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
                            <ChevronDown size={12} />
                        </motion.div>
                    </button>

                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-3 border-t border-white/5 mt-2 space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-500">Max bet / person</span>
                                        <span className="text-white font-medium">{market.maxBetPerPerson} ETH</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-500">Payout (0.01 ETH YES)</span>
                                        <span className="text-[var(--accent-yes)] font-medium">
                                            {getPotentialPayout(0.01, market, true).toFixed(4)} ETH
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-500">Payout (0.01 ETH NO)</span>
                                        <span className="text-[var(--accent-no)] font-medium">
                                            {getPotentialPayout(0.01, market, false).toFixed(4)} ETH
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-2">
                                        <Zap size={10} className="text-[var(--accent-purple)]" />
                                        <span>Chainlink CRE + AI Resolution</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Swipe Hint */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--accent-no)]">
                            <span>← NO</span>
                        </div>
                        <div className="world-id-badge text-[10px] flex items-center gap-1">
                            <span>🌐</span>
                            <span>1 Person = 1 Bet</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--accent-yes)]">
                            <span>YES →</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}
