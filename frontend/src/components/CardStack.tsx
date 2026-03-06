'use client'

import { useState, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SwipeCard } from './SwipeCard'
import { type Market, SEED_MARKETS } from '@/lib/markets'
import { useMiniKit } from '@/hooks/useMiniKit'
import { ThumbsUp, ThumbsDown, RotateCcw, Eye, RefreshCw, Shield, Loader2 } from 'lucide-react'

interface CardStackProps {
    onBet?: (marketId: number, side: 'yes' | 'no', proof?: string) => void
}

export function CardStack({ onBet }: CardStackProps) {
    const [markets, setMarkets] = useState<Market[]>([...SEED_MARKETS])
    const [swipedMarkets, setSwipedMarkets] = useState<{ market: Market; side: 'yes' | 'no' }[]>([])
    const [showConfirm, setShowConfirm] = useState<{ market: Market; side: 'yes' | 'no' } | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [verificationError, setVerificationError] = useState<string | null>(null)
    const pullStartY = useRef(0)

    const { verifyWorldID, isInWorldApp, user } = useMiniKit()

    // Pull to refresh handler
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        pullStartY.current = e.touches[0].clientY
    }, [])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        const currentY = e.touches[0].clientY
        const diff = pullStartY.current - currentY
        
        // If pulling down on the card area, trigger refresh
        if (diff < -100 && markets.length > 0) {
            setIsRefreshing(true)
            // Simulate refresh
            setTimeout(() => {
                setMarkets(prev => [...prev, ...SEED_MARKETS.map(m => ({ ...m, id: m.id + Date.now() }))])
                setIsRefreshing(false)
            }, 1000)
            pullStartY.current = 0 // Reset to prevent multiple triggers
        }
    }, [markets.length])

    const handleSwipe = useCallback((marketId: number, direction: 'yes' | 'no') => {
        const market = markets.find(m => m.id === marketId)
        if (!market) return

        setShowConfirm({ market, side: direction })
    }, [markets])

    const confirmBet = useCallback(async () => {
        if (!showConfirm) return
        const { market, side } = showConfirm

        setVerificationError(null)

        // If in World App, verify World ID before placing bet
        if (isInWorldApp) {
            setIsVerifying(true)
            try {
                // Verify user is human with World ID
                const proof = await verifyWorldID(`pythia_bet_${market.id}`)
                
                // Bet placed successfully with proof
                setMarkets(prev => prev.filter(m => m.id !== market.id))
                setSwipedMarkets(prev => [...prev, { market, side }])
                setShowConfirm(null)
                onBet?.(market.id, side, proof.proof)
            } catch (e: any) {
                console.error('World ID verification failed:', e)
                setVerificationError(e.message || 'Verification failed')
            } finally {
                setIsVerifying(false)
            }
        } else {
            // Fallback for browser - just place bet (for demo)
            setMarkets(prev => prev.filter(m => m.id !== market.id))
            setSwipedMarkets(prev => [...prev, { market, side }])
            setShowConfirm(null)
            onBet?.(market.id, side)
        }
    }, [showConfirm, onBet, isInWorldApp, verifyWorldID])

    const cancelBet = useCallback(() => {
        setShowConfirm(null)
    }, [])

    const resetCards = useCallback(() => {
        setMarkets([...SEED_MARKETS])
        setSwipedMarkets([])
    }, [])

    const topMarket = markets[0]
    const nextMarket = markets[1]

    return (
        <div 
            className="relative w-full flex flex-col items-center"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
        >
            {/* Pull to refresh indicator */}
            {isRefreshing && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-0 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-purple)] text-white text-sm"
                >
                    <RefreshCw size={16} className="animate-spin" />
                    Loading markets...
                </motion.div>
            )}

            {/* Card Stack Area */}
            <div className="relative w-full h-[520px] flex items-center justify-center">
                <AnimatePresence>
                    {nextMarket && (
                        <SwipeCard
                            key={`card-${nextMarket.id}`}
                            market={nextMarket}
                            onSwipe={handleSwipe}
                            isTop={false}
                        />
                    )}
                    {topMarket && (
                        <SwipeCard
                            key={`card-${topMarket.id}`}
                            market={topMarket}
                            onSwipe={handleSwipe}
                            isTop={true}
                        />
                    )}
                </AnimatePresence>

                {/* Empty State */}
                {markets.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-10 text-center max-w-[380px] mx-4"
                    >
                        <div className="text-5xl mb-4">🎉</div>
                        <h3 className="text-xl font-bold text-white mb-2">All caught up!</h3>
                        <p className="text-zinc-400 text-sm mb-6">
                            You&apos;ve swiped through all active markets.
                            {swipedMarkets.length > 0 && ` You placed ${swipedMarkets.length} bet${swipedMarkets.length > 1 ? 's' : ''}.`}
                        </p>
                        <button
                            onClick={resetCards}
                            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-full bg-[var(--accent-purple)] text-white font-semibold text-sm hover:brightness-110 transition-all"
                        >
                            <RotateCcw size={16} />
                            Browse Again
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Action Buttons (below cards) */}
            {markets.length > 0 && (
                <div className="flex items-center gap-6 mt-2">
                    <button
                        onClick={() => topMarket && handleSwipe(topMarket.id, 'no')}
                        className="w-14 h-14 rounded-full bg-[var(--accent-no)]/10 border border-[var(--accent-no)]/30 flex items-center justify-center hover:bg-[var(--accent-no)]/20 transition-all active:scale-90"
                    >
                        <ThumbsDown size={22} className="text-[var(--accent-no)]" />
                    </button>
                    <button
                        onClick={() => topMarket && handleSwipe(topMarket.id, 'yes')}
                        className="w-14 h-14 rounded-full bg-[var(--accent-yes)]/10 border border-[var(--accent-yes)]/30 flex items-center justify-center hover:bg-[var(--accent-yes)]/20 transition-all active:scale-90"
                    >
                        <ThumbsUp size={22} className="text-[var(--accent-yes)]" />
                    </button>
                </div>
            )}

            {/* Bet Confirmation Modal */}
            <AnimatePresence>
                {showConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={cancelBet}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card p-6 max-w-sm w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center mb-5">
                                <div className={`text-5xl mb-3 ${showConfirm.side === 'yes' ? 'text-[var(--accent-yes)]' : 'text-[var(--accent-no)]'}`}>
                                    {showConfirm.side === 'yes' ? '👍' : '👎'}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">
                                    Bet {showConfirm.side.toUpperCase()}?
                                </h3>
                                <p className="text-sm text-zinc-400">{showConfirm.market.question}</p>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm p-3 rounded-xl bg-white/5">
                                    <span className="text-zinc-400">Amount</span>
                                    <span className="text-white font-semibold">{showConfirm.market.maxBetPerPerson} ETH</span>
                                </div>
                                <div className="flex justify-between text-sm p-3 rounded-xl bg-white/5">
                                    <span className="text-zinc-400">Potential payout</span>
                                    <span className={`font-semibold ${showConfirm.side === 'yes' ? 'text-[var(--accent-yes)]' : 'text-[var(--accent-no)]'}`}>
                                        {(() => {
                                            const { market: m, side } = showConfirm
                                            const payout = (m.maxBetPerPerson * (m.yesPool + m.noPool + m.maxBetPerPerson)) /
                                                ((side === 'yes' ? m.yesPool : m.noPool) + m.maxBetPerPerson)
                                            return payout.toFixed(4)
                                        })()} ETH
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-500 p-3 rounded-xl bg-white/5">
                                    <Eye size={14} className="text-[var(--accent-purple)]" />
                                    <span>Your bet is private via Chainlink ACE</span>
                                </div>
                            </div>

                            {/* World ID Verification Info */}
                            {isInWorldApp && (
                                <div className="flex items-center gap-2 text-xs text-zinc-400 p-3 rounded-xl bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20 mb-4">
                                    <Shield size={14} className="text-[var(--accent-purple)]" />
                                    <span>World ID verification required</span>
                                </div>
                            )}

                            {/* Verification Error */}
                            {verificationError && (
                                <div className="flex items-center gap-2 text-xs text-red-400 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                                    <span>{verificationError}</span>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={cancelBet}
                                    disabled={isVerifying}
                                    className="flex-1 py-3 rounded-full border border-white/10 text-zinc-400 text-sm font-semibold hover:bg-white/5 transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmBet}
                                    disabled={isVerifying}
                                    className={`flex-1 py-3 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2 ${showConfirm.side === 'yes'
                                            ? 'bg-[var(--accent-yes)] text-black hover:brightness-110'
                                            : 'bg-[var(--accent-no)] text-white hover:brightness-110'
                                        } disabled:opacity-50`}
                                >
                                    {isVerifying ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        `Confirm ${showConfirm.side.toUpperCase()}`
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Recent Bets */}
            {swipedMarkets.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 w-full max-w-[380px] mx-4"
                >
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Your Bets</h3>
                    <div className="space-y-2">
                        {swipedMarkets.map(({ market, side }) => (
                            <div key={market.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${side === 'yes' ? 'bg-[var(--accent-yes)]/15 text-[var(--accent-yes)]' : 'bg-[var(--accent-no)]/15 text-[var(--accent-no)]'
                                    }`}>
                                    {side === 'yes' ? '✓' : '✗'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white truncate">{market.question}</p>
                                    <p className="text-xs text-zinc-500">{market.maxBetPerPerson} ETH on {side.toUpperCase()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    )
}
