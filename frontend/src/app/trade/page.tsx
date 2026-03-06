'use client'

import { useState, useCallback } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion'
import { type Market, SEED_MARKETS, CATEGORY_COLORS, CATEGORY_ICONS, getOdds, getTimeRemaining, getPotentialPayout } from '@/lib/markets'
import { useDemoMode } from '@/hooks/useDemoMode'
import { useMiniKit } from '@/hooks/useMiniKit'
import { Clock, Users, TrendingUp, Shield, ChevronDown, Zap, ThumbsUp, ThumbsDown, X, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

const SWIPE_THRESHOLD = 80

interface TradePageProps {
    onBet?: (marketId: number, side: 'yes' | 'no', amount?: number) => void
}

// Haptic feedback
function useHaptic() {
    const trigger = useCallback((type: 'success' | 'error' | 'light') => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            const patterns = { success: 30, error: 20, light: 10 }
            navigator.vibrate(patterns[type])
        }
    }, [])
    return trigger
}

export default function TradePage() {
    const router = useRouter()
    const { isDemoMode } = useDemoMode()
    const { isInWorldApp } = useMiniKit()
    const [markets] = useState<Market[]>(isDemoMode ? [...SEED_MARKETS] : [])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [swipedMarkets, setSwipedMarkets] = useState<{ market: Market; side: 'yes' | 'no' }[]>([])
    const [expanded, setExpanded] = useState(false)
    const [showConfirm, setShowConfirm] = useState<{ market: Market; side: 'yes' | 'no' } | null>(null)
    
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-300, 0, 300], [-12, 0, 12])
    const yesOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
    const noOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])
    
    const haptic = useHaptic()

    const currentMarket = markets[currentIndex]
    const hasMoreMarkets = currentIndex < markets.length

    const handleDragEnd = useCallback((_: any, info: PanInfo) => {
        if (info.offset.x > SWIPE_THRESHOLD) {
            haptic('success')
            setShowConfirm({ market: currentMarket, side: 'yes' })
        } else if (info.offset.x < -SWIPE_THRESHOLD) {
            haptic('success')
            setShowConfirm({ market: currentMarket, side: 'no' })
        }
    }, [currentMarket, haptic])

    const confirmBet = useCallback(() => {
        if (!showConfirm) return
        setSwipedMarkets(prev => [...prev, { market: showConfirm.market, side: showConfirm.side }])
        setCurrentIndex(prev => prev + 1)
        setShowConfirm(null)
    }, [showConfirm])

    const skipMarket = useCallback(() => {
        setCurrentIndex(prev => prev + 1)
    }, [])

    if (!hasMoreMarkets) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex flex-col">
                {/* Header */}
                <header className="w-full px-4 py-3 flex items-center justify-between max-w-lg mx-auto">
                    <button onClick={() => router.back()} className="p-2 -ml-2">
                        <X size={20} className="text-zinc-400" />
                    </button>
                    <h1 className="text-base font-semibold text-white">Trade</h1>
                    <div className="w-10" />
                </header>

                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="solid-card p-8 text-center max-w-sm">
                        <div className="text-4xl mb-3">-</div>
                        <h3 className="text-lg font-semibold text-white mb-2">No More Markets</h3>
                        <p className="text-sm text-zinc-500 mb-5">
                            {swipedMarkets.length > 0 && `You placed ${swipedMarkets.length} bet${swipedMarkets.length > 1 ? 's' : ''}.`}
                        </p>
                        <button
                            onClick={() => { setCurrentIndex(0); setSwipedMarkets([]) }}
                            className="px-5 py-2.5 rounded-lg bg-[var(--accent-purple)] text-white font-medium text-sm"
                        >
                            Browse Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const market = currentMarket
    const odds = getOdds(market)
    const timeLeft = getTimeRemaining(market.endTime)

    return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col">
            {/* Header */}
            <header className="w-full px-4 py-3 flex items-center justify-between max-w-lg mx-auto">
                <button onClick={() => router.back()} className="p-2 -ml-2">
                    <X size={20} className="text-zinc-400" />
                </button>
                <div className="flex items-center gap-2">
                    {/* Progress indicator */}
                    <div className="flex items-center gap-1">
                        {markets.slice(0, 5).map((_, i) => (
                            <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                    i < currentIndex ? 'bg-[var(--accent-purple)]' :
                                    i === currentIndex ? 'bg-[var(--accent-purple)]' : 'bg-zinc-700'
                                }`}
                            />
                        ))}
                        {markets.length > 5 && <span className="text-[10px] text-zinc-500">+{markets.length - 5}</span>}
                    </div>
                    <span className="text-xs text-zinc-500">{currentIndex + 1}/{markets.length}</span>
                </div>
                <button onClick={skipMarket} className="p-2 -mr-2">
                    <span className="text-xs text-zinc-500">Skip</span>
                </button>
            </header>

            {/* Card Area */}
            <div className="flex-1 flex items-center justify-center px-4 pb-4">
                <motion.div
                    className="w-full max-w-[360px]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <motion.div
                        className="solid-card cursor-grab active:cursor-grabbing"
                        style={{ x, rotate }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.8}
                        onDragEnd={handleDragEnd}
                        whileTap={{ scale: 1.01 }}
                    >
                        {/* Swipe Overlays */}
                        <motion.div
                            className="absolute inset-0 rounded-2xl flex items-center justify-center pointer-events-none z-20"
                            style={{ opacity: yesOpacity }}
                        >
                            <div className="absolute inset-0 rounded-2xl border-2 border-[var(--accent-yes)]" />
                            <div className="bg-[var(--accent-yes)]/20 rounded-lg px-5 py-2 border border-[var(--accent-yes)]/50 rotate-[-8deg]">
                                <span className="text-[var(--accent-yes)] text-xl font-bold">YES</span>
                            </div>
                        </motion.div>
                        <motion.div
                            className="absolute inset-0 rounded-2xl flex items-center justify-center pointer-events-none z-20"
                            style={{ opacity: noOpacity }}
                        >
                            <div className="absolute inset-0 rounded-2xl border-2 border-[var(--accent-no)]" />
                            <div className="bg-[var(--accent-no)]/20 rounded-lg px-5 py-2 border border-[var(--accent-no)]/50 rotate-[8deg]">
                                <span className="text-[var(--accent-no)] text-xl font-bold">NO</span>
                            </div>
                        </motion.div>

                        {/* Card Content */}
                        <div className="p-5">
                            {/* Category & Timer */}
                            <div className="flex items-center justify-between mb-4">
                                <span className={`badge ${CATEGORY_COLORS[market.category]}`}>
                                    {CATEGORY_ICONS[market.category]} {market.category}
                                </span>
                                <div className="flex items-center gap-1 text-xs text-zinc-500">
                                    <Clock size={12} />
                                    <span>{timeLeft}</span>
                                </div>
                            </div>

                            {/* Question */}
                            <h2 className="text-lg font-semibold leading-tight text-white mb-4">
                                {market.question}
                            </h2>

                            {/* Odds */}
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

                            {/* Stats */}
                            <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3">
                                <div className="flex items-center gap-1">
                                    <Users size={11} />
                                    <span>{market.betCount}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <TrendingUp size={11} />
                                    <span>{(market.yesPool + market.noPool).toFixed(2)} ETH</span>
                                </div>
                            </div>

                            {/* Expand */}
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="w-full flex items-center justify-center gap-1 text-[10px] text-zinc-500 py-1"
                            >
                                <span>{expanded ? 'Less' : 'More'}</span>
                                <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                            </button>

                            {expanded && (
                                <div className="pt-3 border-t border-white/5 mt-2 space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Max bet</span>
                                        <span className="text-white">{market.maxBetPerPerson} ETH</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Payout (YES)</span>
                                        <span className="text-[var(--accent-yes)]">{getPotentialPayout(market.maxBetPerPerson, market, true).toFixed(4)} ETH</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Payout (NO)</span>
                                        <span className="text-[var(--accent-no)]">{getPotentialPayout(market.maxBetPerPerson, market, false).toFixed(4)} ETH</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 pb-6 max-w-lg mx-auto w-full">
                <div className="flex items-center justify-center gap-5">
                    <button
                        onClick={() => { haptic('light'); setShowConfirm({ market, side: 'no' }) }}
                        className="w-14 h-14 rounded-xl bg-[var(--accent-no)]/10 border border-[var(--accent-no)]/25 flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <X size={24} className="text-[var(--accent-no)]" />
                    </button>
                    <button
                        onClick={() => { haptic('light'); setShowConfirm({ market, side: 'yes' }) }}
                        className="w-14 h-14 rounded-xl bg-[var(--accent-yes)]/10 border border-[var(--accent-yes)]/25 flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <Check size={24} className="text-[var(--accent-yes)]" />
                    </button>
                </div>
                <p className="text-[10px] text-zinc-600 text-center mt-2">Swipe or tap to bet</p>
            </div>

            {/* Confirm Modal */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                        onClick={() => setShowConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="solid-card p-5 max-w-xs w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-base font-semibold text-white text-center mb-1">
                                Bet {showConfirm.side.toUpperCase()}?
                            </h3>
                            <p className="text-xs text-zinc-500 text-center mb-4">{showConfirm.market.question}</p>
                            
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-xs p-2 rounded-lg bg-white/[0.03]">
                                    <span className="text-zinc-500">Amount</span>
                                    <span className="text-white">{showConfirm.market.maxBetPerPerson} ETH</span>
                                </div>
                                <div className="flex justify-between text-xs p-2 rounded-lg bg-white/[0.03]">
                                    <span className="text-zinc-500">Payout</span>
                                    <span className={showConfirm.side === 'yes' ? 'text-[var(--accent-yes)]' : 'text-[var(--accent-no)]'}>
                                        {getPotentialPayout(showConfirm.market.maxBetPerPerson, showConfirm.market, showConfirm.side === 'yes').toFixed(4)} ETH
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowConfirm(null)}
                                    className="flex-1 py-2.5 rounded-lg border border-white/10 text-zinc-400 text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmBet}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-medium ${
                                        showConfirm.side === 'yes' ? 'bg-[var(--accent-yes)] text-black' : 'bg-[var(--accent-no)] text-white'
                                    }`}
                                >
                                    Confirm
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
