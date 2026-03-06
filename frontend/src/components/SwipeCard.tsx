'use client'

import { useState, useCallback } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion'
import { type Market, CATEGORY_COLORS, CATEGORY_ICONS, getOdds, getTimeRemaining, getPotentialPayout } from '@/lib/markets'
import { Clock, Users, TrendingUp, Shield, ChevronDown, Zap } from 'lucide-react'

const SWIPE_THRESHOLD = 100

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

    const handleDragEnd = useCallback((_: any, info: PanInfo) => {
        if (info.offset.x > SWIPE_THRESHOLD) {
            onSwipe(market.id, 'yes')
        } else if (info.offset.x < -SWIPE_THRESHOLD) {
            onSwipe(market.id, 'no')
        }
    }, [market.id, onSwipe])

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
                className="glass-card w-full max-w-[380px] mx-4 cursor-grab active:cursor-grabbing select-none"
                style={{ x, rotate }}
                drag={isTop ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                whileTap={{ scale: 1.02 }}
            >
                {/* YES/NO Overlay Indicators */}
                <motion.div
                    className="absolute inset-0 rounded-3xl flex items-center justify-center pointer-events-none z-20"
                    style={{ opacity: yesOpacity }}
                >
                    <div className="absolute inset-0 rounded-3xl swipe-yes" />
                    <div className="bg-[var(--accent-yes)]/20 backdrop-blur-sm rounded-2xl px-8 py-4 border-2 border-[var(--accent-yes)] rotate-[-12deg]">
                        <span className="text-[var(--accent-yes)] text-4xl font-extrabold tracking-widest">YES</span>
                    </div>
                </motion.div>
                <motion.div
                    className="absolute inset-0 rounded-3xl flex items-center justify-center pointer-events-none z-20"
                    style={{ opacity: noOpacity }}
                >
                    <div className="absolute inset-0 rounded-3xl swipe-no" />
                    <div className="bg-[var(--accent-no)]/20 backdrop-blur-sm rounded-2xl px-8 py-4 border-2 border-[var(--accent-no)] rotate-[12deg]">
                        <span className="text-[var(--accent-no)] text-4xl font-extrabold tracking-widest">NO</span>
                    </div>
                </motion.div>

                {/* Card Content */}
                <div className="p-6 relative z-10">
                    {/* Header: Category + Timer */}
                    <div className="flex items-center justify-between mb-5">
                        <span className={`badge ${CATEGORY_COLORS[market.category]}`}>
                            {CATEGORY_ICONS[market.category]} {market.category}
                        </span>
                        <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                            <Clock size={14} />
                            <span>{timeLeft}</span>
                        </div>
                    </div>

                    {/* Question */}
                    <h2 className="text-xl font-bold leading-tight text-white mb-6">
                        {market.question}
                    </h2>

                    {/* Odds Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-sm font-semibold mb-2">
                            <span className="text-[var(--accent-yes)]">YES {odds.yes}%</span>
                            <span className="text-[var(--accent-no)]">NO {odds.no}%</span>
                        </div>
                        <div className="odds-bar flex">
                            <div className="odds-fill-yes" style={{ width: `${odds.yes}%` }} />
                            <div className="odds-fill-no ml-auto" style={{ width: `${odds.no}%` }} />
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-sm text-zinc-400 mb-5">
                        <div className="flex items-center gap-1.5">
                            <Users size={14} />
                            <span>{market.betCount} bets</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <TrendingUp size={14} />
                            <span>{(market.yesPool + market.noPool).toFixed(3)} ETH</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Shield size={14} className="text-[var(--accent-yes)]" />
                            <span className="text-[var(--accent-yes)]">World ID</span>
                        </div>
                    </div>

                    {/* Expandable Details */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
                        className="w-full flex items-center justify-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1"
                    >
                        <span>{expanded ? 'Less' : 'More'} details</span>
                        <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
                            <ChevronDown size={14} />
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
                                <div className="pt-4 border-t border-white/5 mt-2 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-500">Max bet / person</span>
                                        <span className="text-white font-medium">{market.maxBetPerPerson} ETH</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-500">Potential payout (0.01 ETH YES)</span>
                                        <span className="text-[var(--accent-yes)] font-medium">
                                            {getPotentialPayout(0.01, market, true).toFixed(4)} ETH
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-500">Potential payout (0.01 ETH NO)</span>
                                        <span className="text-[var(--accent-no)] font-medium">
                                            {getPotentialPayout(0.01, market, false).toFixed(4)} ETH
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-2">
                                        <Zap size={12} className="text-[var(--accent-purple)]" />
                                        <span>Powered by Chainlink CRE + AI Resolution</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Swipe Hint */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 text-xs text-[var(--accent-no)]">
                            <span>← Swipe NO</span>
                        </div>
                        <div className="world-id-badge text-xs flex items-center gap-1.5">
                            <span>🌐</span>
                            <span>1 Person = 1 Bet</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--accent-yes)]">
                            <span>Swipe YES →</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}
